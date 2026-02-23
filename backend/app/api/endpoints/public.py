from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models import models
from app.schemas import SiteSettings, FAQItem, ServiceItem, ArticleItem
from typing import List

router = APIRouter()

@router.get("/settings")
async def get_site_settings(db: Session = Depends(get_db)):
    """Get site settings (public)"""
    settings = db.query(models.SiteSettings).first()
    if not settings:
        return {
            "company_name": "Світ Валют",
            "phone": "(096) 048-88-84",
            "phone_secondary": None,
            "email": "info@svitvalut.ua",
            "working_hours": "щодня: 8:00-20:00",
            "address": "м. Київ",
            "telegram_url": None,
            "viber_url": None,
            "whatsapp_url": None,
            "instagram_url": None,
            "facebook_url": None,
            "min_wholesale_amount": 1000,
            "reservation_time_minutes": 60,
            "google_maps_embed": None,
            "meta_title": None,
            "meta_description": None,
            "homepage_seo_text": None,
        }
    return {
        "company_name": settings.company_name,
        "phone": settings.phone,
        "phone_secondary": settings.phone_secondary,
        "email": settings.email,
        "working_hours": settings.working_hours,
        "address": settings.address,
        "telegram_url": settings.telegram_url,
        "viber_url": settings.viber_url,
        "whatsapp_url": settings.whatsapp_url,
        "instagram_url": settings.instagram_url,
        "facebook_url": settings.facebook_url,
        "min_wholesale_amount": settings.min_wholesale_amount,
        "reservation_time_minutes": settings.reservation_time_minutes,
        "google_maps_embed": settings.google_maps_embed,
        "meta_title": getattr(settings, "meta_title", None),
        "meta_description": getattr(settings, "meta_description", None),
        "homepage_seo_text": getattr(settings, "homepage_seo_text", None),
    }

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
