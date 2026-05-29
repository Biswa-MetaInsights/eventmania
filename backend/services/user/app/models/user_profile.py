from sqlalchemy.types import Uuid
from sqlalchemy import Column, String, Text, DateTime, JSON, ARRAY
import uuid
import datetime
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class UserProfile(Base):
    __tablename__ = "profiles"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name = Column(String(200), nullable=False)
    bio = Column(Text, nullable=True)
    avatar_url = Column(String(512), nullable=True)
    interests = Column(JSON, default=[]) # e.g. ["tech", "ai"]
    settings = Column(JSON, default={}) # e.g. {"notifications": True}
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    def __repr__(self):
        return f"<UserProfile(full_name='{self.full_name}')>"


