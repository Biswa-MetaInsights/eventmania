from sqlalchemy.types import Uuid
from sqlalchemy import Column, String, Boolean, DateTime, JSON, DECIMAL, Enum, Integer
import uuid
import datetime
import enum
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    REFUNDED = "refunded"

class PaymentIntent(Base):
    __tablename__ = "payment_intents"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid(as_uuid=True), index=True, nullable=False)
    event_id = Column(Uuid(as_uuid=True), index=True, nullable=False)
    ticket_id = Column(Uuid(as_uuid=True), index=True, nullable=True) # Linked once issued
    
    # Stripe-specific data
    stripe_intent_id = Column(String(255), unique=True, index=True)
    stripe_session_id = Column(String(255), nullable=True)
    client_secret = Column(String(255))
    
    amount = Column(DECIMAL(12, 2), nullable=False)
    currency = Column(String(3), default="usd")
    
    status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING)
    metadata_json = Column(JSON, default={}) # For storing metadata like seat_id
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    def __repr__(self):
        return f"<PaymentIntent(id='{self.id}', stripe_id='{self.stripe_intent_id}', status='{self.status}')>"


