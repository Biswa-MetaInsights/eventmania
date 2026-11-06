"""Social auth security/integration with real JWT signatures and isolated SQLite.

Provider HTTP responses and the internal profile service are controlled fakes.
No live accounts, provider credentials, mail or production databases are used.
"""
from datetime import datetime, timedelta
import importlib
import time
from pathlib import Path
from types import SimpleNamespace
from urllib.parse import parse_qs, urlsplit

from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import FastAPI
from fastapi.testclient import TestClient
import httpx
import jwt
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

ROOT = Path(__file__).resolve().parents[2]
ORIGIN = 'https://newfind.example'


@pytest.fixture
def social(monkeypatch, tmp_path):
    monkeypatch.syspath_prepend(str(ROOT / 'backend/services/auth'))
    monkeypatch.syspath_prepend(str(ROOT))
    for key, value in {'DATABASE_URL': 'sqlite:///' + str(tmp_path / 'unused.db'), 'JWT_SECRET': 'isolated-oauth-test-signing-key-at-least-32-bytes',
                       'KAFKA_ENABLED': 'false', 'APP_PUBLIC_URL': ORIGIN, 'GOOGLE_CLIENT_ID': 'qa-google-client',
                       'GOOGLE_CLIENT_SECRET': 'qa-provider-secret', 'FACEBOOK_APP_ID': 'qa-facebook-client',
                       'FACEBOOK_APP_SECRET': 'qa-facebook-secret', 'FACEBOOK_GRAPH_VERSION': 'v25.0',
                       'USER_SERVICE_URL': 'https://private-profile.example', 'INTERNAL_API_KEY': 'qa-internal-key'}.items():
        monkeypatch.setenv(key, value)
    oauth = importlib.import_module('app.api.oauth')
    recovery = importlib.import_module('app.api.recovery')
    engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
    oauth.Base.metadata.create_all(engine)
    sessions = sessionmaker(bind=engine)
    db = sessions()
    app = FastAPI()
    app.include_router(oauth.router)
    app.include_router(recovery.router)
    def get_db():
        yield db
    app.dependency_overrides[oauth.get_db] = get_db
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    key_source = SimpleNamespace(get_signing_key_from_jwt=lambda _: SimpleNamespace(key=private_key.public_key()))
    monkeypatch.setattr(oauth, 'google_keys', lambda: key_source)
    ctx = SimpleNamespace(oauth=oauth, db=db, profiles=[], claims={}, nonce='', key=private_key, key_source=key_source,
                          email='social-qa@example.org', subject='google-subject-1', facebook_email='facebook-qa@example.org', fail_profile=False, fail_provider=False)
    original_client = httpx.Client
    def provider(request):
        if ctx.fail_provider:
            return httpx.Response(503, json={'error': 'unavailable'})
        if request.url.host == 'oauth2.googleapis.com':
            data = parse_qs(request.content.decode())
            assert data['client_id'] == ['qa-google-client']
            assert data['client_secret'] == ['qa-provider-secret']
            assert data['redirect_uri'] == [ORIGIN + '/auth/google/callback']
            assert len(data['code_verifier'][0]) >= 43
            assert not request.url.query  # Provider secrets are sent in the POST body.
            now = int(time.time())
            claims = {'iss': 'https://accounts.google.com', 'aud': 'qa-google-client', 'sub': ctx.subject,
                      'nonce': ctx.nonce, 'exp': now + 300, 'iat': now, 'email': ctx.email,
                      'email_verified': True, 'name': 'Social QA', **ctx.claims}
            return httpx.Response(200, json={'id_token': jwt.encode(claims, ctx.key, algorithm='RS256')})
        if request.url.path.endswith('/oauth/access_token'):
            assert not request.url.query
            return httpx.Response(200, json={'access_token': 'qa-facebook-access-token'})
        if request.url.path.endswith('/me'):
            assert request.headers['authorization'] == 'Bearer qa-facebook-access-token'
            return httpx.Response(200, json={'id': 'facebook-subject-1', 'name': 'Facebook QA', 'email': ctx.facebook_email})
        raise AssertionError('Unexpected external request')
    monkeypatch.setattr(oauth.httpx, 'Client', lambda **kwargs: original_client(transport=httpx.MockTransport(provider), **kwargs))
    def profile(url, *, json, headers, timeout):
        assert url == 'https://private-profile.example/users/internal/profile'
        assert headers == {'X-Internal-Key': 'qa-internal-key'}
        ctx.profiles.append(json)
        return httpx.Response(503 if ctx.fail_profile else 201, json={}, request=httpx.Request('POST', url))
    monkeypatch.setattr(oauth.httpx, 'post', profile)
    with TestClient(app, base_url=ORIGIN, headers={'Origin': ORIGIN}) as client:
        ctx.client = client
        yield ctx
    db.close()
    engine.dispose()


