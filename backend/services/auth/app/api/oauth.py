"""Browser-bound, single-use social authorization; provider secrets stay on the server."""
import base64
import hashlib
import hmac
import os
import re
import secrets
from datetime import datetime, timedelta
from functools import lru_cache
from typing import Literal
from urllib.parse import urlencode, urlsplit
from uuid import UUID, uuid4

import httpx
import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, Field, TypeAdapter, ValidationError
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy.types import Uuid

from app.db.session import Base, get_db
from app.models.user_credentials import UserCredentials, UserRole
from app.services.auth_service import AuthService

router = APIRouter(prefix='/auth/oauth', tags=['Social sign-in'])
Provider = Literal['google', 'facebook']
NO_STORE = {'Cache-Control': 'no-store', 'Pragma': 'no-cache'}
TTL = 600


class SocialIdentity(Base):
    __tablename__ = 'social_identities'
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    provider = Column(String(20), nullable=False)
    subject = Column(String(255), nullable=False)
    user_id = Column(Uuid(as_uuid=True), ForeignKey('users_credentials.id'), nullable=False, index=True)
    __table_args__ = (UniqueConstraint('provider', 'subject'), UniqueConstraint('provider', 'user_id'))


class OAuthAttempt(Base):
    __tablename__ = 'oauth_attempts'
    digest = Column(String(64), primary_key=True)
    provider = Column(String(20), nullable=False)
    browser_digest = Column(String(64), nullable=False)
    verifier = Column(String(128), nullable=False)
    nonce = Column(String(128), nullable=False)
    expires_at = Column(DateTime, nullable=False, index=True)
    link_user_id = Column(Uuid(as_uuid=True), nullable=True)
    link_version = Column(Integer, nullable=True)


def public_origin():
    value = os.getenv('APP_PUBLIC_URL', '').rstrip('/')
    parsed = urlsplit(value)
    local = parsed.scheme == 'http' and parsed.hostname in {'localhost', '127.0.0.1'}
    if (parsed.scheme != 'https' and not local) or not parsed.netloc or parsed.username or parsed.password or parsed.path or parsed.query or parsed.fragment:
        raise HTTPException(503, 'Social sign-in requires a configured application origin')
    return value


def configuration(provider):
    try:
        origin = public_origin()
    except HTTPException:
        return None
    prefix = 'GOOGLE' if provider == 'google' else 'FACEBOOK'
    client_id = os.getenv(prefix + ('_CLIENT_ID' if provider == 'google' else '_APP_ID'), '').strip()
    secret = os.getenv(prefix + ('_CLIENT_SECRET' if provider == 'google' else '_APP_SECRET'), '').strip()
    version = os.getenv('FACEBOOK_GRAPH_VERSION', '')
    if not client_id or not secret or (provider == 'facebook' and not re.fullmatch(r'v[1-9][0-9]?\.[0-9]+', version)):
        return None
    return {'client_id': client_id, 'secret': secret, 'version': version,
            'redirect_uri': origin + '/auth/' + provider + '/callback'}


def enabled(provider):
    return configuration(provider) is not None


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def cookie_name(provider):
    return ('__Host-' if public_origin().startswith('https:') else '') + 'newfind-oauth-' + provider


def require_origin(request):
    if request.headers.get('origin') != public_origin():
        raise HTTPException(403, 'Start social sign-in from NewFind')


def signed_in_user(request, db):
    scheme, _, token = request.headers.get('authorization', '').partition(' ')
    claims = AuthService.decode_token(token) if scheme.lower() == 'bearer' else None
    try:
        user = db.get(UserCredentials, UUID(claims['sub'])) if claims and claims.get('token_type') == 'access' else None
    except (KeyError, ValueError, TypeError):
        user = None
    if not user or not user.is_active or claims.get('ver', 0) != user.token_version:
        raise HTTPException(401, 'Sign in again before connecting an account')
    return user


class StartInput(BaseModel):
    intent: Literal['signin', 'link'] = 'signin'


