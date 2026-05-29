from sqlalchemy.types import Uuid
from sqlalchemy import Column, String, Boolean, DateTime, JSON, DECIMAL, Enum, Integer, ForeignKey
import uuid
import datetime
import enum
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class TicketStatus(str, enum.Enum):
    VALID = "valid"
    USED = "used"
    REFUNDED = "refunded"
    CANCELLED = "cancelled"

class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(Uuid(as_uuid=True), index=True, nullable=False)
    user_id = Column(Uuid(as_uuid=True), index=True, nullable=False)
    
    # Optional seat info
    seat_info = Column(JSON, default={}) # e.g. {"row": "A", "number": 12}
    
    # Security and validation
    qr_code_hash = Column(String(512), unique=True, index=True)
    validation_key = Column(String(128)) # Secret key for HMAC validation
    
    status = Column(Enum(TicketStatus), default=TicketStatus.VALID)
    
    # Financial trace
    price_paid = Column(DECIMAL(12, 2), default=0.00)
    
    purchased_at = Column(DateTime, default=datetime.datetime.utcnow)
    checked_in_at = Column(DateTime, nullable=True)

    def __repr__(self):
        return f"<Ticket(id='{self.id}', event='{self.event_id}', user='{self.user_id}')>"

class Waitlist(Base):
    __tablename__ = "waitlist"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(Uuid(as_uuid=True), index=True, nullable=False)
    user_id = Column(Uuid(as_uuid=True), index=True, nullable=False)
    position = Column(Integer)
    requested_at = Column(DateTime, default=datetime.datetime.utcnow)


