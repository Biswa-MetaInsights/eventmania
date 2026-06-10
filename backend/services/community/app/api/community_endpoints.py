from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.community import Community
from app.schemas.community_schemas import CommunityCreate, CommunityOut
from typing import List, Optional
from uuid import UUID

router = APIRouter(prefix="/communities", tags=["Community Management"])

@router.post("/", response_model=CommunityOut, status_code=status.HTTP_201_CREATED)
def create_community(community_in: CommunityCreate, db: Session = Depends(get_db)):
    new_community = Community(**community_in.model_dump())
    db.add(new_community)
    db.commit()
    db.refresh(new_community)
    return new_community

@router.get("/search", response_model=List[CommunityOut])
def search_communities(
    q: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    status: Optional[str] = Query("active"),
    db: Session = Depends(get_db),
):
    query = db.query(Community).filter(Community.status == status)

    if q:
        query = query.filter(
            Community.name.ilike(f"%{q}%") | Community.description.ilike(f"%{q}%")
        )

    if category:
        query = query.filter(Community.category == category)

    results = query.order_by(Community.member_count.desc()).limit(100).all()

    # Filter by city against location["city"]. Done in Python so it works
    # identically on SQLite (dev) and Postgres (prod) without JSON-path SQL.
    if city:
        city_l = city.strip().lower()
        results = [
            c for c in results
            if isinstance(c.location, dict)
            and str(c.location.get("city", "")).strip().lower() == city_l
        ]

    return results

@router.get("/{community_id}", response_model=CommunityOut)
def get_community(community_id: UUID, db: Session = Depends(get_db)):
    community = db.query(Community).filter(Community.id == community_id).first()
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")
    return community
