"""Persistent event collaboration on the existing event database; no Kafka required."""
import os
from datetime import datetime, timedelta
from uuid import UUID, uuid4, uuid5, NAMESPACE_URL
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Header
from pydantic import BaseModel, Field
from sqlalchemy import Column, String, Text, DateTime, JSON, UniqueConstraint
from sqlalchemy.types import Uuid
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models.event import Base, Event, EventStatus
from app.db.session import get_db
from backend.shared.security import identity, internal

router = APIRouter(prefix='/events', tags=['Collaboration'])

class EventMessage(Base):
    __tablename__ = 'event_messages'
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    event_id = Column(Uuid(as_uuid=True), index=True, nullable=False)
    user_id = Column(Uuid(as_uuid=True), nullable=False)
    name = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class RoomRead(Base):
    __tablename__ = 'event_room_reads'
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    event_id = Column(Uuid(as_uuid=True), nullable=False)
    user_id = Column(Uuid(as_uuid=True), nullable=False)
    read_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    __table_args__ = (UniqueConstraint('event_id', 'user_id'),)

class Notice(Base):
    __tablename__ = 'event_notifications'
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(Uuid(as_uuid=True), index=True, nullable=False)
    event_id = Column(Uuid(as_uuid=True), index=True, nullable=False)
    kind = Column(String(50), nullable=False)
    title = Column(String(300), nullable=False)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    read_at = Column(DateTime, nullable=True)

class EventAudit(Base):
    __tablename__ = 'event_changes'
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    event_id = Column(Uuid(as_uuid=True), index=True, nullable=False)
    actor_id = Column(Uuid(as_uuid=True), nullable=False)
    kind = Column(String(50), nullable=False)
    changes = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class MailOutbox(Base):
    __tablename__ = 'event_mail_outbox'
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    notice_id = Column(Uuid(as_uuid=True), unique=True, nullable=False)
    user_id = Column(Uuid(as_uuid=True), nullable=False)
    status = Column(String(20), default='pending', nullable=False)
    attempts = Column(String(10), default='0', nullable=False)
    next_attempt_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    sent_at = Column(DateTime, nullable=True)


def service_get(service, path, headers=None):
    try:
        response = httpx.get(os.environ[service + '_SERVICE_URL'] + path,
                            headers=headers or {'X-Internal-Key': os.environ['INTERNAL_API_KEY']}, timeout=8)
        if response.status_code == 404:
            raise HTTPException(404, 'Record not found')
        response.raise_for_status()
        return response.json()
    except (httpx.HTTPError, KeyError):
        raise HTTPException(503, 'A required service is temporarily unavailable')


def event_or_404(db, event_id):
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(404, 'Event not found')
    return event


def require_owner(event, claims):
    if str(event.organizer_id) != claims['sub']:
        raise HTTPException(403, 'Only the event organiser can perform this action')


def participant_ids(event_id):
    return service_get('TICKETING', f'/tickets/internal/event/{event_id}')


def require_member(event, claims):
    if str(event.organizer_id) == claims['sub']:
        return
    if not any(row['user_id'] == claims['sub'] for row in participant_ids(event.id)):
        raise HTTPException(403, 'This room is for ticket holders and the organiser')


def queue_change(db, event, actor, kind, changes):
    # Read recipients BEFORE updating; dependency failure must not lose an alert.
    recipients = {row['user_id'] for row in participant_ids(event.id)}
    db.add(EventAudit(event_id=event.id, actor_id=UUID(actor), kind=kind, changes=changes))
    message = f'The organiser updated {event.title}. Please review the latest event details.'
    for user_id in recipients:
        notice = Notice(id=uuid4(), user_id=UUID(user_id), event_id=event.id, kind=kind,
                        title=f'{event.title}: {kind.replace("_", " ")}', body=message)
        db.add(notice)
        db.add(MailOutbox(notice_id=notice.id, user_id=notice.user_id))


def notice_out(row):
    return {'id': str(row.id), 'title': row.title, 'body': row.body, 'kind': row.kind,
            'href': f'/event/{row.event_id}', 'created_at': row.created_at,
            'read_at': row.read_at}


@router.get('/locations')
def locations(q: str = Query(min_length=2, max_length=100)):
    from backend.shared.places import search
    return {'items': search(q), 'attribution': 'GeoNames, CC BY 4.0', 'coverage': 'towns and cities; not a street-address or postcode directory'}


