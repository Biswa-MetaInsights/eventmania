from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime

class UserProfileOut(BaseModel):
    id: UUID
    full_name: str
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    interests: List[str] = []
    settings: Dict[str, Any] = {}
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    interests: Optional[List[str]] = None
    settings: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True

class ProfileCreateInternal(BaseModel):
    user_id: UUID
    full_name: str
    avatar_url: Optional[str] = None
