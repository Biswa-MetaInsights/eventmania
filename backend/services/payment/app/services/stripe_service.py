import stripe
from app.core.config import settings
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

# Initialize Stripe with API Key
stripe.api_key = settings.STRIPE_SECRET_KEY

class StripeService:
    @staticmethod
    def create_payment_intent(amount_cents: int, currency: str = "usd", metadata: Optional[Dict[str, Any]] = None) -> stripe.PaymentIntent:
        """
        Creates a payment intent on Stripe for a checkout session.
        This provides a 'client_secret' for the client to complete the payment via Stripe Elements or a checkout page.
        """
        try:
            intent = stripe.PaymentIntent.create(
                amount=amount_cents,
                currency=currency,
                metadata=metadata,
                automatic_payment_methods={"enabled": True},
            )
            logger.info(f"Stripe Payment Intent created: {intent.id}")
            return intent
        except stripe.error.StripeError as e:
            logger.error(f"Stripe Error: {e.user_message}")
            raise Exception(f"Failed to create Stripe payment intent: {e.user_message}")

    @staticmethod
    def construct_webhook_event(payload: bytes, sig_header: str) -> stripe.Event:
        """
        Parses and verifies a Stripe webhook payload.
        Ensures the request actually came from Stripe and not an attacker.
        """
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
            return event
        except ValueError as e:
            # Invalid payload
            raise Exception("Invalid payload")
        except stripe.error.SignatureVerificationError as e:
            # Invalid signature
            raise Exception("Invalid signature")
