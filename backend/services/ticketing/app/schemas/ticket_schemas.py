from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from app.models.ticket import TicketStatus

class TicketCreate(BaseModel):
    event_id: UUID
    user_id: UUID
    seat_info: Dict[str, Any] = {}
    price_paid: float = 0.0

class TicketOut(BaseModel):
    id: UUID
    event_id: UUID
    user_id: UUID
    seat_info: Dict[str, Any]
    qr_code_hash: str
    status: TicketStatus
    price_paid: float
    purchased_at: datetime
    checked_in_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class WaitlistJoin(BaseModel):
    event_id: UUID
    user_id: UUID

class WaitlistOut(BaseModel):
    event_id: UUID
    user_id: UUID
    position: int
    requested_at: Optional[datetime] = None
