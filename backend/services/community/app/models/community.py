from sqlalchemy import Column, String, Text, DateTime, JSON, Integer, DECIMAL
from sqlalchemy.types import Uuid
from sqlalchemy.ext.declarative import declarative_base
import uuid
import datetime

Base = declarative_base()

class Community(Base):
    __tablename__ = "communities"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organizer_id = Column(Uuid(as_uuid=True), index=True, nullable=False)
    name = Column(String(300), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), index=True)
    location = Column(JSON, default={})
    next_event_date = Column(DateTime, nullable=True)
    member_count = Column(Integer, default=0)
    price = Column(DECIMAL(12, 2), default=0.00)
    status = Column(String(20), default="active", index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
