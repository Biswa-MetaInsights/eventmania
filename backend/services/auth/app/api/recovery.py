"""One-use account recovery and verification tokens; secrets never returned by API."""
import hashlib
import os
import secrets
import smtplib
import ssl
from datetime import datetime, timedelta
from email.message import EmailMessage
from uuid import UUID, uuid4
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy import Column, String, DateTime, Text, func
from sqlalchemy.types import Uuid
from sqlalchemy.orm import Session
from app.db.session import Base, get_db, SessionLocal
from app.models.user_credentials import UserCredentials
from app.services.auth_service import AuthService
from backend.shared.security import identity, internal

router = APIRouter(prefix='/auth', tags=['Account security'])

class AccountToken(Base):
    __tablename__ = 'account_tokens'
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(Uuid(as_uuid=True), index=True, nullable=False)
    purpose = Column(String(30), nullable=False)
    digest = Column(String(64), unique=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class AccountMail(Base):
    __tablename__ = 'account_mail_outbox'
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    recipient = Column(String(255), nullable=False)
    subject = Column(String(200), nullable=False)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    sent_at = Column(DateTime, nullable=True)
    state = Column(String(20), default='pending', nullable=False)


from backend.shared.mail import ready as mail_ready, send
from threading import Lock
_mail_lock = Lock()


def send_pending():
    if not mail_ready() or not _mail_lock.acquire(blocking=False): return
    try:
        with SessionLocal() as db:
            rows = db.query(AccountMail).filter(AccountMail.sent_at.is_(None), AccountMail.state == 'pending').order_by(AccountMail.created_at).limit(20).all()
            for row in rows:
                if row.created_at < datetime.utcnow()-timedelta(minutes=30):
                    row.state, row.body = 'expired', 'Expired account message; token removed.'
                    db.commit()
                    continue
                try:
                    send(row.recipient,row.subject,row.body)
                    row.sent_at, row.state, row.body = datetime.utcnow(), 'sent', 'Delivered account message; token removed.'
                    db.commit()
                except (OSError, smtplib.SMTPException, KeyError, ValueError): db.rollback()
    finally: _mail_lock.release()


@router.get('/capabilities')
def capabilities():
    return {'email_recovery': mail_ready(), 'email_verification': mail_ready(),
            'google': False, 'facebook': False}


@router.get('/internal/identity/{user_id}', dependencies=[Depends(internal)])
def internal_identity(user_id: UUID, db: Session = Depends(get_db)):
    user = db.get(UserCredentials, user_id)
    if not user: raise HTTPException(404, 'User not found')
    return {'email': user.email, 'verified': user.is_verified}


class EmailInput(BaseModel):
    email: EmailStr

class TokenInput(BaseModel):
    token: str = Field(min_length=32, max_length=200)

class ResetInput(TokenInput):
    password: str = Field(min_length=10, max_length=72)
    @field_validator('password')
    @classmethod
    def password_bytes(cls, value):
        if len(value.encode('utf-8')) > 72: raise ValueError('Password is too long')
        return value


def create_token(db, user, purpose):
    recent = db.query(AccountToken).filter(AccountToken.user_id == user.id, AccountToken.purpose == purpose,
                                         AccountToken.created_at >= datetime.utcnow()-timedelta(minutes=30)).count()
    if recent >= 3: return
    token = secrets.token_urlsafe(32)
    row = AccountToken(user_id=user.id, purpose=purpose, digest=hashlib.sha256(token.encode()).hexdigest(),
                       expires_at=datetime.utcnow()+timedelta(minutes=30))
    db.add(row)
    route = 'reset-password' if purpose == 'reset' else 'verify-email'
    link = os.environ['APP_PUBLIC_URL'].rstrip('/') + '/' + route + '#token=' + token
    db.add(AccountMail(recipient=user.email, subject='NewFind: ' + ('reset your password' if purpose == 'reset' else 'verify your email'),
                       body=f'Open this link within 30 minutes:\n{link}\n\nIf you did not request this, you can ignore this message.'))
    db.commit()


@router.post('/forgot-password', status_code=202)
def forgot(data: EmailInput, tasks: BackgroundTasks, db: Session = Depends(get_db)):
    if not mail_ready(): raise HTTPException(503, 'Email recovery is not configured yet')
    user = db.query(UserCredentials).filter(func.lower(UserCredentials.email) == data.email.lower()).first()
    if user and user.is_active: create_token(db, user, 'reset')
    tasks.add_task(send_pending)
    return {'message': 'If an eligible account exists, a recovery email will arrive shortly.'}


@router.post('/request-verification', status_code=202)
def request_verification(tasks: BackgroundTasks, claims=Depends(identity), db: Session = Depends(get_db)):
    if not mail_ready(): raise HTTPException(503, 'Email verification is not configured yet')
    user = db.get(UserCredentials, UUID(claims['sub']))
    if user and not user.is_verified: create_token(db, user, 'verify')
    tasks.add_task(send_pending)
    return {'message': 'Verification email requested'}


def consume(db, token, purpose):
    row = db.query(AccountToken).filter(AccountToken.digest == hashlib.sha256(token.encode()).hexdigest(),
                                        AccountToken.purpose == purpose).with_for_update().first()
    if not row or row.used_at or row.expires_at <= datetime.utcnow():
        raise HTTPException(400, 'This link has expired or has already been used')
    user = db.get(UserCredentials, row.user_id)
    if not user or not user.is_active: raise HTTPException(400, 'This link is no longer valid')
    row.used_at = datetime.utcnow()
    return user


@router.post('/reset-password')
def reset(data: ResetInput, db: Session = Depends(get_db)):
    user = consume(db, data.token, 'reset')
    user.hashed_password = AuthService.get_password_hash(data.password)
    user.token_version += 1
    db.query(AccountToken).filter(AccountToken.user_id == user.id, AccountToken.purpose == 'reset', AccountToken.used_at.is_(None)).update({'used_at': datetime.utcnow()})
    db.commit()
    return {'message': 'Password updated. Please sign in again.'}


@router.post('/verify-email')
def verify(data: TokenInput, db: Session = Depends(get_db)):
    user = consume(db, data.token, 'verify')
    user.is_verified = True
    db.commit()
    return {'message': 'Email verified'}
