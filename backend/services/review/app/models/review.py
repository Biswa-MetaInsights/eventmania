from sqlalchemy.types import Uuid
from sqlalchemy import Column, String, Text, DateTime, JSON, DECIMAL, ForeignKey, Integer, Boolean, CheckConstraint
import uuid
import datetime
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class Review(Base):
    __tablename__ = "reviews"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(Uuid(as_uuid=True), index=True, nullable=False)
    user_id = Column(Uuid(as_uuid=True), index=True, nullable=False)
    
    # Rating: 1 to 5 stars
    rating = Column(Integer, nullable=False)
    content = Column(Text, nullable=True)
    
    # Moderation Logic
    is_public = Column(Boolean, default=True) # Set to False if flagged by AI
    moderation_score = Column(DECIMAL(4, 2), default=0.00)
    moderation_notes = Column(Text, nullable=True)
    
    # Verification check (did they attend?)
    is_verified_purchase = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Database constraint for rating scale
    __table_args__ = (
        CheckConstraint('rating >= 1 AND rating <= 5', name='rating_range'),
    )

    def __repr__(self):
        return f"<Review(id='{self.id}', event='{self.event_id}', rating={self.rating})>"


