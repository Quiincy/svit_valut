from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.models import SeoMetadata
from app.schemas import SeoMetadata as SeoMetadataSchema

router = APIRouter()

@router.get("/", response_model=List[SeoMetadataSchema])
def get_all_seo_metadata(db: Session = Depends(get_db)):
    """Public endpoint to get all SEO rules so frontend routing can cache them globally."""
    return db.query(SeoMetadata).all()

@router.get("/{path:path}", response_model=SeoMetadataSchema)
def get_seo_for_path(path: str, db: Session = Depends(get_db)):
    """Public endpoint to get SEO metadata for a specific URL path."""
    if not path.startswith('/'):
        path = f"/{path}"
    seo = db.query(SeoMetadata).filter_by(url_path=path).first()
    if not seo:
        raise HTTPException(status_code=404, detail="SEO metadata not found for this path")
    return seo