def begin(ctx, provider='google', intent='signin', headers=None):
    response = ctx.client.post(f'/auth/oauth/{provider}/start', json={'intent': intent}, headers=headers)
    assert response.status_code == 200, response.text
    params = parse_qs(urlsplit(response.json()['authorization_url']).query)
    if provider == 'google':
        ctx.nonce = params['nonce'][0]
        assert params['code_challenge_method'] == ['S256']
        assert set(params['scope'][0].split()) == {'openid', 'email', 'profile'}
    return params['state'][0], response


def complete(ctx, state, provider='google', **kwargs):
    return ctx.client.post(f'/auth/oauth/{provider}/complete', json={'state': state, 'code': 'provider-code', **kwargs.pop('data', {})}, **kwargs)


def existing(ctx, email='social-qa@example.org'):
    user = ctx.oauth.UserCredentials(email=email, hashed_password=ctx.oauth.AuthService.get_password_hash('isolated-test-password'), role=ctx.oauth.UserRole.USER)
    ctx.db.add(user)
    ctx.db.commit()
    ctx.db.refresh(user)
    token = ctx.oauth.AuthService.create_access_token({'sub': str(user.id), 'ver': user.token_version})
    return user, {'Authorization': 'Bearer ' + token}


def test_google_creates_persistent_verified_user_and_reuses_identity(social):
    ctx = social
    state, start = begin(ctx)
    cookie = start.headers['set-cookie']
    assert '__Host-newfind-oauth-google=' in cookie
    assert 'HttpOnly' in cookie and 'Secure' in cookie and 'SameSite=lax' in cookie and 'Domain=' not in cookie
    assert 'qa-provider-secret' not in start.text and 'verifier' not in start.text
    response = complete(ctx, state)
    assert response.status_code == 200, response.text
    tokens = response.json()
    assert response.headers['cache-control'] == 'no-store'
    assert tokens['linked'] is False and tokens['email'] == ctx.email
    claims = ctx.oauth.AuthService.decode_token(tokens['access_token'])
    assert claims['role'] == 'user' and claims['token_type'] == 'access'
    user = ctx.db.query(ctx.oauth.UserCredentials).one()
    assert user.is_verified and str(user.id) == claims['sub']
    assert ctx.profiles == [{'user_id': str(user.id), 'full_name': 'Social QA'}]
    assert ctx.db.query(ctx.oauth.SocialIdentity).one().subject == ctx.subject
    assert ctx.db.query(ctx.oauth.OAuthAttempt).count() == 0
    ctx.db.expire_all()
    state, _ = begin(ctx)
    assert complete(ctx, state).status_code == 200
    assert len(ctx.profiles) == 1 and ctx.db.query(ctx.oauth.UserCredentials).count() == 1


@pytest.mark.parametrize('claims', [
    {'aud': 'another-client'}, {'iss': 'https://attacker.example'}, {'exp': 1}, {'iat': 4102444800},
    {'nonce': 'wrong-nonce'}, {'email_verified': False}, {'email_verified': 'true'},
    {'azp': 'another-client'}, {'aud': ['qa-google-client', 'other']}, {'sub': ''},
])
def test_google_rejects_invalid_verified_identity(social, claims):
    social.claims = claims
    state, _ = begin(social)
    response = complete(social, state)
    assert response.status_code == 401, response.text
    assert social.db.query(social.oauth.UserCredentials).count() == 0
    assert social.profiles == []


def test_google_rejects_wrong_signature(social):
    social.key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    state, _ = begin(social)
    assert complete(social, state).status_code == 401


def test_browser_binding_expiry_cancellation_and_replay(social):
    ctx = social
    state, _ = begin(ctx)
    saved = ctx.client.cookies.get('__Host-newfind-oauth-google')
    ctx.client.cookies.clear()
    assert complete(ctx, state).status_code == 400
    ctx.client.cookies.set('__Host-newfind-oauth-google', saved, domain='newfind.example', path='/')
    attempt = ctx.db.get(ctx.oauth.OAuthAttempt, ctx.oauth.digest(state))
    attempt.expires_at = datetime.utcnow() - timedelta(seconds=1)
    ctx.db.commit()
    assert complete(ctx, state).status_code == 400
    state, _ = begin(ctx)
    assert complete(ctx, state, data={'error': 'access_denied', 'code': ''}).status_code == 400
    assert complete(ctx, state).status_code == 400
    state, _ = begin(ctx)
    assert complete(ctx, state).status_code == 200
    assert complete(ctx, state).status_code == 400


def test_unknown_provider_bad_origin_and_cross_provider_state(social):
    ctx = social
    assert ctx.client.post('/auth/oauth/evil/start', json={}).status_code == 422
    assert ctx.client.post('/auth/oauth/google/start', json={}, headers={'Origin': 'https://attacker.example'}).status_code == 403
    state, _ = begin(ctx)
    ctx.client.cookies.set('__Host-newfind-oauth-facebook', ctx.client.cookies.get('__Host-newfind-oauth-google'), domain='newfind.example', path='/')
    assert complete(ctx, state, 'facebook').status_code == 400
    assert complete(ctx, state).status_code == 200


