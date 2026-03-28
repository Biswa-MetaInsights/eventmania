from sqlalchemy import Column, String, Text, DateTime, UUID, JSON, DECIMAL, Enum, Integer
import uuid
import datetime
import enum
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class EventStatus(str, enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    CANCELLED = "cancelled"
    COMPLETED = "completed"

class Event(Base):
    __tablename__ = "events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organizer_id = Column(UUID(as_uuid=True), index=True, nullable=False)
    title = Column(String(300), nullable=False)
    slug = Column(String(350), unique=True, index=True)
    description = Column(Text, nullable=True)
    category = Column(String(100), index=True)
    
    # Store dynamic location data (address, coordinates, etc.)
    location = Column(JSON, default={}) 
    
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    
    capacity = Column(Integer, default=0)
    tickets_sold = Column(Integer, default=0)
    price = Column(DECIMAL(12, 2), default=0.00)
    
    status = Column(Enum(EventStatus), default=EventStatus.DRAFT)
    
    # Agent-related metadata
    content_generated = Column(JSON, default={}) # AI generated title/desc results
    moderation_score = Column(DECIMAL(4, 2), default=0.00)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    def __repr__(self):
        return f"<Event(title='{self.title}', status='{self.status}')>"
