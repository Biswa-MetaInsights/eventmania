from sqlalchemy.types import Uuid
from sqlalchemy import Column, String, Text, DateTime, JSON, DECIMAL, Enum, Integer, UniqueConstraint
import uuid
import datetime
import enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Boolean

Base = declarative_base()

class EventStatus(str, enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    CANCELLED = "cancelled"
    COMPLETED = "completed"

class Event(Base):
    __tablename__ = "events"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organizer_id = Column(Uuid(as_uuid=True), index=True, nullable=False)
    title = Column(String(300), nullable=False)
    slug = Column(String(350), unique=True, index=True)
    description = Column(Text, nullable=True)
    category = Column(String(100), index=True)

    # ── Provenance (aggregated vs native events) ──────────────────────────────
    # source: "native" for organiser-created events, or a provider key such as
    # "ticketmaster" for aggregated events. external_id is the provider's own
    # stable event id; together they make ingestion idempotent (upsert key).
    source = Column(String(50), default="native", index=True, nullable=False)
    external_id = Column(String(255), nullable=True, index=True)
    image_url = Column(String(1000), nullable=True)
    
    event_type = Column(String(20), default="In-Person")  # In-Person | Online | Hybrid
    location = Column(JSON, default={})
    target_audience = Column(Text, nullable=True)
    tags = Column(JSON, default=[])
    language = Column(String(50), default="English")
    event_website = Column(String(500), nullable=True)
    community_id = Column(Uuid(as_uuid=True), nullable=True, index=True)

    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)

    capacity = Column(Integer, default=0)
    tickets_sold = Column(Integer, default=0)
    price = Column(DECIMAL(12, 2), default=0.00)

    status = Column(Enum(EventStatus), default=EventStatus.DRAFT)

    content_generated = Column(JSON, default={})
    moderation_score = Column(DECIMAL(4, 2), default=0.00)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # A given provider event is stored at most once. Enforced for fresh
    # databases (e.g. Postgres); the ingest endpoint also upserts at the
    # application layer so this holds even where the constraint is absent
    # (e.g. a pre-existing SQLite dev file migrated via ALTER TABLE).
    __table_args__ = (
        UniqueConstraint("source", "external_id", name="uq_event_source_external_id"),
    )

    def __repr__(self):
        return f"<Event(title='{self.title}', status='{self.status}')>"


