from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks, Header
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.event import Event, EventStatus
from app.schemas.event_schemas import EventCreate, EventOut, EventUpdate, EventSearch, EventIngest
from typing import List, Optional
from datetime import datetime, timedelta, timezone
from uuid import UUID
from app.core.config import settings
from backend.shared.kafka_utils import KafkaManager
import logging
import asyncio
import math
import os
import secrets
import httpx
from backend.shared.security import identity, internal
from app.api.workspace import require_owner, queue_change, service_get, queue_community_event
from zoneinfo import ZoneInfo

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
    result = []
    for item in data:
        item = {**item, "tickets_sold": counts.get(item["id"], 0)}
        badges = []
        native = item.get('source', 'native') == 'native'
        sold = native and item['capacity'] > 0 and item['tickets_sold'] >= item['capacity']
        if sold: badges.append('sold-out')
        elif native and item['capacity'] > 0 and item['tickets_sold'] / item['capacity'] > .7: badges.append('selling-fast')
        if native and float(item['price']) == 0: badges.append('free')
        zone = ZoneInfo(item.get('timezone') or 'UTC')
        start = datetime.fromisoformat(item['start_date'].replace('Z', '+00:00'))
        if start.tzinfo is None: start = start.replace(tzinfo=timezone.utc)
        day = start.astimezone(zone).date()
        today = datetime.now(zone).date()
        if day == today: badges.append('today')
        if today <= day <= today + timedelta(days=7): badges.append('this-week')
        if item.get('previous_start_date'): badges.append('postponed')
        item['badge_types'] = badges
        result.append(item)
    return result

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
def create_event(event_in: EventCreate, background_tasks: BackgroundTasks, claims=Depends(identity), db: Session = Depends(get_db)):
    if str(event_in.organizer_id) != claims['sub']:
        raise HTTPException(403, 'Organizer identity mismatch')
    if event_in.community_id:
        group=service_get('USER',f'/users/communities/internal/{event_in.community_id}/members')
        if group['organizer_id']!=claims['sub']:raise HTTPException(403,'Community ownership required')
    # Create Slug
    slug = event_in.title.lower().replace(" ", "-") + "-" + str(datetime.utcnow().timestamp())
    
    new_event = Event(
        **event_in.model_dump(),
        slug=slug
    )
    db.add(new_event)
    db.flush()
    queue_community_event(db,new_event)
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
    q: Optional[str] = Query(None, max_length=200), category: Optional[str] = None,
    event_type: Optional[str] = None, date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None, price_min: Optional[float] = Query(None, ge=0),
    price_max: Optional[float] = Query(None, ge=0), currency: Optional[str] = Query(None, pattern=r'^[A-Z]{3}$'),
    community_id: Optional[UUID] = None, status: Optional[EventStatus] = None,
    lat: Optional[float] = Query(None, ge=-90, le=90), lng: Optional[float] = Query(None, ge=-180, le=180),
    radius: int = Query(200, ge=1, le=200), organizer_id: Optional[UUID] = None,
    tag: Optional[str] = None, sort: str = Query('date', pattern=r'^(date|distance|price|popularity|name)$'),
    offset: int = Query(0, ge=0, le=100000), limit: int = Query(50, ge=1, le=200),
    authorization: str = Header(''), db: Session = Depends(get_db)
):
    if (lat is None) != (lng is None):
        raise HTTPException(422, 'Provide both latitude and longitude')
    if ((price_min is not None and price_min > 0) or (price_max is not None and price_max > 0) or sort == 'price') and not currency:
        raise HTTPException(422, 'Choose a currency before comparing prices')
    if price_min is not None and price_max is not None and price_min > price_max:
        raise HTTPException(422, 'Minimum price exceeds maximum price')
    owner = False
    if organizer_id and authorization:
        owner = identity(authorization)['sub'] == str(organizer_id)
    if status and status not in (EventStatus.PUBLISHED, EventStatus.REGISTRATION_CLOSED) and not owner:
        raise HTTPException(403, 'Private events require organizer ownership')
    query = db.query(Event)
    if status:
        query = query.filter(Event.status == status)
    else:
        query = query.filter(Event.status.in_([EventStatus.PUBLISHED, EventStatus.REGISTRATION_CLOSED]))
    if not owner:
        query = query.filter(Event.visibility == 'public', Event.end_date >= datetime.utcnow())
    if organizer_id: query = query.filter(Event.organizer_id == organizer_id)
    if community_id: query = query.filter(Event.community_id == community_id)
    if q: query = query.filter(Event.title.ilike(f'%{q}%') | Event.description.ilike(f'%{q}%'))
    if category: query = query.filter(Event.category == category)
    if event_type:
        formats = [event_type, 'Hybrid'] if event_type in ('Online', 'In-Person') else [event_type]
        query = query.filter(Event.event_type.in_(formats))
    if date_from: query = query.filter(Event.start_date >= date_from)
    if date_to: query = query.filter(Event.start_date <= date_to)
    if currency: query = query.filter(Event.currency == currency)
    if price_min is not None: query = query.filter(Event.price >= price_min)
    if price_max is not None:
        query = query.filter(Event.price <= price_max)
        if price_max == 0: query = query.filter(Event.source == 'native')
    # Filter coordinates before pagination. Missing/invalid coordinates never match a radius.
    candidates = []
    for event in query.order_by(Event.start_date, Event.id).yield_per(200):
        distance = None
        if lat is not None:
            if event.event_type == 'Online': continue
            loc = event.location or {}
            try:
                ev_lat, ev_lng = float(loc['latitude']), float(loc['longitude'])
                if not (-90 <= ev_lat <= 90 and -180 <= ev_lng <= 180): continue
                distance = haversine(lat, lng, ev_lat, ev_lng)
            except (KeyError, TypeError, ValueError):
                continue
            if distance > radius: continue
        row = EventOut.model_validate(event).model_dump(mode='json')
        row['distance_km'] = round(distance, 2) if distance is not None else None
        candidates.append(row)
    data = []
    for index in range(0, len(candidates), 200):
        data.extend(with_inventory(candidates[index:index+200]))
    if tag: data = [row for row in data if tag in row['badge_types']]
    if sort == 'distance': data.sort(key=lambda row: (row['distance_km'] is None, row['distance_km'] or 0, row['start_date']))
    elif sort == 'price': data.sort(key=lambda row: (float(row['price']), row['start_date']))
    elif sort == 'popularity': data.sort(key=lambda row: (-row['tickets_sold'], row['start_date']))
    elif sort == 'name': data.sort(key=lambda row: row['title'].casefold())
    return data[offset:offset+limit]

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
    return {"count": db.query(func.count(Event.id)).filter(Event.status.in_([EventStatus.PUBLISHED,EventStatus.REGISTRATION_CLOSED]),Event.visibility=="public",Event.end_date>=datetime.utcnow()).scalar() or 0}

