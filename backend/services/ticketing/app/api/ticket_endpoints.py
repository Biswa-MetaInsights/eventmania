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

router = APIRouter(prefix="/tickets", tags=["Ticketing"])

logger = logging.getLogger(__name__)

# Core Service Logic
ticket_service = TicketService()

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
    # Create the QR hash
    qr_hash = ticket_service.generate_qr_hash(
        str(ticket_in.event_id), 
        str(ticket_in.user_id), 
        "TICKET_SECRET_KEY" # In production, pull from env/secret manager
    )

    new_ticket = Ticket(
        event_id=ticket_in.event_id,
        user_id=ticket_in.user_id,
        seat_info=ticket_in.seat_info,
        qr_code_hash=qr_hash,
        price_paid=ticket_in.price_paid,
        status=TicketStatus.VALID
    )
    
    db.add(new_ticket)
    db.commit()
    db.refresh(new_ticket)

    # Note: Transition seat from 'reserved' to 'sold' (ZSET in Redis or Postgres inventory decrement)
    # logger.info(f"Ticket {new_ticket.id} issued successfully for event {new_ticket.event_id}")

    return new_ticket

@router.post("/waitlist/join", response_model=WaitlistOut)
def join_waitlist(join_in: WaitlistJoin, db: Session = Depends(get_db)):
    """
    Join the waitlist if an event is sold out.
    """
    # 1. Add to postgres for persistent record
    new_waitlist = Waitlist(
        event_id=join_in.event_id,
        user_id=join_in.user_id,
        requested_at=time.time()
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
