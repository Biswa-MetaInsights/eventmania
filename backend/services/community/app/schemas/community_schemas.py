from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from uuid import UUID
from datetime import datetime

class CommunityCreate(BaseModel):
    organizer_id: UUID
    name: str = Field(..., min_length=3, max_length=300)
    description: Optional[str] = None
    category: Optional[str] = "General"
    location: Dict[str, Any] = {}
    next_event_date: Optional[datetime] = None
    member_count: int = 0
    price: float = 0.0
    status: Optional[str] = "active"

class CommunityOut(BaseModel):
    id: UUID
    organizer_id: UUID
    name: str
    description: Optional[str] = None
    category: str
    location: Dict[str, Any]
    next_event_date: Optional[datetime] = None
    member_count: int
    price: float
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