@router.post('/{provider}/start')
def start(provider: Provider, data: StartInput, request: Request, response: Response, db: Session = Depends(get_db)):
    require_origin(request)
    config = configuration(provider)
    if not config:
        raise HTTPException(503, 'This sign-in provider is not configured yet')
    user = signed_in_user(request, db) if data.intent == 'link' else None
    state, browser, verifier, nonce = (secrets.token_urlsafe(32) for _ in range(4))
    db.query(OAuthAttempt).filter(OAuthAttempt.expires_at < datetime.utcnow()).delete()
    db.add(OAuthAttempt(digest=digest(state), provider=provider, browser_digest=digest(browser),
                        verifier=verifier, nonce=nonce, expires_at=datetime.utcnow() + timedelta(seconds=TTL),
                        link_user_id=user.id if user else None, link_version=user.token_version if user else None))
    db.commit()
    response.headers.update(NO_STORE)
    response.set_cookie(cookie_name(provider), browser, max_age=TTL, httponly=True,
                        secure=public_origin().startswith('https:'), samesite='lax', path='/')
    params = {'client_id': config['client_id'], 'redirect_uri': config['redirect_uri'], 'response_type': 'code', 'state': state}
    if provider == 'google':
        params.update(scope='openid email profile', nonce=nonce, prompt='select_account',
                      code_challenge=base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b'=').decode(),
                      code_challenge_method='S256')
        endpoint = 'https://accounts.google.com/o/oauth2/v2/auth'
    else:
        params.update(scope='email,public_profile')
        endpoint = 'https://www.facebook.com/' + config['version'] + '/dialog/oauth'
    return {'authorization_url': endpoint + '?' + urlencode(params)}


@lru_cache(maxsize=1)
def google_keys():
    # Fixed trusted endpoint: never use a token-provided key URL.
    return jwt.PyJWKClient('https://www.googleapis.com/oauth2/v3/certs', timeout=10)


def provider_identity(provider, code, attempt, config):
    data = {'client_id': config['client_id'], 'client_secret': config['secret'],
            'code': code, 'redirect_uri': config['redirect_uri']}
    with httpx.Client(timeout=10, follow_redirects=False) as client:
        if provider == 'google':
            response = client.post('https://oauth2.googleapis.com/token', data={**data, 'grant_type': 'authorization_code', 'code_verifier': attempt.verifier})
            response.raise_for_status()
            token = response.json().get('id_token', '')
            if not isinstance(token, str) or len(token) > 16384:
                raise ValueError('Invalid provider response')
            key = google_keys().get_signing_key_from_jwt(token).key
            claims = jwt.decode(token, key, algorithms=['RS256'], audience=config['client_id'],
                                issuer=['https://accounts.google.com', 'accounts.google.com'], leeway=30,
                                options={'require': ['exp', 'iat', 'iss', 'aud', 'sub', 'nonce']})
            if not hmac.compare_digest(str(claims['nonce']), attempt.nonce) or claims.get('email_verified') is not True:
                raise ValueError('Invalid Google identity')
            if ('azp' in claims and claims['azp'] != config['client_id']) or (isinstance(claims['aud'], list) and len(claims['aud']) > 1 and not claims.get('azp')):
                raise ValueError('Invalid Google presenter')
            return claims['sub'], claims.get('email'), claims.get('name'), True
        endpoint = 'https://graph.facebook.com/' + config['version']
        response = client.post(endpoint + '/oauth/access_token', data=data)
        response.raise_for_status()
        token = response.json()['access_token']
        if not isinstance(token, str) or not token:
            raise ValueError('Invalid provider response')
        proof = hmac.new(config['secret'].encode(), token.encode(), hashlib.sha256).hexdigest()
        response = client.get(endpoint + '/me', headers={'Authorization': 'Bearer ' + token},
                              params={'fields': 'id,name,email', 'appsecret_proof': proof})
        response.raise_for_status()
        person = response.json()
        # Facebook account verification is not proof of mailbox ownership.
        return person['id'], person.get('email'), person.get('name'), False


class CompleteInput(BaseModel):
    state: str = Field(min_length=32, max_length=128)
    code: str = Field(default='', max_length=4096)
    error: str = Field(default='', max_length=200)


