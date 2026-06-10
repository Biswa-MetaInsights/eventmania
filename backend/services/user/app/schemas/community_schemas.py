from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime


class CommunityCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    website: Optional[str] = None


class CommunityOut(BaseModel):
    id: UUID
    organizer_id: UUID
    name: str
    slug: str
    description: Optional[str] = None
    category: Optional[str] = None
    website: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
