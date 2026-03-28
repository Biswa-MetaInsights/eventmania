import qrcode
import io
import hashlib
import uuid
import redis
from app.core.config import settings
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

class TicketService:
    def __init__(self):
        # Initialize Redis for seat locking and waitlist management
        self.r = redis.Redis(
            host=settings.REDIS_HOST, 
            port=settings.REDIS_PORT, 
            decode_responses=True
        )

    def generate_qr_hash(self, event_id: str, user_id: str, secret_key: str) -> str:
        """
        Generates a unique QR hash for a ticket.
        In a real-world scenario, this would be an HMAC or signed JWT.
        """
        raw_data = f"{event_id}-{user_id}-{secret_key}-{uuid.uuid4()}"
        return hashlib.sha256(raw_data.encode()).hexdigest()

    def reserve_seat(self, event_id: str, seat_id: str, user_id: str, expiry_seconds: int = 600) -> bool:
        """
        Try to reserve a seat in Redis with an expiry (TTL).
        Returns True if successful, False if already reserved.
        """
        key = f"seat_lock:{event_id}:{seat_id}"
        # Atomic set if not exists (NX) with expiry (EX)
        result = self.r.set(key, user_id, ex=expiry_seconds, nx=True)
        return bool(result)

    def release_seat(self, event_id: str, seat_id: str):
        """
        Release a seat lock if the payment fails or order expires.
        """
        key = f"seat_lock:{event_id}:{seat_id}"
        self.r.delete(key)

    def get_waitlist_position(self, event_id: str, user_id: str) -> Optional[int]:
        """
        Get current position on the waitlist for an event.
        Uses Redis Sorted Sets (ZSET) to maintain queue position by timestamp.
        """
        key = f"waitlist:{event_id}"
        pos = self.r.zrank(key, user_id)
        return pos + 1 if pos is not None else None

    def add_to_waitlist(self, event_id: str, user_id: str, timestamp: float) -> int:
        """
        Add a user to the waitlist.
        """
        key = f"waitlist:{event_id}"
        self.r.zadd(key, {user_id: timestamp})
        return self.get_waitlist_position(event_id, user_id)
