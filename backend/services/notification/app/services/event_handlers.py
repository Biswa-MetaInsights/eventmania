import asyncio
import logging
from app.services.notification_service import notification_service
from typing import Dict, Any

logger = logging.getLogger(__name__)

async def handle_user_created(data: Dict[str, Any]):
    """
    Handle 'user.created' event: Send Welcome Email.
    """
    to_email = data.get("email")
    full_name = data.get("full_name")
    
    if not to_email:
        return

    logger.info(f"Handling user.created for {to_email}...")
    await notification_service.send_email(
        to_email=to_email,
        subject="Welcome to Biswa Event Platform!",
        template_name="welcome.html",
        context={"user_name": full_name}
    )

async def handle_ticket_issued(data: Dict[str, Any]):
    """
    Handle 'ticket.issued' event: Send Ticket Confirmation with QR Hash info.
    """
    to_email = data.get("email")
    event_title = data.get("event_title")
    qr_hash = data.get("qr_hash")
    
    if not to_email or not qr_hash:
        return

    logger.info(f"Handling ticket.issued for {to_email} on event {event_title}...")
    await notification_service.send_email(
        to_email=to_email,
        subject=f"Your Ticket for {event_title} is Ready!",
        template_name="ticket_confirmation.html",
        context={"event_title": event_title, "qr_hash": qr_hash}
    )

async def handle_payment_failed(data: Dict[str, Any]):
    """
    Handle 'payment.failed' event: Send Alert to the user.
    """
    to_email = data.get("email")
    if not to_email:
        return

    logger.info(f"Handling payment.failed for {to_email}...")
    await notification_service.send_email(
        to_email=to_email,
        subject="Payment Failed: Update your details",
        template_name="payment_failed.html",
        context={}
    )
