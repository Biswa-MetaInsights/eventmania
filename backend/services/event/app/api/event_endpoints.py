from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.event import Event, EventStatus
from app.schemas.event_schemas import EventCreate, EventOut, EventUpdate, EventSearch
from typing import List, Optional
from datetime import datetime
from uuid import UUID
from app.core.config import settings
from backend.shared.kafka_utils import KafkaManager
import logging
import asyncio
import math

router = APIRouter(prefix="/events", tags=["Event Management"])

logger = logging.getLogger(__name__)

# ── In-memory search cache ────────────────────────────────────────────────────
# Keyed by search params, TTL = 5 minutes. Invalidated on new event creation.
import time as _time
_search_cache: dict = {}
_CACHE_TTL = 300  # seconds

def _cache_key(lat, lng, radius, status, q, organizer_id, limit) -> str:
    return f"{lat}_{lng}_{radius}_{status}_{q}_{organizer_id}_{limit}"

def _cache_get(key: str):
    entry = _search_cache.get(key)
    if entry and (_time.time() - entry["ts"]) < _CACHE_TTL:
        return entry["data"]
    return None

def _cache_set(key: str, data) -> None:
    _search_cache[key] = {"data": data, "ts": _time.time()}

def _cache_invalidate() -> None:
    _search_cache.clear()

def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371  # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) * math.sin(dlat / 2) +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) * math.sin(dlon / 2))
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

# Initialize Kafka Manager for events
kafka_manager = KafkaManager(
    bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
    client_id="event-service-producer"
)

@router.post("/", response_model=EventOut, status_code=status.HTTP_201_CREATED)
def create_event(event_in: EventCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # Create Slug
    slug = event_in.title.lower().replace(" ", "-") + "-" + str(datetime.utcnow().timestamp())
    
    new_event = Event(
        **event_in.model_dump(),
        slug=slug
    )
    db.add(new_event)
    db.commit()
    db.refresh(new_event)

    # 3. Publish 'EventCreated' for Moderation & Content Agent
    logger.info(f"Event created: {new_event.id}, triggering AI agents via Kafka...")
    
    event_data = {
        "event_id": str(new_event.id),
        "organizer_id": str(new_event.organizer_id),
        "title": new_event.title,
        "description": new_event.description,
        "category": new_event.category,
        "created_at": str(new_event.created_at)
    }
    
    # Run publishing as a background task
    background_tasks.add_task(kafka_manager.send, "event.created", event_data)

    _cache_invalidate()  # New event — clear search cache
    return new_event

@router.get("/search", response_model=List[EventOut])
def search_events(
    q: Optional[str] = Query(None, description="Search query"),
    category: Optional[str] = Query(None),
    event_type: Optional[str] = Query(None, description="In-Person | Online | Hybrid"),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    price_max: Optional[float] = Query(None, description="Maximum ticket price (0 = free only)"),
    community_id: Optional[UUID] = Query(None, description="Filter by community"),
    status: Optional[EventStatus] = Query(EventStatus.PUBLISHED),
    lat: Optional[float] = Query(None, description="User latitude"),
    lng: Optional[float] = Query(None, description="User longitude"),
    radius: Optional[int] = Query(20, description="Search radius in km"),
    organizer_id: Optional[UUID] = Query(None, description="Filter by organizer"),
    limit: Optional[int] = Query(50, description="Max results to return"),
    db: Session = Depends(get_db)
):
    ck = _cache_key(lat, lng, radius, status, q, organizer_id, limit)
    cached = _cache_get(ck)
    if cached is not None:
        return cached

    query = db.query(Event).filter(Event.status == status)

    if organizer_id:
        query = query.filter(Event.organizer_id == organizer_id)
    if community_id:
        query = query.filter(Event.community_id == community_id)
    if q:
        query = query.filter(Event.title.ilike(f"%{q}%") | Event.description.ilike(f"%{q}%"))
    if category:
        query = query.filter(Event.category == category)
    if event_type:
        query = query.filter(Event.event_type == event_type)
    if date_from:
        query = query.filter(Event.start_date >= date_from)
    if date_to:
        query = query.filter(Event.start_date <= date_to)
    if price_max is not None:
        query = query.filter(Event.price <= price_max)

    query = query.order_by(Event.start_date)

    if lat is not None and lng is not None:
        all_events = query.all()
        filtered = []
        for ev in all_events:
            loc = ev.location or {}
            ev_lat = loc.get("latitude")
            ev_lng = loc.get("longitude")
            if ev_lat is not None and ev_lng is not None:
                if haversine(lat, lng, float(ev_lat), float(ev_lng)) <= radius:
                    filtered.append(ev)
            else:
                filtered.append(ev)
        result = filtered[:limit]
        _cache_set(ck, result)
        return result

    result = query.limit(limit).all()
    _cache_set(ck, result)
    return result

@router.get("/{event_id}", response_model=EventOut)
def get_event(event_id: UUID, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event

@router.patch("/{event_id}", response_model=EventOut)
def update_event(event_id: UUID, event_in: EventUpdate, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    update_data = event_in.model_dump(exclude_unset=True)
    for field in update_data:
        setattr(event, field, update_data[field])

    db.add(event)
    db.commit()
    db.refresh(event)
    return event
