from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from app.models.payment import PaymentStatus

class PaymentCreate(BaseModel):
    user_id: UUID
    event_id: UUID
    amount: float = Field(..., gt=0)
    currency: str = "usd"
    metadata: Dict[str, Any] = {}

class PaymentOut(BaseModel):
    id: UUID
    user_id: UUID
    event_id: UUID
    stripe_intent_id: str
    client_secret: str
    amount: float
    currency: str
    status: PaymentStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class WebhookHandled(BaseModel):
    msg: str
