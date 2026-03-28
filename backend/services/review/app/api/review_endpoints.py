from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.review import Review
from app.schemas.review_schemas import ReviewCreate, ReviewOut, ReviewAggregates
from app.services.review_logic import ReviewService
from uuid import UUID
from typing import List, Optional
import logging

router = APIRouter(prefix="/reviews", tags=["Review & Rating"])

logger = logging.getLogger(__name__)

# Core Service Logic
review_service = ReviewService()

@router.post("/", response_model=ReviewOut, status_code=status.HTTP_201_CREATED)
async def create_review(review_in: ReviewCreate, db: Session = Depends(get_db)):
    """
    Step 1: Check eligibility (User must have purchased/attended).
    Step 2: Add review (Default is_public = False for async AI Moderation check).
    """
    is_verified = await review_service.verify_attendance(str(review_in.user_id), str(review_in.event_id))
    
    if not is_verified:
        raise HTTPException(
            status_code=403, 
            detail="Forbidden: You are not verified to review this event."
        )

    new_review = Review(
        **review_in.model_dump(),
        is_verified_purchase=is_verified,
        is_public=True # For the MVP, we'll mark as public. In a production flow, set as False.
    )
    
    db.add(new_review)
    db.commit()
    db.refresh(new_review)

    # 3. Publish for AI Moderation (Agent Task trigger)
    # logger.info(f"Review {new_review.id} added, triggering AI Moderation check...")
    # asyncio.create_task(publish_to_kafka(...))

    return new_review

@router.get("/event/{event_id}", response_model=List[ReviewOut])
def get_event_reviews(event_id: UUID, db: Session = Depends(get_db), limit: int = 20):
    """
    Retrieve all public reviews for a specific event.
    """
    return db.query(Review).filter(Review.event_id == event_id, Review.is_public == True).order_by(Review.created_at.desc()).limit(limit).all()

@router.get("/event/{event_id}/aggregates", response_model=ReviewAggregates)
def get_event_rating_aggregates(event_id: UUID, db: Session = Depends(get_db)):
    """
    Fetch the average rating and count for an event for the UI summary.
    """
    return review_service.get_event_aggregates(str(event_id), db)

@router.delete("/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_review(review_id: UUID, user_id: UUID, db: Session = Depends(get_db)):
    """
    Allow users to remove their own reviews.
    """
    review = db.query(Review).filter(Review.id == review_id, Review.user_id == user_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found or unauthorized.")
    
    db.delete(review)
    db.commit()
    return None
