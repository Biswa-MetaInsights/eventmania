from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.organizer_profile import OrganizerProfile, VerificationStatus
from app.schemas.organizer_schemas import OrganizerProfileCreate, OrganizerProfileOut, PublicOrganizerProfile
from uuid import UUID

router = APIRouter(prefix="/users", tags=["Organizer"])

@router.post("/{user_id}/organizer", response_model=OrganizerProfileOut, status_code=201)
def submit_organizer_profile(user_id: UUID, data: OrganizerProfileCreate, db: Session = Depends(get_db)):
    data = data.model_copy(update={"contact_email": data.contact_email or data.company_email})
    existing = db.query(OrganizerProfile).filter(OrganizerProfile.user_id == user_id).first()
    if existing:
        # Allow re-submission to update details
        for field, value in data.model_dump().items():
            setattr(existing, field, value)
        existing.verification_status = VerificationStatus.PENDING
        db.commit()
        db.refresh(existing)
        return existing

    profile = OrganizerProfile(
        user_id=user_id,
        verification_status=VerificationStatus.PENDING,
        **data.model_dump(),
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile

@router.get("/{user_id}/organizer", response_model=OrganizerProfileOut)
def get_organizer_profile(user_id: UUID, db: Session = Depends(get_db)):
    profile = db.query(OrganizerProfile).filter(OrganizerProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Organizer profile not found")
    return profile


@router.get("/{user_id}/organizer/public", response_model=PublicOrganizerProfile)
def get_public_organizer_profile(user_id: UUID, db: Session = Depends(get_db)):
    profile = db.query(OrganizerProfile).filter(OrganizerProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Organizer profile not found")
    return PublicOrganizerProfile(
        user_id=profile.user_id,
        name=profile.company_name.strip() or profile.full_name.strip(),
        verification_status=profile.verification_status,
    )
