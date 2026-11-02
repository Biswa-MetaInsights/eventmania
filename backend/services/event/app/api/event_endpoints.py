from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks, Header
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.event import Event, EventStatus
from app.schemas.event_schemas import EventCreate, EventOut, EventUpdate, EventSearch, EventIngest
from typing import List, Optional
from datetime import datetime
from uuid import UUID
from app.core.config import settings
from backend.shared.kafka_utils import KafkaManager
import logging
import asyncio
import math
import os
import secrets
import httpx

router = APIRouter(prefix="/events", tags=["Event Management"])

logger = logging.getLogger(__name__)

# ── In-memory search cache ────────────────────────────────────────────────────
# Keyed by search params, TTL = 5 minutes. Invalidated on new event creation.
import time as _time
_search_cache: dict = {}
_CACHE_TTL = 300  # seconds

def _cache_key(*parts) -> str:
    """Key on EVERY parameter that narrows the query.

    ⚠️ It used to key on only lat/lng/radius/status/q/organizer_id/limit, which
    meant category, event_type, the date bounds and the price bounds all shared
    one cache entry: filter by category and, for the next five minutes, you got
    whatever the previous unfiltered search had returned. Anything added to
    `search_events` that narrows the result set MUST be added here too.
    """
    return "_".join(str(p) for p in parts)

def _cache_get(key: str):
    entry = _search_cache.get(key)
    if entry and (_time.time() - entry["ts"]) < _CACHE_TTL:
        return entry["data"]
    return None

def _cache_set(key: str, data) -> None:
    if len(_search_cache) >= 256:
        _search_cache.clear()
    _search_cache[key] = {"data": data, "ts": _time.time()}

def _cache_invalidate() -> None:
    _search_cache.clear()

def with_inventory(events):
    if not events:
        return []
    data = [item if isinstance(item, dict) else EventOut.model_validate(item).model_dump(mode="json") for item in events]
    try:
        response = httpx.get(settings.TICKETING_SERVICE_URL + "/tickets/counts",
                             params=[("event_id", item["id"]) for item in data], timeout=5)
        response.raise_for_status()
        counts = response.json()
    except httpx.HTTPError:
        raise HTTPException(503, "Ticket inventory is temporarily unavailable")
    return [{**item, "tickets_sold": counts.get(item["id"], 0)} for item in data]

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

@router.post("/ingest", response_model=EventOut)
def ingest_event(event_in: EventIngest, x_internal_key: str = Header(""), db: Session = Depends(get_db)):
    """Idempotently upsert an externally-sourced event.

    Keyed on (source, external_id). On first sight the event is inserted; on
    subsequent syncs the existing row is updated in place. Unlike create_event
    this does not publish to Kafka — aggregated events bypass the moderation and
    content-generation agents, which only apply to native organiser content.
    """
    expected = os.getenv("INTERNAL_API_KEY", "")
    if not expected or not secrets.compare_digest(x_internal_key, expected):
        raise HTTPException(403, "Internal access only")
    from backend.shared.ticketmaster import safe_ticket_url
    if event_in.source != "ticketmaster" or not safe_ticket_url(event_in.event_website):
        raise HTTPException(422, "A valid Ticketmaster listing URL is required")
    existing = (
        db.query(Event)
        .filter(Event.source == event_in.source, Event.external_id == event_in.external_id)
        .first()
    )

    data = event_in.model_dump()

    if existing:
        # Preserve identity fields; refresh everything the provider may change.
        for field, value in data.items():
            setattr(existing, field, value)
        db.add(existing)
        db.commit()
        db.refresh(existing)
        _cache_invalidate()
        return existing

    # Stable slug derived from source + external_id (not a timestamp) so the
    # slug stays constant across re-syncs.
    slug = f"{event_in.source}-{event_in.external_id}".lower().replace(" ", "-")[:350]
    new_event = Event(**data, slug=slug)
    db.add(new_event)
    db.commit()
    db.refresh(new_event)

    _cache_invalidate()
    return new_event

