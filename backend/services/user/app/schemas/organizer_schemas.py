from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID
from app.models.organizer_profile import VerificationStatus

class OrganizerProfileCreate(BaseModel):
    full_name: str
    company_name: str
    company_address: str
    company_email: EmailStr
    contact_email: Optional[EmailStr] = None
    company_website: Optional[str] = None
    country: str
    registration_number: str
    bank_name: str
    bank_account_number: str

class OrganizerProfileOut(BaseModel):
    id: UUID
    user_id: UUID
    full_name: str
    company_name: str
    company_address: str
    company_email: str
    contact_email: str
    company_website: Optional[str] = None
    country: str
    registration_number: str
    # Rows written before the payout columns existed read back as "" — the
    # migration's backfill. See backend/scripts/migrate_add_bank_columns.py.
    bank_name: str = ""
    bank_account_number: str = ""
    verification_status: VerificationStatus

    class Config:
        from_attributes = True


class PublicOrganizerProfile(BaseModel):
    user_id: UUID
    name: str
    verification_status: VerificationStatus