@router.get('/internal/organizer/{organizer_id}', dependencies=[Depends(internal)])
def internal_organizer_events(organizer_id: UUID, db: Session = Depends(get_db)):
    return [EventOut.model_validate(e).model_dump(mode='json') for e in db.query(Event).filter(Event.organizer_id == organizer_id).order_by(Event.start_date).all()]

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
def get_event(event_id: UUID, authorization: str = Header(""), db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.status == EventStatus.DRAFT or event.visibility == 'private':
        require_owner(event, identity(authorization))
    return with_inventory([event])[0]

@router.patch("/{event_id}", response_model=EventOut)
def update_event(event_id: UUID, event_in: EventUpdate, claims=Depends(identity), db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    require_owner(event, claims)
    if event.source != 'native':
        raise HTTPException(403, 'Provider listings can only be updated by their source')
    update_data = event_in.model_dump(exclude_unset=True)
    if any(value is None for key, value in update_data.items() if key not in {'image_url', 'event_website', 'community_id', 'target_audience', 'description'}):
        raise HTTPException(422, 'Required event fields cannot be empty')
    if ('price' in update_data and float(update_data['price']) != float(event.price)) or ('currency' in update_data and update_data['currency'] != event.currency):
        raise HTTPException(409, 'Ticket price and currency are fixed at creation')
    if update_data.get('community_id'):
        group=service_get('USER',f"/users/communities/internal/{update_data['community_id']}/members")
        if group['organizer_id']!=claims['sub']:raise HTTPException(403,'Community ownership required')
    merged = EventOut.model_validate(event).model_dump()
    merged.update(update_data)
    try:
        validated = EventCreate.model_validate(merged)
    except ValueError:
        raise HTTPException(422, 'Check event dates, location, image and time zone')
    for date_key in ('start_date', 'end_date'):
        if date_key in update_data: update_data[date_key] = getattr(validated, date_key)
    changes = {key: {'old': str(getattr(event, key)), 'new': str(value)} for key, value in update_data.items() if getattr(event, key) != value}
    schedule = any(key in changes for key in ('start_date', 'end_date', 'location'))
    cancellation = update_data.get('status') == EventStatus.CANCELLED and event.status != EventStatus.CANCELLED
    if (schedule or cancellation) and event.status != EventStatus.DRAFT:
        queue_change(db, event, claims['sub'], 'cancelled' if cancellation else 'rescheduled', changes)
        if schedule: event.previous_start_date = event.start_date
    if 'announcements' in changes and event.status!=EventStatus.DRAFT:
        queue_change(db,event,claims['sub'],'announcement',{'announcements':'Updated event announcements'})
    for field in update_data:
        setattr(event, field, update_data[field])

    db.add(event)
    if "status" in changes and event.status==EventStatus.PUBLISHED:queue_community_event(db,event)
    db.commit()
    db.refresh(event)
    _cache_invalidate()
    return event
