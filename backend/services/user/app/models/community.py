from sqlalchemy.types import Uuid
from sqlalchemy import Column, String, Text, DateTime
import uuid
import datetime
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class Community(Base):
    __tablename__ = "communities"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organizer_id = Column(Uuid(as_uuid=True), unique=True, index=True, nullable=False)
    name = Column(String(300), nullable=False)
    slug = Column(String(350), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)
    website = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    def __repr__(self):
        return f"<Community(name='{self.name}', slug='{self.slug}')>"
