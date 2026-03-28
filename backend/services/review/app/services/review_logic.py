import httpx
import logging
from app.core.config import settings
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.review import Review

logger = logging.getLogger(__name__)

class ReviewService:
    @staticmethod
    async def verify_attendance(user_id: str, event_id: str) -> bool:
        """
        Calls the Ticketing Service to check if the user has an 'USED' or 'VALID' ticket for this event.
        """
        async with httpx.AsyncClient() as client:
            try:
                # Optimized for microservices: Use an internal-only verification endpoint
                response = await client.get(f"{settings.TICKETING_SERVICE_URL}/tickets/user/{user_id}")
                if response.status_code == 200:
                    tickets = response.json()
                    # If user has a ticket matching this event, they are verified
                    return any(t.get("event_id") == event_id for t in tickets)
                return False
            except Exception as e:
                logger.error(f"Failed to verify attendance in Ticketing Service: {e}")
                return False

    @staticmethod
    def get_event_aggregates(event_id: str, db: Session) -> Dict[str, Any]:
        """
        Calculate the average rating and total counts for an event.
        """
        result = db.query(
            func.avg(Review.rating).label("average"),
            func.count(Review.id).label("count")
        ).filter(Review.event_id == event_id, Review.is_public == True).first()

        return {
            "average_rating": round(float(result.average), 1) if result.average else 0.0,
            "review_count": int(result.count) if result.count else 0
        }

    # Internal logic for triggering AI moderation asynchronously
    # @staticmethod
    # async def trigger_ai_moderation(review_id: str, content: str):
    #     # Publish to Kafka 'review.created' topic for Moderation Agent consumption