@router.get("/search", response_model=List[EventOut])
def search_events(
    q: Optional[str] = Query(None, description="Search query"),
    category: Optional[str] = Query(None),
    event_type: Optional[str] = Query(None, description="In-Person | Online | Hybrid"),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    price_min: Optional[float] = Query(None, description="Minimum ticket price (inclusive)"),
    price_max: Optional[float] = Query(None, description="Maximum ticket price (inclusive; 0 = free only)"),
    community_id: Optional[UUID] = Query(None, description="Filter by community"),
    status: Optional[EventStatus] = Query(EventStatus.PUBLISHED),
    lat: Optional[float] = Query(None, description="User latitude"),
    lng: Optional[float] = Query(None, description="User longitude"),
    radius: Optional[int] = Query(20, description="Search radius in km"),
    organizer_id: Optional[UUID] = Query(None, description="Filter by organizer"),
    limit: int = Query(50, ge=1, le=200, description="Max results to return"),
    db: Session = Depends(get_db)
):
    ck = _cache_key(
        lat, lng, radius, status, q, organizer_id, limit,
        category, event_type, date_from, date_to, price_min, price_max, community_id,
    )
    cached = _cache_get(ck)
    if cached is not None:
        return with_inventory(cached)

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
        # A Hybrid event is attendable both in person and online, so it matches
        # BOTH an "Online" and an "In-Person" filter — an exact == would drop it
        # from every list. Asking for Hybrid explicitly still means only Hybrid.
        if event_type.lower() in ("online", "in-person"):
            query = query.filter(Event.event_type.in_([event_type, "Hybrid"]))
        else:
            query = query.filter(Event.event_type == event_type)
    if date_from:
        query = query.filter(Event.start_date >= date_from)
    if date_to:
        query = query.filter(Event.start_date <= date_to)
    # ⚠️ Both bounds are compared against the RAW price column, with no regard
    # for the event's currency — a $45 event matches price_max=500 as readily as
    # a ₹45 one. That is a known limitation, not an oversight; see TODO.md §25.
    if price_min is not None:
        query = query.filter(Event.price >= price_min)
    if price_max is not None:
        query = query.filter(Event.price <= price_max)
        if price_max == 0:
            # External missing prices are not a promise of free admission.
            query = query.filter(Event.source == "native")

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
        data = with_inventory(result)
        _cache_set(ck, data)
        return data

    result = query.limit(limit).all()
    data = with_inventory(result)
    _cache_set(ck, data)
    return data

@router.get("/count")
def count_events(
    status: Optional[EventStatus] = Query(EventStatus.PUBLISHED),
    db: Session = Depends(get_db)
):
    """Total number of events, for the home hero's "About N options" line.

    ⚠️ MUST stay declared ABOVE /{event_id}. FastAPI matches routes in definition
    order, so below it "count" is captured as an event_id and 422s on the UUID parse.

    Returns a bare count, never the rows — the caller only needs the number, and
    the alternative (fetching every event to take .length) would ship the whole
    catalogue to the browser.
    """
    # func.count(Event.id) selects ONE column. db.query(Event).count() wraps a SELECT
    # of every mapped column in a subquery, so it breaks whenever the table is behind
    # the model — which platform_dev.db currently is (no `source` column until
    # migrate_add_source_columns.py is run; /events/search 500s on exactly this).
    # Counting a single column is both cheaper and immune to that skew.
    return {"count": db.query(func.count(Event.id)).filter(Event.status == status).scalar() or 0}

@router.get("/internal/{event_id}", response_model=EventOut)
def get_event_for_booking(event_id: UUID, x_internal_key: str = Header(""), db: Session = Depends(get_db)):
    # Avoid a circular event -> ticketing -> event call while inventory is locked.
    expected = os.getenv("INTERNAL_API_KEY", "")
    if not expected or not secrets.compare_digest(x_internal_key, expected):
        raise HTTPException(403, "Internal access only")
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(404, "Event not found")
    return event

@router.get("/{event_id}", response_model=EventOut)
def get_event(event_id: UUID, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return with_inventory([event])[0]

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
    _cache_invalidate()
    return event