@router.get('/notifications')
def notices(limit: int = Query(30, ge=1, le=100), authorization:str=Header(''), claims=Depends(identity), db: Session = Depends(get_db)):
    tickets=service_get('TICKETING','/tickets/user/'+claims['sub'],{'Authorization':authorization})
    for ticket in tickets:
        key=uuid5(NAMESPACE_URL,'newfind-booking:'+ticket['id'])
        event=db.get(Event,UUID(ticket['event_id']))
        if event and not db.get(Notice,key):
            db.add(Notice(id=key,user_id=UUID(claims['sub']),event_id=event.id,kind='ticket_issued',title='Your ticket is confirmed',body=event.title+' — open your dashboard to view the ticket and QR code.'))
    try:db.commit()
    except IntegrityError:db.rollback()
    query = db.query(Notice).filter(Notice.user_id == UUID(claims['sub']))
    return {'items': [notice_out(n) for n in query.order_by(Notice.created_at.desc()).limit(limit)],
            'unread_count': query.filter(Notice.read_at.is_(None)).count()}


@router.post('/notifications/read')
def mark_notices_read(claims=Depends(identity), db: Session = Depends(get_db)):
    db.query(Notice).filter(Notice.user_id == UUID(claims['sub']), Notice.read_at.is_(None)).update({'read_at': datetime.utcnow()})
    db.commit()
    return {'ok': True}


@router.post('/notifications/{notice_id}/read')
def mark_notice_read(notice_id: UUID, claims=Depends(identity), db: Session = Depends(get_db)):
    row = db.query(Notice).filter(Notice.id == notice_id, Notice.user_id == UUID(claims['sub'])).first()
    if not row:
        raise HTTPException(404, 'Notification not found')
    row.read_at = row.read_at or datetime.utcnow()
    db.commit()
    return {'ok': True}


@router.get('/rooms')
def rooms(authorization: str = Header(''), claims=Depends(identity), db: Session = Depends(get_db)):
    tickets = service_get('TICKETING', '/tickets/user/' + claims['sub'], {'Authorization': authorization})
    ids = {UUID(row['event_id']) for row in tickets}
    events = db.query(Event).filter((Event.organizer_id == UUID(claims['sub'])) | Event.id.in_(ids)).order_by(Event.start_date.desc()).limit(200).all()
    result = []
    for event in events:
        last = db.query(RoomRead).filter_by(event_id=event.id, user_id=UUID(claims['sub'])).first()
        unread = db.query(EventMessage).filter(EventMessage.event_id == event.id,
                                              EventMessage.user_id != UUID(claims['sub']))
        if last:
            unread = unread.filter(EventMessage.created_at > last.read_at)
        result.append({'id': str(event.id), 'name': event.title, 'unread_count': unread.count(),
                       'organizer': str(event.organizer_id) == claims['sub']})
    return result


class MessageInput(BaseModel):
    request_id: UUID | None = None
    content: str = Field(min_length=1, max_length=4000)


@router.get('/{event_id}/messages')
def messages(event_id: UUID, before: datetime | None = None, limit: int = Query(50, ge=1, le=100),
             claims=Depends(identity), db: Session = Depends(get_db)):
    event = event_or_404(db, event_id)
    require_member(event, claims)
    query = db.query(EventMessage).filter(EventMessage.event_id == event_id)
    if before:
        query = query.filter(EventMessage.created_at < before)
    rows = query.order_by(EventMessage.created_at.desc(), EventMessage.id.desc()).limit(limit).all()
    return [{'id': str(row.id), 'sender_id': str(row.user_id), 'name': row.name, 'content': row.content,
             'is_organizer': row.user_id == event.organizer_id, 'created_at': row.created_at} for row in reversed(rows)]


@router.post('/{event_id}/messages', status_code=201)
def post_message(event_id: UUID, data: MessageInput, claims=Depends(identity), db: Session = Depends(get_db)):
    event = event_or_404(db, event_id)
    require_member(event, claims)
    if not data.content.strip():
        raise HTTPException(422, 'Write a message first')
    if data.request_id:
        existing = db.get(EventMessage, data.request_id)
        if existing:
            if existing.user_id != UUID(claims['sub']) or existing.event_id != event_id or existing.content != data.content.strip():
                raise HTTPException(409, 'Message request already used')
            return {'id': str(existing.id)}
    # Identity is looked up on the server, never accepted from a message payload.
    profile = service_get('USER', '/users/' + claims['sub'])
    row = EventMessage(id=data.request_id or uuid4(), event_id=event_id, user_id=UUID(claims['sub']),
                       name=profile['full_name'], content=data.content.strip())
    db.add(row)
    try: db.commit()
    except IntegrityError:
        db.rollback()
        existing = db.get(EventMessage, data.request_id) if data.request_id else None
        if not existing or existing.user_id != UUID(claims['sub']) or existing.event_id != event_id or existing.content != data.content.strip():
            raise HTTPException(409, 'Message request already used')
        row = existing
    return {'id': str(row.id)}


