import asyncio
import logging
from app.core.config import settings
from app.db.session import SessionLocal
from app.models.user_profile import UserProfile
from backend.shared.kafka_utils import KafkaManager
from typing import Dict, Any

logger = logging.getLogger(__name__)

async def handle_user_created(data: Dict[str, Any]):
    """
    Handle the 'user.created' event by initializing a user profile.
    """
    user_id = data.get("user_id")
    full_name = data.get("full_name")
    
    if not user_id or not full_name:
        logger.error(f"Malformed 'user.created' event data: {data}")
        return

    db = SessionLocal()
    try:
        # Check if profile already exists (idempotency)
        existing_profile = db.query(UserProfile).filter(UserProfile.id == user_id).first()
        if existing_profile:
            logger.info(f"Profile for user {user_id} already exists.")
            return

        new_profile = UserProfile(
            id=user_id,
            full_name=full_name
        )
        db.add(new_profile)
        db.commit()
        logger.info(f"Initialized profile for user {user_id} ({full_name}).")
    except Exception as e:
        logger.error(f"Failed to create profile for user {user_id}: {e}")
        db.rollback()
    finally:
        db.close()

async def start_listening():
    """
    Starts the Kafka consumer for the User Service.
    """
    kafka_manager = KafkaManager(bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS)
    await kafka_manager.consume_events(
        topic="user.created",
        group_id="user-service-group",
        callback=handle_user_created
    )

if __name__ == "__main__":
    # For standalone testing
    asyncio.run(start_listening())
