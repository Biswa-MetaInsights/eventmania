"""Community membership is durable and caller-scoped on the existing user service."""
import re
from datetime import datetime
from uuid import UUID, uuid4
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import Column, String, DateTime, Integer, Text, UniqueConstraint, func
from sqlalchemy.types import Uuid
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.db.session import get_db
from app.models.community import Community, Base
from app.models.organizer_profile import OrganizerProfile
from app.models.user_profile import UserProfile
from backend.shared.security import identity, internal

router = APIRouter(prefix='/users/communities', tags=['Communities'])

class CommunityMember(Base):
    __tablename__ = 'community_members'
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    community_id = Column(Uuid(as_uuid=True), index=True, nullable=False)
    user_id = Column(Uuid(as_uuid=True), index=True, nullable=False)
    joined_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    __table_args__ = (UniqueConstraint('community_id','user_id'),)

class CommunityReview(Base):
    __tablename__ = 'community_reviews'
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    community_id = Column(Uuid(as_uuid=True), index=True, nullable=False)
    user_id = Column(Uuid(as_uuid=True), nullable=False)
    rating = Column(Integer, nullable=False)
    comment = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    __table_args__ = (UniqueConstraint('community_id','user_id'),)

class CommunityInput(BaseModel):
    name: str = Field(min_length=3, max_length=200)
    description: str = Field('', max_length=20000)
    category: str = Field('General', max_length=100)
    website: str | None = Field(None, max_length=500)
    location: dict = Field(default_factory=dict)
    price: float = Field(0, ge=0, le=0)


def group(db, key):
    row = db.query(Community).filter(Community.slug == key).first()
    if not row:
        try: row = db.get(Community, UUID(key))
        except ValueError: pass
    if not row: raise HTTPException(404, 'Community not found')
    return row


def out(db, row):
    return {'id': str(row.id), 'organizer_id': str(row.organizer_id), 'name': row.name, 'slug': row.slug,
            'description': row.description, 'category': row.category, 'website': row.website,
            'location': row.location or {}, 'member_count': db.query(CommunityMember).filter_by(community_id=row.id).count(),
            'price': 0, 'status': 'active', 'created_at': row.created_at, 'updated_at': row.updated_at}


@router.post('/', status_code=201)
def create(data: CommunityInput, organizer_id: UUID | None = None, claims=Depends(identity), db: Session = Depends(get_db)):
    user_id = UUID(claims['sub'])
    if organizer_id and organizer_id != user_id: raise HTTPException(403, 'Organizer identity mismatch')
    if not db.query(OrganizerProfile).filter_by(user_id=user_id).first(): raise HTTPException(403, 'Organiser onboarding is required')
    if db.query(Community).filter_by(organizer_id=user_id).first(): raise HTTPException(409, 'You already have a community')
    base = re.sub(r'[^\w-]+', '-', data.name.casefold()).strip('-')[:150] or 'community'
    slug = base + '-' + uuid4().hex[:8]
    row = Community(id=uuid4(), organizer_id=user_id, slug=slug, **data.model_dump(exclude={'price'}))
    db.add(row)
    db.add(CommunityMember(community_id=row.id, user_id=user_id))
    db.commit()
    return out(db,row)


@router.get('/search')
def search(q: str = Query('', max_length=200), category: str | None = None,
           offset: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=200), db: Session = Depends(get_db)):
    query = db.query(Community)
    if q: query=query.filter(Community.name.ilike('%'+q+'%') | Community.description.ilike('%'+q+'%'))
    if category: query=query.filter(Community.category == category)
    return [out(db,row) for row in query.order_by(Community.created_at.desc()).offset(offset).limit(limit)]


@router.get('/by-organizer/{organizer_id}')
def by_organizer(organizer_id: UUID, db: Session = Depends(get_db)):
    row = db.query(Community).filter_by(organizer_id=organizer_id).first()
    if not row: raise HTTPException(404, 'Community not found')
    return out(db,row)


@router.get('/internal/{community_id}/members', dependencies=[Depends(internal)])
def internal_members(community_id: UUID, db: Session = Depends(get_db)):
    row = group(db,str(community_id))
    return {'organizer_id': str(row.organizer_id), 'members': [str(m.user_id) for m in db.query(CommunityMember).filter_by(community_id=row.id)]}


@router.get('/{key}/members/me')
def membership(key: str, claims=Depends(identity), db: Session = Depends(get_db)):
    row=group(db,key)
    return {'joined': bool(db.query(CommunityMember).filter_by(community_id=row.id,user_id=UUID(claims['sub'])).first()),
            'owner': str(row.organizer_id)==claims['sub']}


@router.post('/{key}/members')
def join(key: str, claims=Depends(identity), db: Session = Depends(get_db)):
    row=group(db,key)
    if not db.query(CommunityMember).filter_by(community_id=row.id,user_id=UUID(claims['sub'])).first():
        db.add(CommunityMember(community_id=row.id,user_id=UUID(claims['sub'])))
        try: db.commit()
        except IntegrityError: db.rollback()  # concurrent identical joins are idempotent
    return {'joined': True, 'member_count': out(db,row)['member_count']}


@router.delete('/{key}/members')
def leave(key: str, claims=Depends(identity), db: Session = Depends(get_db)):
    row=group(db,key)
    if str(row.organizer_id)==claims['sub']: raise HTTPException(409, 'The organiser cannot leave their own community')
    db.query(CommunityMember).filter_by(community_id=row.id,user_id=UUID(claims['sub'])).delete()
    db.commit()
    return {'joined': False,'member_count':out(db,row)['member_count']}


class ReviewInput(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str = Field(min_length=5, max_length=4000)


@router.get('/{key}/reviews')
def reviews(key: str, db: Session = Depends(get_db)):
    row=group(db,key)
    query=db.query(CommunityReview).filter_by(community_id=row.id)
    count=query.count()
    average=db.query(func.avg(CommunityReview.rating)).filter_by(community_id=row.id).scalar()
    return {'count':count,'average_rating':float(average) if average is not None else None,
            'items':[{'id':str(r.id),'rating':r.rating,'comment':r.comment,'created_at':r.created_at,
                      'name': (db.get(UserProfile,r.user_id).full_name if db.get(UserProfile,r.user_id) else 'Community member')}
                     for r in query.order_by(CommunityReview.created_at.desc()).limit(50)]}


@router.post('/{key}/reviews', status_code=201)
def post_review(key: str, data: ReviewInput, claims=Depends(identity), db: Session = Depends(get_db)):
    row=group(db,key)
    if str(row.organizer_id)==claims['sub']: raise HTTPException(403, 'Organisers cannot review their own community')
    member=db.query(CommunityMember).filter_by(community_id=row.id,user_id=UUID(claims['sub'])).first()
    if not member: raise HTTPException(403, 'Join the community before reviewing it')
    review=db.query(CommunityReview).filter_by(community_id=row.id,user_id=member.user_id).first()
    if review: raise HTTPException(409, 'You have already reviewed this community')
    db.add(CommunityReview(community_id=row.id,user_id=member.user_id,**data.model_dump()))
    db.commit()
    return {'message':'Review published'}


@router.patch('/{key}')
def update(key: str, data: CommunityInput, claims=Depends(identity), db: Session = Depends(get_db)):
    row=group(db,key)
    if str(row.organizer_id)!=claims['sub']: raise HTTPException(403, 'Community ownership required')
    for field,value in data.model_dump(exclude_unset=True,exclude={'price'}).items():setattr(row,field,value)
    db.commit()
    return out(db,row)


@router.get('/{key}')
def detail(key: str, db: Session = Depends(get_db)):
    return out(db,group(db,key))
