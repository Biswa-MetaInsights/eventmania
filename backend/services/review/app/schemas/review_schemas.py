from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime

class ReviewCreate(BaseModel):
    user_id: UUID
    event_id: UUID
    rating: int = Field(..., ge=1, le=5)
    content: Optional[str] = None

class ReviewOut(BaseModel):
    id: UUID
    user_id: UUID
    event_id: UUID
    rating: int
    content: Optional[str]
    is_public: bool
    is_verified_purchase: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ReviewAggregates(BaseModel):
    average_rating: float
    review_count: int
