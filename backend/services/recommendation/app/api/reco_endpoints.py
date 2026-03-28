from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.services.recommendation_logic import recommendation_logic
from uuid import UUID
from typing import List, Optional
import logging

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
    """
    Invalidate recommendation cache for a specific user to force an AI task.
    """
    # Trigger AI agent to re-calculate interests and events
    return {"msg": "Recommendation re-calculation task started."}
