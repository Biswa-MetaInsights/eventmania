from fastapi import APIRouter, Depends, HTTPException, status, Header
from pydantic import BaseModel, Field
import os
import secrets
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user_profile import UserProfile
from app.schemas.user_schemas import UserProfileOut, UserProfileUpdate
from uuid import UUID
from typing import List

router = APIRouter(prefix="/users", tags=["Users Profile"])

class ProfileCreate(BaseModel):
    user_id: UUID
    full_name: str = Field(min_length=1, max_length=200)

@router.post("/internal/profile", status_code=201)
def initialize_profile(data: ProfileCreate, x_internal_key: str = Header(""), db: Session = Depends(get_db)):
    expected = os.getenv("INTERNAL_API_KEY", "")
    if not expected or not secrets.compare_digest(x_internal_key, expected):
        raise HTTPException(status_code=403, detail="Internal access only")
    profile = db.query(UserProfile).filter(UserProfile.id == data.user_id).first()
    if not profile:
        profile = UserProfile(id=data.user_id, full_name=data.full_name)
        db.add(profile)
        db.commit()
    return {"id": str(profile.id)}

@router.get('/internal/attendee/{user_id}')
def attendee_identity(user_id: UUID, x_internal_key: str = Header(''), db: Session = Depends(get_db)):
    from backend.shared.security import internal
    internal(x_internal_key)
    profile = db.get(UserProfile, user_id)
    if not profile: raise HTTPException(404, 'Profile not found')
    import httpx
    try:
        response = httpx.get(os.getenv('AUTH_SERVICE_URL', 'http://auth:8001') + '/auth/internal/identity/' + str(user_id), headers={'X-Internal-Key': x_internal_key}, timeout=5)
        response.raise_for_status()
    except httpx.HTTPError:
        raise HTTPException(503, 'Identity service is temporarily unavailable')
    return {'id': str(profile.id), 'full_name': profile.full_name, 'email': response.json()['email']}

@router.get("/{user_id}", response_model=UserProfileOut)
def get_user_profile(user_id: UUID, db: Session = Depends(get_db)):
    profile = db.query(UserProfile).filter(UserProfile.id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile

@router.patch("/{user_id}", response_model=UserProfileOut)
def update_user_profile(user_id: UUID, profile_in: UserProfileUpdate, db: Session = Depends(get_db)):
    profile = db.query(UserProfile).filter(UserProfile.id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    # Update data efficiently
    update_data = profile_in.model_dump(exclude_unset=True)
    for field in update_data:
        setattr(profile, field, update_data[field])

    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile

@router.get("/interests/{interest}", response_model=List[UserProfileOut])
def get_users_by_interest(interest: str, db: Session = Depends(get_db)):
    # Efficient search via PostgreSQL Array support
    from sqlalchemy import any_
    users = db.query(UserProfile).filter(interest == any_(UserProfile.interests)).limit(20).all()
    return users
