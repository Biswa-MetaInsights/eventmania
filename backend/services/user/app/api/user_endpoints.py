from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user_profile import UserProfile
from app.schemas.user_schemas import UserProfileOut, UserProfileUpdate
from uuid import UUID
from typing import List

router = APIRouter(prefix="/users", tags=["Users Profile"])

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
