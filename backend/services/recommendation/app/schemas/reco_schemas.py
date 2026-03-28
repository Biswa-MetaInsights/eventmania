from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime

class RecommendationOut(BaseModel):
    event_id: UUID
    title: str
    category: str
    relevance_score: float = 0.0 # From AI model
    reason: Optional[str] = "Matches your interests" # Content-based reason
    
    class Config:
        from_attributes = True

class TrendingOut(BaseModel):
    event_id: UUID
    title: str
    sales_velocity: float # e.g., tickets per min
    popularity_index: int # e.g. 1-100
