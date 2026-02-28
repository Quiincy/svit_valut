import sys
import os
from datetime import datetime

# Ensure the app directory is in the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.models.models import Currency, SeoMetadata

BASE_DOMAIN = "https://mirvalut.com"
SITEMAP_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../frontend/public/sitemap.xml")

def generate_sitemap():
    db = SessionLocal()
    try:
        today = datetime.now().strftime("%Y-%m-%d")
        
        urls = []
        
        # 1. Static Core Pages
        core_pages = [
            ("", "1.0", "daily"),
            ("/rates", "0.8", "daily"),
            ("/services", "0.8", "daily"),
            ("/contacts", "0.8", "daily"),
            ("/faq", "0.8", "daily"),
            ("/services/old-currency", "0.7", "weekly"),
            ("/services/damaged-currency", "0.7", "weekly"),
            ("/services/old-francs", "0.7", "weekly"),
            ("/articles/1", "0.6", "monthly"),
        ]
        
        for path, priority, freq in core_pages:
            urls.append(f"""  <url>
    <loc>{BASE_DOMAIN}{path}</loc>
    <lastmod>{today}</lastmod>
    <changefreq>{freq}</changefreq>
    <priority>{priority}</priority>
  </url>""")

        # 2. Currency SEO Pages
        currencies = db.query(Currency).filter(Currency.is_active == True).all()
        for curr in currencies:
            priority = "0.9" if curr.is_popular else "0.7"
            
            # Buy Page
            buy_path = curr.buy_url if curr.buy_url else f"/buy-{curr.code.lower()}"
            if not buy_path.startswith('/'): buy_path = f"/{buy_path}"
            
            urls.append(f"""  <url>
    <loc>{BASE_DOMAIN}{buy_path}</loc>
    <lastmod>{today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>{priority}</priority>
  </url>""")
            
            # Sell Page
            sell_path = curr.sell_url if curr.sell_url else f"/sell-{curr.code.lower()}"
            if not sell_path.startswith('/'): sell_path = f"/{sell_path}"
            
            urls.append(f"""  <url>
    <loc>{BASE_DOMAIN}{sell_path}</loc>
    <lastmod>{today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>{priority}</priority>
  </url>""")

        # 3. Additional SEO Metadata Paths
        seo_paths = db.query(SeoMetadata).all()
        existing_paths = {p[0] for p in core_pages}
        # Add paths from seo_metadata if not already in sitemap
        for seo in seo_paths:
            if seo.url_path not in existing_paths and seo.url_path != "/":
                urls.append(f"""  <url>
    <loc>{BASE_DOMAIN}{seo.url_path}</loc>
    <lastmod>{today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>""")

        # Combine into XML
        xml_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{"".join(urls)}
</urlset>"""

        with open(SITEMAP_PATH, "w", encoding="utf-8") as f:
            f.write(xml_content)
        
        print(f"✅ Sitemap successfully generated at {SITEMAP_PATH}")
        print(f"📊 Total URLs: {len(urls)}")

    except Exception as e:
        print(f"❌ Error generating sitemap: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    generate_sitemap()
