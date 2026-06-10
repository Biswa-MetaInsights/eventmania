from sqlalchemy.types import Uuid
from sqlalchemy import Column, String, Text, DateTime, JSON, DECIMAL, Enum, Integer
import uuid
import datetime
import enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Boolean

Base = declarative_base()

class EventStatus(str, enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    CANCELLED = "cancelled"
    COMPLETED = "completed"

class Event(Base):
    __tablename__ = "events"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organizer_id = Column(Uuid(as_uuid=True), index=True, nullable=False)
    title = Column(String(300), nullable=False)
    slug = Column(String(350), unique=True, index=True)
    description = Column(Text, nullable=True)
    category = Column(String(100), index=True)
    
    event_type = Column(String(20), default="In-Person")  # In-Person | Online | Hybrid
    location = Column(JSON, default={})
    target_audience = Column(Text, nullable=True)
    tags = Column(JSON, default=[])
    language = Column(String(50), default="English")
    event_website = Column(String(500), nullable=True)
    community_id = Column(Uuid(as_uuid=True), nullable=True, index=True)

    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)

    capacity = Column(Integer, default=0)
    tickets_sold = Column(Integer, default=0)
    price = Column(DECIMAL(12, 2), default=0.00)

    status = Column(Enum(EventStatus), default=EventStatus.DRAFT)

    content_generated = Column(JSON, default={})
    moderation_score = Column(DECIMAL(4, 2), default=0.00)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    def __repr__(self):
        return f"<Event(title='{self.title}', status='{self.status}')>"


