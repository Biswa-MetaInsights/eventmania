"""Small, sanitised image assets stored in the existing backed-up user database."""
import base64
import binascii
import warnings
from datetime import datetime
from io import BytesIO
from uuid import UUID, uuid4
from fastapi import APIRouter, Depends, HTTPException, Header, Response
from pydantic import BaseModel, Field
from sqlalchemy import Column, String, LargeBinary, DateTime, func
from sqlalchemy.types import Uuid
from sqlalchemy.orm import Session
from PIL import Image, UnidentifiedImageError
from app.db.session import get_db
from app.models.user_profile import Base
from backend.shared.security import identity

router = APIRouter(prefix='/users', tags=['Images'])
Image.MAX_IMAGE_PIXELS = 16000000

class ImageAsset(Base):
    __tablename__ = 'profile_image_assets'
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    owner_id = Column(Uuid(as_uuid=True), index=True, nullable=False)
    kind = Column(String(20), nullable=False)
    data = Column(LargeBinary, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class Upload(BaseModel):
    data_url: str = Field(max_length=1400000)
    kind: str = Field(pattern=r'^(avatar|event)$')

@router.post('/{user_id}/assets', status_code=201)
def upload(user_id: UUID, data: Upload, claims=Depends(identity), db: Session = Depends(get_db)):
    if str(user_id) != claims['sub']: raise HTTPException(403, 'Upload identity mismatch')
    if db.query(ImageAsset).filter(ImageAsset.owner_id == user_id).count() >= 200:
        raise HTTPException(409, 'Image quota reached; contact support')
    prefix, separator, encoded = data.data_url.partition(',')
    if not separator or prefix not in ('data:image/png;base64', 'data:image/jpeg;base64', 'data:image/webp;base64'):
        raise HTTPException(422, 'Upload a PNG, JPEG or WebP image')
    try:
        raw = base64.b64decode(encoded, validate=True)
        if len(raw) > 1024*1024: raise ValueError()
        with warnings.catch_warnings():
            warnings.simplefilter('error', Image.DecompressionBombWarning)
            with Image.open(BytesIO(raw)) as image:
                if image.format not in ('PNG', 'JPEG', 'WEBP') or image.width*image.height > 16000000:
                    raise ValueError()
                image.load()
                image = image.convert('RGB')
                image.thumbnail((320, 320) if data.kind == 'avatar' else (1280, 1280))
                output = BytesIO()
                image.save(output, format='JPEG', quality=85, optimize=True)
    except (ValueError, binascii.Error, OSError, UnidentifiedImageError, Image.DecompressionBombError, Image.DecompressionBombWarning):
        raise HTTPException(422, 'The image is invalid or too large')
    row = ImageAsset(owner_id=user_id, kind=data.kind, data=output.getvalue())
    db.add(row)
    db.commit()
    return {'url': '/api/user/assets/' + str(row.id), 'id': str(row.id)}

@router.get('/assets/{asset_id}')
def read_asset(asset_id: UUID, authorization: str = Header(''), db: Session = Depends(get_db)):
    row = db.get(ImageAsset, asset_id)
    if not row: raise HTTPException(404, 'Image not found')
    if row.kind == 'avatar' and identity(authorization)['sub'] != str(row.owner_id):
        raise HTTPException(404, 'Image not found')
    return Response(row.data, media_type='image/jpeg', headers={'X-Content-Type-Options': 'nosniff',
                    'Cache-Control': 'private, max-age=3600' if row.kind == 'avatar' else 'public, max-age=86400'})
