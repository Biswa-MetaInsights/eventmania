from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.community import Community
from app.schemas.community_schemas import CommunityCreate, CommunityOut
from typing import List, Optional
from uuid import UUID
import re

router = APIRouter(prefix="/users/communities", tags=["Communities"])


def _slugify(text: str) -> str:
    slug = text.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_-]+", "-", slug)
    slug = re.sub(r"^-+|-+$", "", slug)
    return slug


@router.post("/", response_model=CommunityOut, status_code=201)
def create_community(organizer_id: UUID, data: CommunityCreate, db: Session = Depends(get_db)):
    existing = db.query(Community).filter(Community.organizer_id == organizer_id).first()
    if existing:
        raise HTTPException(status_code=409, detail="You already have a community. Update it instead.")

    base_slug = _slugify(data.name)
    slug = base_slug
    counter = 1
    while db.query(Community).filter(Community.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1

    community = Community(
        organizer_id=organizer_id,
        slug=slug,
        **data.model_dump(),
    )
    db.add(community)
    db.commit()
    db.refresh(community)
    return community


@router.patch("/{community_id}", response_model=CommunityOut)
def update_community(community_id: UUID, data: CommunityCreate, organizer_id: UUID, db: Session = Depends(get_db)):
    community = db.query(Community).filter(Community.id == community_id).first()
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")
    if community.organizer_id != organizer_id:
        raise HTTPException(status_code=403, detail="Not your community")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(community, field, value)

    db.commit()
    db.refresh(community)
    return community


@router.get("/search", response_model=List[CommunityOut])
def search_communities(
    q: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    limit: int = Query(50),
    db: Session = Depends(get_db),
):
    query = db.query(Community)
    if q:
        query = query.filter(
            Community.name.ilike(f"%{q}%") | Community.description.ilike(f"%{q}%")
        )
    if category:
        query = query.filter(Community.category == category)
    return query.order_by(Community.created_at.desc()).limit(limit).all()


@router.get("/by-organizer/{organizer_id}", response_model=CommunityOut)
def get_community_by_organizer(organizer_id: UUID, db: Session = Depends(get_db)):
    community = db.query(Community).filter(Community.organizer_id == organizer_id).first()
    if not community:
        raise HTTPException(status_code=404, detail="No community found for this organizer")
    return community


@router.get("/{slug}", response_model=CommunityOut)
def get_community_by_slug(slug: str, db: Session = Depends(get_db)):
    community = db.query(Community).filter(Community.slug == slug).first()
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")
    return community
