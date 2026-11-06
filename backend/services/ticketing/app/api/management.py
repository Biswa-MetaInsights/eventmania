"""Organiser-owned attendee and admission operations, backed by PostgreSQL."""
import os
from uuid import UUID
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from zoneinfo import ZoneInfo
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import Column, String, DateTime
from sqlalchemy.types import Uuid
from uuid import uuid4
from app.db.session import get_db
from app.models.ticket import Ticket, TicketStatus, Base
from backend.shared.security import identity, internal

router = APIRouter(prefix='/tickets', tags=['Event operations'])
ACTIVE = (TicketStatus.VALID, TicketStatus.USED)

class AdmissionAudit(Base):
    __tablename__ = 'admission_audit'
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    ticket_id = Column(Uuid(as_uuid=True), index=True, nullable=False)
    event_id = Column(Uuid(as_uuid=True), index=True, nullable=False)
    actor_id = Column(Uuid(as_uuid=True), nullable=False)
    action = Column(String(20), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)



def service(service_name, path, params=None):
    try:
        response = httpx.get(os.environ[service_name + '_SERVICE_URL'] + path,
                            params=params, headers={'X-Internal-Key': os.environ['INTERNAL_API_KEY']}, timeout=8)
        if response.status_code == 404: raise HTTPException(404, 'Record not found')
        response.raise_for_status()
        return response.json()
    except (httpx.HTTPError, KeyError):
        raise HTTPException(503, 'A required service is temporarily unavailable')


def owned_event(event_id, claims):
    event = service('EVENT', f'/events/internal/{event_id}')
    if event['organizer_id'] != claims['sub']:
        raise HTTPException(403, 'Only the event organiser can manage attendance')
    return event


@router.get('/internal/event/{event_id}', dependencies=[Depends(internal)])
def internal_attendees(event_id: UUID, db: Session = Depends(get_db)):
    return [{'user_id': str(t.user_id), 'ticket_id': str(t.id)} for t in db.query(Ticket).filter(
        Ticket.event_id == event_id, Ticket.status.in_(ACTIVE)).all()]


@router.get('/organizer/{organizer_id}/attendees')
def attendees(organizer_id: UUID, event_id: UUID | None = None, offset: int = Query(0, ge=0),
              limit: int = Query(200, ge=1, le=500), q: str = Query('', max_length=200),
              claims=Depends(identity), db: Session = Depends(get_db)):
    if str(organizer_id) != claims['sub']: raise HTTPException(403, 'Organizer identity mismatch')
    # Use the private ownership query, never an unbounded public catalogue search.
    events = service('EVENT', f'/events/internal/organizer/{organizer_id}')
    event_map = {event['id']: event for event in events}
    if event_id and str(event_id) not in event_map: raise HTTPException(403, 'Event ownership required')
    ids = [event_id] if event_id else [UUID(i) for i in event_map]
    query = db.query(Ticket).filter(Ticket.event_id.in_(ids), Ticket.status.in_(ACTIVE))
    ordered = query.order_by(Ticket.purchased_at.desc(), Ticket.id)
    rows = ordered.all() if q else ordered.offset(offset).limit(limit).all()
    result = []
    profiles = {}
    for ticket in rows:
        user_id = str(ticket.user_id)
        if user_id not in profiles:
            profiles[user_id] = service('USER', '/users/internal/attendee/' + user_id)
        person = profiles[user_id]
        event = event_map[str(ticket.event_id)]
        name = person['full_name']
        row = {'id': str(ticket.id), 'eventId': str(ticket.event_id), 'name': name,
               'initials': ''.join(w[0] for w in name.split()[:2]), 'email': person.get('email', ''),
               'phone': '', 'ticket': (ticket.seat_info or {}).get('type', 'General Admission'),
               'paid': float(ticket.price_paid), 'currency': event['currency'],
               'booked': ticket.purchased_at.isoformat() + 'Z', 'status': 'Confirmed', 'repeat': '',
               'checked_in_at': ticket.checked_in_at, 'event_title': event['title']}
        if not q or q.casefold() in (name + ' ' + row['email'] + ' ' + event['title']).casefold(): result.append(row)
    return result[offset:offset+limit] if q else result


class CheckIn(BaseModel):
    qr_code_hash: str = Field(min_length=20, max_length=512)


@router.post('/check-in/{event_id}')
def check_in(event_id: UUID, data: CheckIn, claims=Depends(identity), db: Session = Depends(get_db)):
    event = owned_event(event_id, claims)
    if event['status'] in ('draft', 'cancelled'): raise HTTPException(409, 'This event is not admitting attendees')
    ticket = db.query(Ticket).filter(Ticket.event_id == event_id, Ticket.qr_code_hash == data.qr_code_hash).with_for_update().first()
    if not ticket: raise HTTPException(404, 'Ticket not found for this event')
    if ticket.status not in ACTIVE: raise HTTPException(409, 'Ticket is not valid for admission')
    already = ticket.checked_in_at is not None
    if not already:
        ticket.checked_in_at = datetime.utcnow()
        ticket.status = TicketStatus.USED
        db.add(AdmissionAudit(ticket_id=ticket.id, event_id=event_id, actor_id=UUID(claims['sub']), action='check_in'))
        db.commit()
    return {'id': str(ticket.id), 'checked_in_at': ticket.checked_in_at, 'already_checked_in': already}


