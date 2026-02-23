import sys
import os

# Ensure the app directory is in the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal, engine
from app.models.models import Base, Currency, SeoMetadata, SiteSettings

def migrate_seo_data():
    db = SessionLocal()
    try:
        # Create Tables if they don't exist
        print("Creating tables...")
        Base.metadata.create_all(bind=engine)

        print("Migrating Global Homepage SEO...")
        settings = db.query(SiteSettings).first()
        if settings and settings.homepage_seo_text:
            existing_home = db.query(SeoMetadata).filter_by(url_path="/").first()
            if not existing_home:
                home_seo = SeoMetadata(
                    url_path="/",
                    h1=settings.meta_title,
                    h2="Головна",
                    title=settings.meta_title,
                    description=settings.meta_description,
                    text=settings.homepage_seo_text
                )
                db.add(home_seo)

        print("Migrating Currency SEO data...")
        currencies = db.query(Currency).all()
        for curr in currencies:
            # BUY Page
            if curr.buy_url or curr.code:
                buy_path = curr.buy_url if curr.buy_url else f"/buy-{curr.code.lower()}"
                if not buy_path.startswith('/'):
                    buy_path = f"/{buy_path}"
                    
                existing_buy = db.query(SeoMetadata).filter_by(url_path=buy_path).first()
                if not existing_buy and (curr.seo_buy_text or curr.seo_text):
                    buy_seo = SeoMetadata(
                        url_path=buy_path,
                        h1=curr.seo_buy_h1 or curr.seo_h1,
                        h2=curr.seo_buy_h2 or curr.seo_h2,
                        title=curr.seo_buy_title or curr.seo_h1,
                        description=curr.seo_buy_desc,
                        text=curr.seo_buy_text or curr.seo_text,
                        image_url=curr.seo_buy_image or curr.seo_image
                    )
                    db.add(buy_seo)

            # SELL Page
            if curr.sell_url or curr.code:
                sell_path = curr.sell_url if curr.sell_url else f"/sell-{curr.code.lower()}"
                if not sell_path.startswith('/'):
                    sell_path = f"/{sell_path}"
                    
                existing_sell = db.query(SeoMetadata).filter_by(url_path=sell_path).first()
                if not existing_sell and (curr.seo_sell_text or curr.seo_text):
                    sell_seo = SeoMetadata(
                        url_path=sell_path,
                        h1=curr.seo_sell_h1 or curr.seo_h1,
                        h2=curr.seo_sell_h2 or curr.seo_h2,
                        title=curr.seo_sell_title or curr.seo_h1,
                        description=curr.seo_sell_desc,
                        text=curr.seo_sell_text or curr.seo_text,
                        image_url=curr.seo_sell_image or curr.seo_image
                    )
                    db.add(sell_seo)

        db.commit()
        print("✅ SEO Data migration completed successfully!")
    
    except Exception as e:
        print(f"❌ Error during migration: {e}")
        db.rollback()
    
    finally:
        db.close()

if __name__ == "__main__":
    migrate_seo_data()
