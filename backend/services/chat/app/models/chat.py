from sqlalchemy.types import Uuid
from sqlalchemy import Column, String, Text, DateTime, JSON, ForeignKey, Boolean
import uuid
import datetime
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sender_id = Column(Uuid(as_uuid=True), index=True, nullable=False)
    
    # Can be a room (event_id) or a specific user (recipient_id)
    room_id = Column(String(255), index=True, nullable=True) # e.g. "event:uuid" or "dm:uuid:uuid"
    
    content = Column(Text, nullable=False)
    message_type = Column(String(50), default="text") # text, image, system
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class RoomParticipation(Base):
    __tablename__ = "room_participants"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    room_id = Column(String(255), index=True, nullable=False)
    user_id = Column(Uuid(as_uuid=True), index=True, nullable=False)
    last_seen = Column(DateTime, default=datetime.datetime.utcnow)
    is_active = Column(Boolean, default=True)


