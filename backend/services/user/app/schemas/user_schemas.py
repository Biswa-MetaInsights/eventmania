from pydantic import BaseModel, EmailStr, Field, field_validator
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
    full_name: Optional[str] = Field(None, min_length=1, max_length=200)
    bio: Optional[str] = Field(None, max_length=4000)
    avatar_url: Optional[str] = Field(None, max_length=512)
    interests: Optional[List[str]] = Field(None, max_length=30)
    settings: Optional[Dict[str, Any]] = None

    @field_validator('full_name','interests','settings')
    @classmethod
    def required_if_supplied(cls,value):
        if value is None:raise ValueError('This field cannot be null')
        if isinstance(value,str) and not value.strip():raise ValueError('Enter a name')
        if isinstance(value,list) and any(not v.strip() or len(v)>80 for v in value):raise ValueError('Interests must be 1–80 characters')
        return value

    class Config:
        from_attributes = True

class ProfileCreateInternal(BaseModel):
    user_id: UUID
    full_name: str
    avatar_url: Optional[str] = None
