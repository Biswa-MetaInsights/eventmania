from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.ticket import Ticket, TicketStatus, Waitlist
from app.schemas.ticket_schemas import TicketCreate, TicketOut, WaitlistJoin, WaitlistOut
from app.services.ticket_service import TicketService
from uuid import UUID
from typing import List, Optional
import time
import logging
import os
import hashlib
import secrets
from datetime import datetime
import httpx
from pydantic import BaseModel, Field
from sqlalchemy import text, func

router = APIRouter(prefix="/tickets", tags=["Ticketing"])

logger = logging.getLogger(__name__)

# Core Service Logic
ticket_service = TicketService()

class BookingCreate(BaseModel):
    event_id: UUID
    user_id: UUID
    quantity: int = Field(default=1, ge=1, le=10)
    request_id: UUID

@router.get("/counts")
def booking_counts(event_id: List[UUID] = Query([]), db: Session = Depends(get_db)):
    if len(event_id) > 200:
        raise HTTPException(422, "At most 200 events per request")
    rows = db.query(Ticket.event_id, func.count(Ticket.id)).filter(
        Ticket.event_id.in_(event_id), Ticket.status == TicketStatus.VALID
    ).group_by(Ticket.event_id).all()
    return {str(event): count for event, count in rows}

@router.post("/book", response_model=List[TicketOut], status_code=201)
def book_free_event(data: BookingCreate, db: Session = Depends(get_db)):
    # Serialize inventory checks across all workers for this event. The lock is
    # transaction-scoped, so errors and process exits release it automatically.
    if db.bind.dialect.name == "postgresql":
        lock = int.from_bytes(hashlib.sha256(data.event_id.bytes).digest()[:8], "big", signed=True)
        db.execute(text("SELECT pg_advisory_xact_lock(:key)"), {"key": lock})
    try:
        result = httpx.get(os.environ["EVENT_SERVICE_URL"] + f"/events/internal/{data.event_id}",
                           headers={"X-Internal-Key": os.environ["INTERNAL_API_KEY"]}, timeout=5)
        if result.status_code == 404:
            raise HTTPException(404, "Event not found")
        result.raise_for_status()
        event = result.json()
    except (httpx.HTTPError, KeyError):
        raise HTTPException(503, "Event service unavailable")
    if event.get("source", "native") != "native":
        raise HTTPException(409, "Book this external event with its original ticket provider")
    if event["status"] != "published" or datetime.fromisoformat(event["start_date"]).replace(tzinfo=None) <= datetime.utcnow():
        raise HTTPException(409, "Event is not open for booking")
    if float(event["price"]) != 0:
        raise HTTPException(503, "Paid bookings are disabled until test payments are configured")
    if event["organizer_id"] == str(data.user_id):
        raise HTTPException(403, "You cannot book your own event")
    prior = db.query(Ticket).filter(Ticket.validation_key == str(data.request_id)).all()
    if prior:
        if any(t.user_id != data.user_id or t.event_id != data.event_id for t in prior):
            raise HTTPException(409, "Booking request already used")
        return prior
    sold = db.query(Ticket).filter(Ticket.event_id == data.event_id, Ticket.status == TicketStatus.VALID).count()
    if event["capacity"] > 0 and sold + data.quantity > event["capacity"]:
        raise HTTPException(409, "Not enough tickets remaining")
    tickets = [Ticket(event_id=data.event_id, user_id=data.user_id,
                      seat_info={"type": "General Admission"}, price_paid=0,
                      qr_code_hash=secrets.token_hex(32), validation_key=str(data.request_id), status=TicketStatus.VALID)
               for i in range(data.quantity)]
    db.add_all(tickets)
    db.commit()
    for ticket in tickets:
        db.refresh(ticket)
    return tickets

@router.post("/reserve-seat", status_code=status.HTTP_201_CREATED)
def reserve_seat(event_id: UUID, seat_id: str, user_id: UUID):
    """
    Step 1: Reserve a seat during checkout.
    If already taken, tell the user to try another or join waitlist.
    """
    success = ticket_service.reserve_seat(str(event_id), seat_id, str(user_id))
    if not success:
        raise HTTPException(
            status_code=409, 
            detail=f"Seat {seat_id} is currently being held or sold out. Please try another or join waitlist."
        )
    return {"msg": f"Seat {seat_id} reserved for 10 minutes.", "id": seat_id}

@router.post("/issue", response_model=TicketOut, status_code=status.HTTP_201_CREATED)
def issue_ticket(ticket_in: TicketCreate, db: Session = Depends(get_db)):
    """
    Step 2: After payment success, issue the final ticket.
    This generates the secure QR hash and marks the seat as permanently sold.
    """
    raise HTTPException(503, "Use the validated booking endpoint")
@router.post("/waitlist/join", response_model=WaitlistOut)
def join_waitlist(join_in: WaitlistJoin, db: Session = Depends(get_db)):
    """
    Join the waitlist if an event is sold out.
    """
    # 1. Add to postgres for persistent record
    new_waitlist = Waitlist(
        event_id=join_in.event_id,
        user_id=join_in.user_id,
        requested_at=datetime.utcnow()
    )
    db.add(new_waitlist)
    db.commit()

    # 2. Add to Redis for fast queue management
    position = ticket_service.add_to_waitlist(str(join_in.event_id), str(join_in.user_id), time.time())
    
    return WaitlistOut(event_id=join_in.event_id, user_id=join_in.user_id, position=position)

@router.get("/user/{user_id}", response_model=List[TicketOut])
def get_user_tickets(user_id: UUID, db: Session = Depends(get_db)):
    """
    Fetch all valid tickets for a specific user.
    """
    return db.query(Ticket).filter(Ticket.user_id == user_id, Ticket.status == TicketStatus.VALID).all()