@router.post('/check-in/{event_id}/{ticket_id}')
def manual_check_in(event_id: UUID, ticket_id: UUID, claims=Depends(identity), db: Session = Depends(get_db)):
    owned_event(event_id, claims)
    row = db.get(Ticket, ticket_id)
    if not row or row.event_id != event_id: raise HTTPException(404, 'Ticket not found')
    return check_in(event_id, CheckIn(qr_code_hash=row.qr_code_hash), claims, db)


@router.get('/qr/{ticket_id}')
def qr(ticket_id: UUID, claims=Depends(identity), db: Session = Depends(get_db)):
    row = db.get(Ticket, ticket_id)
    if not row or str(row.user_id) != claims['sub']: raise HTTPException(404, 'Ticket not found')
    import qrcode
    import qrcode.image.svg
    from io import BytesIO
    output = BytesIO()
    image = qrcode.make(row.qr_code_hash, image_factory=qrcode.image.svg.SvgPathImage)
    image.save(output)
    return Response(output.getvalue(), media_type='image/svg+xml', headers={
        'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'"})


@router.get('/organizer/{organizer_id}/overview')
def overview(organizer_id: UUID, claims=Depends(identity), db: Session = Depends(get_db)):
    if str(organizer_id) != claims['sub']: raise HTTPException(403, 'Organizer identity mismatch')
    events = service('EVENT', f'/events/internal/organizer/{organizer_id}')
    ids = [UUID(e['id']) for e in events]
    tickets = db.query(Ticket).filter(Ticket.event_id.in_(ids)).all()
    currencies = {}
    earnings = []
    now = datetime.utcnow()
    for event in events:
        rows = [t for t in tickets if str(t.event_id) == event['id'] and t.status in ACTIVE]
        gross = sum((t.price_paid for t in rows), Decimal(0))
        code = event['currency']
        currencies[code] = currencies.get(code, 0) + float(gross)
        earnings.append({'id': event['id'], 'title': event['title'], 'when': event['start_date'],
                         'tickets': len(rows), 'gross': float(gross), 'buyerFee': 0, 'refunds': 0,
                         'net': float(gross), 'currency': code})
    valid = [t for t in tickets if t.status in ACTIVE]
    checked = sum(t.checked_in_at is not None for t in valid)
    one_currency = next(iter(currencies)) if len(currencies) == 1 else None
    portfolio = {'eventsRun': len(events), 'live': sum(e['status'] == 'published' for e in events),
                 'drafts': sum(e['status'] == 'draft' for e in events), 'ticketsSold': len(valid),
                 'ticketsSoldThisWeek': sum(t.purchased_at >= now-timedelta(days=7) for t in valid),
                 'netRevenue': sum(currencies.values()) if one_currency else None,
                 'currency': one_currency, 'revenueByCurrency': currencies,
                 'checkInRate': round(100*checked/len(valid)) if valid else 0,
                 'checkedIn': checked, 'pastCapacity': len(valid), 'refunded': 0, 'refundedTickets': 0,
                 'avgTicket': float(sum((t.price_paid for t in valid), Decimal(0))/len(valid)) if valid and one_currency else None}
    upcoming = sorted([e for e in events if e['status'] in ('published', 'registration_closed') and datetime.fromisoformat(e['start_date']).replace(tzinfo=None) >= now], key=lambda e:e['start_date'])
    next_event = None
    if upcoming:
        event = upcoming[0]
        zone = ZoneInfo(event.get('timezone') or 'UTC')
        start = datetime.fromisoformat(event['start_date']).replace(tzinfo=timezone.utc)
        sold = [t for t in valid if str(t.event_id) == event['id']]
        next_event = {'eventId': event['id'], 'title': event['title'], 'when': event['start_date'],
                      'inDays': (start.astimezone(zone).date()-datetime.now(zone).date()).days,
                      'paid': float(event['price']) > 0, 'sold': len(sold), 'capacity': event['capacity'],
                      'revenue': sum(float(t.price_paid) for t in sold), 'checkedIn': sum(t.checked_in_at is not None for t in sold),
                      'refunds': 0, 'refundValue': 0, 'currency': event['currency']}
    return {'portfolio': portfolio, 'next': next_event, 'earnings': earnings}


@router.delete('/check-in/{event_id}/{ticket_id}')
def undo_check_in(event_id: UUID, ticket_id: UUID, claims=Depends(identity), db: Session = Depends(get_db)):
    owned_event(event_id, claims)
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id, Ticket.event_id == event_id).with_for_update().first()
    if not ticket: raise HTTPException(404, 'Ticket not found')
    if ticket.status not in ACTIVE: raise HTTPException(409, 'Ticket is not active')
    if ticket.checked_in_at is not None:
        db.add(AdmissionAudit(ticket_id=ticket.id, event_id=event_id, actor_id=UUID(claims['sub']), action='undo_check_in'))
    ticket.checked_in_at = None
    ticket.status = TicketStatus.VALID
    db.commit()
    return {'id': str(ticket.id), 'checked_in_at': None}
