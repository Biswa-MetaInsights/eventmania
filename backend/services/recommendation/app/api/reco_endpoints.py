import asyncio
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.services.recommendation_logic import recommendation_logic
from app.services.ai_event_generator import ai_event_generator
from app.services.ticketmaster_ingestion import ticketmaster_ingestion
from uuid import UUID
from typing import List, Optional, Set

# Keep strong references so tasks aren't GC'd before completion
_background_tasks: Set[asyncio.Task] = set()

router = APIRouter(prefix="/recommendations", tags=["AI Recommendations"])

logger = logging.getLogger(__name__)

@router.get("/for-you", response_model=List[dict])
async def get_personalized_recommendations(user_id: UUID, db: Optional[str] = None):
    """
    Get AI-powered personalized event suggestions for a user.
    Integrates with User profiles and current Event metadata.
    """
    try:
        recommendations = await recommendation_logic.generate_recommendations(str(user_id))
        
        if not recommendations:
            # Fallback to general popular events from Event Service
            pass

        return recommendations
    except Exception as e:
        logger.error(f"Error fetching recommendations: {e}")
        raise HTTPException(status_code=500, detail="Internal AI error")

@router.get("/trending", response_model=List[dict])
async def get_trending_events():
    """
    General trending events based on platform-wide ticket sales and searches.
    """
    return []

@router.post("/refresh/{user_id}", status_code=status.HTTP_202_ACCEPTED)
async def refresh_recommendations(user_id: UUID):
    return {"msg": "Recommendation re-calculation task started."}


@router.post("/ingest-city", status_code=status.HTTP_202_ACCEPTED)
async def ingest_ticketmaster_events(
    city: str = Query(..., description="City name"),
    lat: float = Query(..., description="City latitude"),
    lng: float = Query(..., description="City longitude"),
    radius: int = Query(100, description="Radius in km"),
):
    """
    Fetch real events from Ticketmaster for a city and save them to the event service.
    Returns immediately — ingestion runs in background.
    """
    result = await ticketmaster_ingestion.ingest(city, lat, lng, radius)
    return {"msg": f"Fetched {result.get('created', 0)} real events for {city}.", **result}


@router.post("/generate-events", status_code=status.HTTP_202_ACCEPTED)
async def generate_events_for_city(
    city: str = Query(..., description="City name"),
    lat: float = Query(..., description="City latitude"),
    lng: float = Query(..., description="City longitude"),
):
    """
    Use GPT-4o to generate realistic local events for a city.
    Fires as an async task — returns immediately while generation runs in background.
    """
    task = asyncio.create_task(ai_event_generator.generate_and_save(city, lat, lng))
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)
    return {"msg": f"Generating events for {city}. Check back in a few seconds."}
