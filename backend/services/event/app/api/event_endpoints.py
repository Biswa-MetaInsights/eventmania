from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.event import Event, EventStatus
from app.schemas.event_schemas import EventCreate, EventOut, EventUpdate, EventSearch
from uuid import UUID
from app.core.config import settings
from backend.shared.kafka_utils import KafkaManager
import logging
import asyncio

router = APIRouter(prefix="/events", tags=["Event Management"])

logger = logging.getLogger(__name__)

# Initialize Kafka Manager for events
kafka_manager = KafkaManager(bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS)

@router.post("/", response_model=EventOut, status_code=status.HTTP_201_CREATED)
def create_event(event_in: EventCreate, db: Session = Depends(get_db)):
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
    asyncio.create_task(kafka_manager.send_event("event.created", event_data))

    return new_event

@router.get("/search", response_model=List[EventOut])
def search_events(
    q: Optional[str] = Query(None, description="Search query"),
    category: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    status: Optional[EventStatus] = Query(EventStatus.PUBLISHED),
    db: Session = Depends(get_db)
):
    query = db.query(Event).filter(Event.status == status)
    
    if q:
        query = query.filter(Event.title.ilike(f"%{q}%") | Event.description.ilike(f"%{q}%"))
    
    if category:
        query = query.filter(Event.category == category)
    
    if date_from:
        query = query.filter(Event.start_date >= date_from)

    return query.limit(20).all()

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
