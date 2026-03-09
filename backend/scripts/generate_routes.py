import sys
import os
import json
try:
    from app.core.database import SessionLocal
    from app.models.models import SeoMetadata, SiteSettings, Currency, ServiceItem
    
    db = SessionLocal()
    
    routes = []
    
    # SEO Routes
    seos = db.query(SeoMetadata).all()
    for seo in seos:
        if seo.url_path:
            routes.append(f"/{seo.url_path.strip('/').lower()}")
            
    # Settings Routes
    settings = db.query(SiteSettings).first()
    if settings:
        if settings.contacts_url:
            routes.append(f"/{settings.contacts_url.strip('/').lower()}")
        if settings.faq_url:
            routes.append(f"/{settings.faq_url.strip('/').lower()}")
        if settings.rates_url:
            routes.append(f"/{settings.rates_url.strip('/').lower()}")
            
    # Currency Routes
    currencies = db.query(Currency).all()
    for currency in currencies:
        if currency.buy_url:
            routes.append(f"/{currency.buy_url.strip('/').lower()}")
        if currency.sell_url:
            routes.append(f"/{currency.sell_url.strip('/').lower()}")
            
    # Service Routes
    services = db.query(ServiceItem).all()
    for service in services:
        if service.link_url:
            routes.append(f"/{service.link_url.strip('/').lower()}")
            
    # Deduplicate
    unique_routes = list(set([r for r in routes if r]))
    
    # Save to frontend/public folder where index.php can read it
    cache_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../frontend/public/routes_cache.json'))
    with open(cache_path, 'w', encoding='utf-8') as f:
        json.dump(unique_routes, f, ensure_ascii=False)
        
    print(f"Successfully generated {len(unique_routes)} dynamic routes into {cache_path}")
    
except Exception as e:
    print(f"Error generating dynamic routes: {e}")
finally:
    if 'db' in locals():
        db.close()
