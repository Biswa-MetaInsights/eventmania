from pydantic import BaseModel, Field, field_validator, model_validator, field_serializer
from typing import Optional, List, Dict, Any, Literal
from uuid import UUID
from datetime import datetime, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from app.models.event import EventStatus

class EventContent(BaseModel):
    image_url: Optional[str] = Field(None, max_length=1000)
    offer_name: str = Field('', max_length=60)
    organization_name: str = Field('', max_length=120)
    agenda: List[Dict[str, Any]] = Field(default_factory=list, max_length=100)
    faq: List[Dict[str, Any]] = Field(default_factory=list, max_length=100)
    announcements: List[Dict[str, Any]] = Field(default_factory=list, max_length=100)
    visibility: Literal['public', 'unlisted', 'private'] = 'public'
    timezone: str = 'UTC'

    @field_validator('timezone')
    @classmethod
    def timezone_valid(cls, value):
        try:
            ZoneInfo(value)
        except (ZoneInfoNotFoundError, ValueError):
            raise ValueError('Choose a valid IANA time zone')
        return value

    @field_validator('image_url')
    @classmethod
    def image_valid(cls, value):
        if value and not (value.startswith('https://') or value.startswith('/api/')):
            raise ValueError('Use an HTTPS image URL or an uploaded image')
        return value

class EventCreate(EventContent):
    organizer_id: UUID
    title: str = Field(min_length=5, max_length=200)
    description: Optional[str] = Field(None, max_length=20000)
    category: str = Field('General', max_length=100)
    event_type: Literal['In-Person', 'Online', 'Hybrid'] = 'In-Person'
    location: Dict[str, Any] = Field(default_factory=dict)
    target_audience: Optional[str] = None
    tags: List[str] = Field(default_factory=list, max_length=30)
    language: str = Field('English', max_length=50)
    event_website: Optional[str] = Field(None, max_length=500)
    community_id: Optional[UUID] = None
    start_date: datetime
    end_date: datetime
    capacity: int = Field(0, ge=0, le=1000000)
    price: float = Field(0, ge=0, le=1000000, allow_inf_nan=False)
    currency: str = Field('EUR', pattern=r'^[A-Z]{3}$')
    status: EventStatus = EventStatus.DRAFT

    @field_validator('start_date', 'end_date')
    @classmethod
    def utc_date(cls, value):
        return value.astimezone(timezone.utc).replace(tzinfo=None) if value.tzinfo else value

    @model_validator(mode='after')
    def valid_event(self):
        if self.end_date <= self.start_date:
            raise ValueError('End time must be after start time')
        loc = self.location
        if ('latitude' in loc) != ('longitude' in loc):
            raise ValueError('Latitude and longitude must be provided together')
        if loc.get('latitude') is None and loc.get('longitude') is None:
            loc.pop('latitude', None)
            loc.pop('longitude', None)
            return self
        if 'latitude' in loc:
            try:
                lat, lng = float(loc['latitude']), float(loc['longitude'])
                if not (-90 <= lat <= 90 and -180 <= lng <= 180):
                    raise ValueError()
            except (TypeError, ValueError):
                raise ValueError('Invalid venue coordinates')
        return self

class EventIngest(EventCreate):
    source: str = Field(min_length=2, max_length=50)
    external_id: str = Field(min_length=1, max_length=255)

class EventOut(EventContent):
    id: UUID
    organizer_id: UUID
    title: str
    slug: str
    description: Optional[str] = None
    category: str
    source: str = 'native'
    external_id: Optional[str] = None
    event_type: str = 'In-Person'
    location: Dict[str, Any]
    target_audience: Optional[str] = None
    tags: List[Any] = []
    badge_types: List[str] = []
    distance_km: Optional[float] = None
    language: str = 'English'
    event_website: Optional[str] = None
    community_id: Optional[UUID] = None
    start_date: datetime
    end_date: datetime
    previous_start_date: Optional[datetime] = None
    capacity: int
    tickets_sold: int
    price: float
    currency: str = 'EUR'
    status: EventStatus
    content_generated: Dict[str, Any]
    moderation_score: float
    created_at: datetime
    updated_at: datetime
    @field_serializer('start_date', 'end_date', 'created_at', 'updated_at', 'previous_start_date')
    def dates_as_utc(self, value):
        if value is None: return None
        return value.replace(tzinfo=timezone.utc).isoformat().replace('+00:00', 'Z') if value.tzinfo is None else value.astimezone(timezone.utc).isoformat().replace('+00:00', 'Z')
    model_config = {'from_attributes': True}

class EventUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=5, max_length=200)
    description: Optional[str] = Field(None, max_length=20000)
    category: Optional[str] = Field(None, max_length=100)
    event_type: Optional[Literal['In-Person', 'Online', 'Hybrid']] = None
    location: Optional[Dict[str, Any]] = None
    target_audience: Optional[str] = None
    tags: Optional[List[str]] = None
    language: Optional[str] = None
    event_website: Optional[str] = None
    community_id: Optional[UUID] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    capacity: Optional[int] = Field(None, ge=0, le=1000000)
    price: Optional[float] = Field(None, ge=0, allow_inf_nan=False)
    currency: Optional[str] = Field(None, pattern=r'^[A-Z]{3}$')
    status: Optional[EventStatus] = None
    image_url: Optional[str] = Field(None, max_length=1000)
    offer_name: Optional[str] = Field(None, max_length=60)
    organization_name: Optional[str] = Field(None, max_length=120)
    agenda: Optional[List[Dict[str, Any]]] = Field(None, max_length=100)
    faq: Optional[List[Dict[str, Any]]] = Field(None, max_length=100)
    announcements: Optional[List[Dict[str, Any]]] = Field(None, max_length=100)
    visibility: Optional[Literal['public', 'unlisted', 'private']] = None
    timezone: Optional[str] = None

class EventSearch(BaseModel):
    q: Optional[str] = None
    category: Optional[str] = None
    date_from: Optional[datetime] = None
