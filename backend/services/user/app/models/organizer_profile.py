from sqlalchemy.types import Uuid
from sqlalchemy import Column, String, Enum
import uuid
import enum
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class VerificationStatus(str, enum.Enum):
    UNVERIFIED = "unverified"
    PENDING = "pending"
    VERIFIED = "verified"

class OrganizerProfile(Base):
    __tablename__ = "organizer_profiles"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid(as_uuid=True), unique=True, index=True, nullable=False)
    company_name = Column(String(300), nullable=False)
    company_address = Column(String(500), nullable=False)
    company_email = Column(String(255), nullable=False)
    country = Column(String(100), nullable=False)
    registration_number = Column(String(100), nullable=False)
    verification_status = Column(Enum(VerificationStatus), default=VerificationStatus.VERIFIED, nullable=False)

    def __repr__(self):
        return f"<OrganizerProfile(company='{self.company_name}', status='{self.verification_status}')>"
