from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime

class MessageIn(BaseModel):
    content: str = Field(..., min_length=1, max_length=1000)
    message_type: str = "text"

class MessageOut(BaseModel):
    id: UUID
    sender_id: UUID
    room_id: str
    content: str
    message_type: str
    created_at: datetime

    class Config:
        from_attributes = True

class SystemMessage(BaseModel):
    system: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