def test_existing_email_requires_authenticated_explicit_link(social):
    ctx = social
    user, headers = existing(ctx)
    original_id = user.id
    state, _ = begin(ctx)
    assert complete(ctx, state).status_code == 409
    assert ctx.db.query(ctx.oauth.SocialIdentity).count() == 0
    state, _ = begin(ctx, intent='link', headers=headers)
    response = complete(ctx, state, headers=headers)
    assert response.status_code == 200 and response.json()['linked'] is True
    assert ctx.db.query(ctx.oauth.SocialIdentity).one().user_id == original_id
    assert ctx.profiles == []
    assert ctx.client.get('/auth/oauth/accounts', headers=headers).json() == {'providers': ['google']}
    state, _ = begin(ctx)
    assert ctx.oauth.AuthService.decode_token(complete(ctx, state).json()['access_token'])['sub'] == str(original_id)


def test_link_requires_same_active_session_and_cannot_steal_identity(social):
    ctx = social
    first, first_headers = existing(ctx)
    second, second_headers = existing(ctx, 'other-qa@example.org')
    state, _ = begin(ctx, intent='link', headers=first_headers)
    assert complete(ctx, state).status_code == 401
    state, _ = begin(ctx, intent='link', headers=first_headers)
    assert complete(ctx, state, headers=second_headers).status_code == 401
    state, _ = begin(ctx, intent='link', headers=first_headers)
    first.token_version += 1
    ctx.db.commit()
    assert complete(ctx, state, headers=first_headers).status_code == 401
    state, _ = begin(ctx, intent='link', headers=second_headers)
    assert complete(ctx, state, headers=second_headers).status_code == 200
    fresh = {'Authorization': 'Bearer ' + ctx.oauth.AuthService.create_access_token({'sub': str(first.id), 'ver': first.token_version})}
    state, _ = begin(ctx, intent='link', headers=fresh)
    assert complete(ctx, state, headers=fresh).status_code == 409
    assert ctx.client.post('/auth/oauth/google/start', json={'intent': 'link'}).status_code == 401
    assert ctx.client.get('/auth/oauth/accounts').status_code == 401


def test_disabled_account_profile_failure_and_provider_outage_fail_closed(social):
    ctx = social
    ctx.fail_provider = True
    state, _ = begin(ctx)
    assert complete(ctx, state).status_code == 401
    ctx.fail_provider = False
    ctx.fail_profile = True
    state, _ = begin(ctx)
    assert complete(ctx, state).status_code == 503
    assert ctx.db.query(ctx.oauth.UserCredentials).count() == 0
    assert ctx.db.query(ctx.oauth.SocialIdentity).count() == 0
    ctx.fail_profile = False
    state, _ = begin(ctx)
    assert complete(ctx, state).status_code == 200
    user = ctx.db.query(ctx.oauth.UserCredentials).one()
    user.is_active = False
    ctx.db.commit()
    state, _ = begin(ctx)
    assert complete(ctx, state).status_code == 401


def test_capabilities_missing_secrets_invalid_origin_and_no_credentials_in_output(social, monkeypatch):
    ctx = social
    assert ctx.client.get('/auth/capabilities').json()['google'] is True
    monkeypatch.delenv('GOOGLE_CLIENT_SECRET')
    assert ctx.client.get('/auth/capabilities').json()['google'] is False
    response = ctx.client.post('/auth/oauth/google/start', json={})
    assert response.status_code == 503 and 'qa-provider-secret' not in response.text
    monkeypatch.setenv('APP_PUBLIC_URL', 'http://public.example')
    assert ctx.client.get('/auth/capabilities').json()['facebook'] is False
    assert complete(ctx, 'x' * 43).status_code == 503


def test_facebook_email_is_not_silently_verified_and_missing_email_is_actionable(social):
    ctx = social
    ctx.facebook_email = None
    state, _ = begin(ctx, 'facebook')
    assert complete(ctx, state, 'facebook').status_code == 422
    ctx.facebook_email = 'facebook-qa@example.org'
    state, _ = begin(ctx, 'facebook')
    assert complete(ctx, state, 'facebook').status_code == 200
    assert ctx.db.query(ctx.oauth.UserCredentials).one().is_verified is False


def test_gateway_only_opens_exact_oauth_entrypoints():
    import asyncio
    import importlib.util
    from starlette.requests import Request
    path = ROOT / 'backend/gateway/access.py'
    spec = importlib.util.spec_from_file_location('oauth_gateway_access', path)
    access = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(access)
    request = Request({'type': 'http', 'method': 'POST', 'headers': []})
    for provider in ('google', 'facebook'):
        for action in ('start', 'complete'):
            asyncio.run(access.authorize(request, 'auth', f'oauth/{provider}/{action}', None))
    for path in ('oauth/accounts', 'oauth/google/internal', 'oauth/evil/start'):
        with pytest.raises(Exception) as error:
            asyncio.run(access.authorize(request, 'auth', path, None))
        assert error.value.status_code == 401
