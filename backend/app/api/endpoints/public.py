from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models import models
from app.schemas import SiteSettings, FAQItem, ServiceItem, ArticleItem
from typing import List

router = APIRouter()

@router.get("/settings", response_model=SiteSettings)
async def get_site_settings(db: Session = Depends(get_db)):
    """Get site settings (public)"""
    settings = db.query(models.SiteSettings).first()
    if not settings:
        return SiteSettings()
    return settings

@router.get("/faq", response_model=List[FAQItem])
async def get_faq(db: Session = Depends(get_db)):
    """Get FAQ list (public)"""
    return db.query(models.FAQItem).order_by(models.FAQItem.order).all()

@router.get("/services", response_model=List[ServiceItem])
async def get_services(db: Session = Depends(get_db)):
    """Get services list (public, active only)"""
    return db.query(models.ServiceItem).filter(models.ServiceItem.is_active == True).order_by(models.ServiceItem.order).all()

@router.get("/articles", response_model=List[ArticleItem])
async def get_articles(db: Session = Depends(get_db)):
    """Get published articles (public)"""
    return db.query(models.ArticleItem).filter(models.ArticleItem.is_published == True).order_by(models.ArticleItem.created_at.desc()).all()

@router.get("/articles/{article_id}", response_model=ArticleItem)
async def get_article(article_id: int, db: Session = Depends(get_db)):
    """Get single article (public)"""
    from fastapi import HTTPException
    article = db.query(models.ArticleItem).filter(models.ArticleItem.id == article_id, models.ArticleItem.is_published == True).first()
    if not article:
         raise HTTPException(status_code=404, detail="Article not found")
    return article
