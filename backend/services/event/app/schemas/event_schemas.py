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
    event_type: Optional[str] = "In-Person"
    location: Dict[str, Any] = {}
    target_audience: Optional[str] = None
    tags: Optional[List[str]] = []
    language: Optional[str] = "English"
    event_website: Optional[str] = None
    community_id: Optional[UUID] = None
    start_date: datetime
    end_date: datetime
    capacity: int = 0
    price: float = 0.0
    status: Optional[EventStatus] = EventStatus.DRAFT


class EventIngest(EventCreate):
    """Payload for aggregated (externally-sourced) events.

    Same shape as EventCreate plus provenance fields. Ingestion upserts on
    (source, external_id), so re-running a sync updates rather than duplicates.
    """
    source: str = Field(..., min_length=2, max_length=50)
    external_id: str = Field(..., min_length=1, max_length=255)
    image_url: Optional[str] = None

class EventOut(BaseModel):
    id: UUID
    organizer_id: UUID
    title: str
    slug: str
    description: Optional[str] = None
    category: str
    source: str = "native"
    external_id: Optional[str] = None
    image_url: Optional[str] = None
    event_type: Optional[str] = "In-Person"
    location: Dict[str, Any]
    target_audience: Optional[str] = None
    tags: Optional[List[Any]] = []
    language: Optional[str] = "English"
    event_website: Optional[str] = None
    community_id: Optional[UUID] = None
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
    event_type: Optional[str] = None
    location: Optional[Dict[str, Any]] = None
    target_audience: Optional[str] = None
    tags: Optional[List[str]] = None
    language: Optional[str] = None
    event_website: Optional[str] = None
    community_id: Optional[UUID] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    capacity: Optional[int] = None
    price: Optional[float] = None
    status: Optional[EventStatus] = None

class EventSearch(BaseModel):
    q: Optional[str] = None
    category: Optional[str] = None
    date_from: Optional[datetime] = None
