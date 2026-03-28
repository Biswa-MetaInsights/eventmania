import httpx
import logging
from app.core.config import settings
from typing import List, Dict, Any
import redis
import json

logger = logging.getLogger(__name__)

class RecommendationService:
    def __init__(self):
        # Initialize Redis for caching user-specific recommendations
        self.r = redis.Redis(host=settings.REDIS_HOST, port=settings.REDIS_PORT, decode_responses=True)

    async def get_user_profile(self, user_id: str) -> Dict[str, Any]:
        """
        Fetch user interests and past events from the User Service.
        """
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(f"{settings.USER_SERVICE_URL}/users/{user_id}")
                return response.json() if response.status_code == 200 else {}
            except Exception as e:
                logger.error(f"Failed to fetch user profile {user_id}: {e}")
                return {}

    async def get_all_published_events(self) -> List[Dict[str, Any]]:
        """
        Fetch current events from the Event Service for correlation.
        """
        async with httpx.AsyncClient() as client:
            try:
                # Query published events with a basic limit for now
                response = await client.get(f"{settings.EVENT_SERVICE_URL}/events/search?status=published")
                return response.json() if response.status_code == 200 else []
            except Exception as e:
                logger.error(f"Failed to fetch published events: {e}")
                return []

    async def generate_recommendations(self, user_id: str) -> List[Dict[str, Any]]:
        """
        The core logic (Orchestrating the Agentic Reasoning).
        1. Check Cache
        2. Fetch Data
        3. Trigger CrewAI Agent (or use a pre-calculated model)
        4. Cache Result
        """
        # 1. Check Redis Cache first (for low latency Discovery Page)
        cache_key = f"reco:{user_id}"
        cached_reco = self.r.get(cache_key)
        if cached_reco:
            return json.loads(cached_reco)

        # 2. Fetch required data context
        user_profile = await self.get_user_profile(user_id)
        events = await self.get_all_published_events()
        
        if not user_profile or not events:
            return []

        # 3. Simulate Agentic Logic (CrewAI Recommendation Agent)
        # In a full flow, we'd trigger the Agent Service or run a CrewAI task here.
        # For the MVP, we'll perform a basic interest matching (Content-base).
        interests = set(user_profile.get("interests", []))
        recommended = []
        
        for event in events:
            event_category = event.get("category", "")
            # If user interests match event category, add it
            if event_category in interests:
                recommended.append(event)
            elif any(interest.lower() in event.get("description", "").lower() for interest in interests):
                recommended.append(event)

        # 4. Cache the result for 1 hour
        if recommended:
            self.r.set(cache_key, json.dumps(recommended), ex=3600)

        return recommended

recommendation_logic = RecommendationService()
