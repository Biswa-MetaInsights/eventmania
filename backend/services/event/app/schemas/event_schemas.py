from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from app.models.event import EventStatus

class EventCreate(BaseModel):
    organizer_id: UUID
    title: str = Field(..., min_length=5, max_length=200)
    description: Optional[str] = None
    category: Optional[str] = "General"
    location: Dict[str, Any] = {}
    start_date: datetime
    end_date: datetime
    capacity: int = 0
    price: float = 0.0

class EventOut(BaseModel):
    id: UUID
    organizer_id: UUID
    title: str
    slug: str
    description: Optional[str] = None
    category: str
    location: Dict[str, Any]
    start_date: datetime
    end_date: datetime
    capacity: int
    tickets_sold: int
    price: float
    status: EventStatus
    content_generated: Dict[str, Any]
    moderation_score: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    location: Optional[Dict[str, Any]] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    capacity: Optional[int] = None
    price: Optional[float] = None
    status: Optional[EventStatus] = None

class EventSearch(BaseModel):
    q: Optional[str] = None
    category: Optional[str] = None
    date_from: Optional[datetime] = None