def finish(provider, data, request, db):
    require_origin(request)
    config = configuration(provider)
    if not config:
        raise HTTPException(503, 'This sign-in provider is not configured yet')
    browser = request.cookies.get(cookie_name(provider), '')
    attempt = db.get(OAuthAttempt, digest(data.state))
    if (not browser or not attempt or attempt.provider != provider or attempt.expires_at <= datetime.utcnow()
            or not hmac.compare_digest(attempt.browser_digest, digest(browser))):
        raise HTTPException(400, 'Sign-in expired or belongs to another browser. Please start again.')
    # Delete with a checked row count before external I/O: simultaneous completions cannot replay it.
    if db.query(OAuthAttempt).filter_by(digest=attempt.digest).delete(synchronize_session=False) != 1:
        db.rollback()
        raise HTTPException(400, 'This sign-in has already been used. Please start again.')
    db.expunge(attempt)
    db.commit()
    if data.error or not data.code:
        raise HTTPException(400, 'Social sign-in was cancelled. You can try again.')
    if attempt.link_user_id:
        current = signed_in_user(request, db)
        if current.id != attempt.link_user_id or current.token_version != attempt.link_version:
            raise HTTPException(401, 'Your session changed. Sign in again before connecting an account.')
    try:
        subject, email, name, verified = provider_identity(provider, data.code, attempt, config)
        if not isinstance(subject, str) or not subject or len(subject) > 255:
            raise ValueError('Invalid subject')
    except (httpx.HTTPError, jwt.PyJWTError, ValueError, KeyError, TypeError):
        raise HTTPException(401, 'The provider could not verify this sign-in. Please try again.')
    identity = db.query(SocialIdentity).filter_by(provider=provider, subject=subject).first()
    linked = attempt.link_user_id is not None
    if linked:
        user = db.get(UserCredentials, attempt.link_user_id)
        if not user or not user.is_active or user.token_version != attempt.link_version:
            raise HTTPException(401, 'Your session changed. Sign in again before connecting an account.')
        if identity and identity.user_id != user.id:
            raise HTTPException(409, 'This provider account is already connected to another NewFind account.')
        other = db.query(SocialIdentity).filter_by(provider=provider, user_id=user.id).first()
        if other and other.subject != subject:
            raise HTTPException(409, 'A different account from this provider is already connected.')
    elif identity:
        user = db.get(UserCredentials, identity.user_id)
        if not user or not user.is_active:
            raise HTTPException(401, 'This NewFind account is unavailable. Contact support.')
    else:
        try:
            email = str(TypeAdapter(EmailStr).validate_python(email)).lower()
        except ValidationError:
            raise HTTPException(422, 'Your provider did not share an email address. Allow email access or use email sign-up.')
        if db.query(UserCredentials).filter(func.lower(UserCredentials.email) == email).first():
            raise HTTPException(409, 'An account already uses this email. Sign in with your password, then connect this provider in Dashboard → Profile.')
        user = UserCredentials(email=email, hashed_password=AuthService.get_password_hash(secrets.token_urlsafe(32)),
                               role=UserRole.USER, is_verified=verified)
        db.add(user)
    try:
        db.flush()
        if not identity:
            db.add(SocialIdentity(provider=provider, subject=subject, user_id=user.id))
            db.flush()
        if not linked and not identity:
            # The profile endpoint is internal and idempotent; no public identity fields are trusted.
            response = httpx.post(os.environ['USER_SERVICE_URL'] + '/users/internal/profile',
                                  headers={'X-Internal-Key': os.environ['INTERNAL_API_KEY']},
                                  json={'user_id': str(user.id), 'full_name': (str(name or '').strip() or 'NewFind member')[:200]}, timeout=5)
            response.raise_for_status()
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, 'An account was connected concurrently. Please sign in again.')
    except (httpx.HTTPError, KeyError):
        db.rollback()
        raise HTTPException(503, 'Profile service is temporarily unavailable. Please try again.')
    return {'email': user.email, 'linked': linked, 'token_type': 'bearer',
            'access_token': AuthService.create_access_token({'sub': str(user.id), 'email': user.email, 'role': user.role.value, 'ver': user.token_version}),
            'refresh_token': AuthService.create_refresh_token({'sub': str(user.id), 'ver': user.token_version})}


@router.post('/{provider}/complete')
def complete(provider: Provider, data: CompleteInput, request: Request, db: Session = Depends(get_db)):
    try:
        result = JSONResponse(finish(provider, data, request, db), headers=NO_STORE)
    except HTTPException as error:
        result = JSONResponse({'detail': error.detail}, status_code=error.status_code, headers=NO_STORE)
    try:
        result.delete_cookie(cookie_name(provider), path='/', secure=public_origin().startswith('https:'), httponly=True, samesite='lax')
    except HTTPException:
        pass  # A missing origin cannot have created a legitimate browser cookie.
    return result


@router.get('/accounts')
def accounts(request: Request, response: Response, db: Session = Depends(get_db)):
    user = signed_in_user(request, db)
    response.headers.update(NO_STORE)
    return {'providers': [row.provider for row in db.query(SocialIdentity).filter_by(user_id=user.id)]}
