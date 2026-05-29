from sqlalchemy.types import Uuid
from sqlalchemy import Column, String, Boolean, DateTime, Enum
import uuid
import datetime
from app.db.session import Base
import enum

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    ORGANIZER = "organizer"
    USER = "user"

class UserCredentials(Base):
    __tablename__ = "users_credentials"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(512), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.USER)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    def __repr__(self):
        return f"<UserCredentials(email='{self.email}', role='{self.role}')>"