@router.post('/{event_id}/messages/read')
def read_room(event_id: UUID, claims=Depends(identity), db: Session = Depends(get_db)):
    event = event_or_404(db, event_id)
    require_member(event, claims)
    row = db.query(RoomRead).filter_by(event_id=event_id, user_id=UUID(claims['sub'])).first()
    if not row:
        row = RoomRead(event_id=event_id, user_id=UUID(claims['sub']))
        db.add(row)
    row.read_at = datetime.utcnow()
    db.commit()
    return {'ok': True}


class AnnouncementInput(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1, max_length=8000)


@router.post('/{event_id}/announcements', status_code=201)
def announcement(event_id: UUID, data: AnnouncementInput, claims=Depends(identity), db: Session = Depends(get_db)):
    event = event_or_404(db, event_id)
    require_owner(event, claims)
    entry = {'id': str(uuid4()), 'title': data.title, 'body': data.body,
             'posted_at': datetime.utcnow().isoformat() + 'Z'}
    event.announcements = [entry, *event.announcements][:100]
    queue_change(db,event,claims['sub'],'announcement',{'title':data.title,'body':data.body})
    db.commit()
    return entry


def send_event_mail():
    from backend.shared.mail import ready, send
    from app.db.session import SessionLocal
    if not ready(): return
    with SessionLocal() as db:
        rows=db.query(MailOutbox).filter(MailOutbox.status=='pending',MailOutbox.next_attempt_at<=datetime.utcnow()).order_by(MailOutbox.next_attempt_at).limit(20).all()
        for row in rows:
            try:
                notice=db.get(Notice,row.notice_id)
                person=service_get('USER','/users/internal/attendee/'+str(row.user_id))
                link=os.environ['APP_PUBLIC_URL'].rstrip('/')+'/event/'+str(notice.event_id)
                send(person['email'],'NewFind: '+notice.title,notice.body+'\n\n'+link)
                row.status,row.sent_at='sent',datetime.utcnow()
            except Exception:
                attempts=int(row.attempts)+1
                row.attempts=str(attempts)
                row.next_attempt_at=datetime.utcnow()+timedelta(minutes=min(360,2**min(attempts,9)))
                if attempts>=24:row.status='failed'
            db.commit()


@router.get('/recommendations')
def recommendations(lat:float=Query(ge=-90,le=90),lng:float=Query(ge=-180,le=180),
                    radius:float=Query(200,ge=1,le=200),limit:int=Query(12,ge=1,le=50),
                    claims=Depends(identity),db:Session=Depends(get_db)):
    from app.api.event_endpoints import with_inventory,haversine
    profile=service_get('USER','/users/'+claims['sub'])
    interests={v.casefold() for v in profile.get('interests',[])}
    candidates=db.query(Event).filter(Event.status.in_([EventStatus.PUBLISHED,EventStatus.REGISTRATION_CLOSED]),Event.visibility=='public',Event.end_date>=datetime.utcnow()).all()
    ranked=[]
    for event in candidates:
        loc=event.location or {}
        try: distance=haversine(lat,lng,float(loc['latitude']),float(loc['longitude']))
        except (KeyError,ValueError,TypeError):continue
        if distance>radius or event.event_type=='Online':continue
        matches=interests.intersection({event.category.casefold(),*(tag.casefold() for tag in (event.tags or []))})
        ranked.append((len(matches),distance,event))
    ranked.sort(key=lambda row:(-row[0],row[1],row[2].start_date))
    items=with_inventory([r[2] for r in ranked[:limit]])
    for item,(score,distance,event) in zip(items,ranked):
        item['distance_km']=round(distance,1)
        if score:item['badge_types'].append('recommended')
        item['recommendation_reason']='Matches your saved interests' if score else 'Upcoming near your selected location'
    return items


def queue_community_event(db,event):
    if not event.community_id or event.visibility!='public' or event.status!=EventStatus.PUBLISHED:return
    group=service_get('USER',f'/users/communities/internal/{event.community_id}/members')
    for user_id in set(group['members'])-{str(event.organizer_id)}:
        key=uuid5(NAMESPACE_URL,'newfind-community-published:'+str(event.id)+':'+user_id)
        if db.get(Notice,key):continue
        notice=Notice(id=key,user_id=UUID(user_id),event_id=event.id,kind='community_event',title='New event in your community',body=event.title)
        db.add(notice);db.add(MailOutbox(notice_id=key,user_id=notice.user_id))
