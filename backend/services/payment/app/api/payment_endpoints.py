from fastapi import APIRouter, Depends, HTTPException, status, Header, Request
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.payment import PaymentIntent, PaymentStatus
from app.schemas.payment_schemas import PaymentCreate, PaymentOut, WebhookHandled
from app.services.stripe_service import StripeService
from uuid import UUID
import stripe
import logging

router = APIRouter(prefix="/payments", tags=["Payment Management"])

logger = logging.getLogger(__name__)

# Core Service Logic
stripe_service = StripeService()

@router.post("/create-intent", response_model=PaymentOut, status_code=status.HTTP_201_CREATED)
def create_payment_intent(payment_in: PaymentCreate, db: Session = Depends(get_db)):
    """
    Step 1: Create a Stripe Payment Intent during the checkout flow.
    The client receives a 'client_secret' to finalize the transaction in their UI.
    """
    # 1. Create a Payment Intent on Stripe
    try:
        # Amount must be in cents/local currency units
        amount_cents = int(payment_in.amount * 100)
        metadata = {
            "user_id": str(payment_in.user_id),
            "event_id": str(payment_in.event_id),
            "seat_id": str(payment_in.metadata.get("seat_id", ""))
        }
        
        stripe_intent = stripe_service.create_payment_intent(
            amount_cents=amount_cents,
            currency=payment_in.currency,
            metadata=metadata
        )

        # 2. Persist the tracking intent in our DB
        new_intent = PaymentIntent(
            user_id=payment_in.user_id,
            event_id=payment_in.event_id,
            stripe_intent_id=stripe_intent.id,
            client_secret=stripe_intent.client_secret,
            amount=payment_in.amount,
            currency=payment_in.currency,
            status=PaymentStatus.PENDING,
            metadata_json=payment_in.metadata
        )
        db.add(new_intent)
        db.commit()
        db.refresh(new_intent)

        return new_intent

    except Exception as e:
        logger.error(f"Failed to process payment creation: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/webhook", response_model=WebhookHandled)
async def stripe_webhook(request: Request, stripe_signature: str = Header(None), db: Session = Depends(get_db)):
    """
    Step 2: Listens for Stripe Webhooks for real-time payment status updates.
    Updates intent status and triggers event-driven ticket issuance.
    """
    payload = await request.body()
    try:
        event = stripe_service.construct_webhook_event(payload, stripe_signature)
    except Exception as d:
        raise HTTPException(status_code=400, detail="Invalid signature")

    logger.info(f"Received webhook event from Stripe: {event.type}")

    # Handle completion logic
    if event.type == "payment_intent.succeeded":
        stripe_intent = event.data.object
        logger.info(f"Payment intent {stripe_intent.id} succeeded.")
        
        # 1. Update DB record to SUCCEEDED
        intent_record = db.query(PaymentIntent).filter(PaymentIntent.stripe_intent_id == stripe_intent.id).first()
        if intent_record:
            intent_record.status = PaymentStatus.SUCCEEDED
            db.add(intent_record)
            db.commit()

            # 2. Publish 'PaymentSucceeded' event for Ticketing service to issue tickets
            # asyncio.create_task(kafka_manager.send_event("payment.succeeded", {"intent_id": str(intent_record.id), "user_id": str(intent_record.user_id)}))

    elif event.type == "payment_intent.payment_failed":
        stripe_intent = event.data.object
        logger.warning(f"Payment intent {stripe_intent.id} failed.")
        
        # 1. Update DB record to FAILED
        intent_record = db.query(PaymentIntent).filter(PaymentIntent.stripe_intent_id == stripe_intent.id).first()
        if intent_record:
            intent_record.status = PaymentStatus.FAILED
            db.add(intent_record)
            db.commit()

            # 2. Publish 'PaymentFailed' event to release seat locks if any
            # asyncio.create_task(kafka_manager.send_event("payment.failed", {"intent_id": str(intent_record.id)}))

    return WebhookHandled(msg="Processed")
