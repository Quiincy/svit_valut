import sys
import os
import re
from datetime import datetime

# Ensure the app directory is in the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.models.models import Currency, SeoMetadata, ServiceItem, ArticleItem

BASE_DOMAIN = "https://mirvalut.com"
SITEMAP_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../frontend/public/sitemap.xml")

def generate_sitemap():
    db = SessionLocal()
    try:
        today = datetime.now().strftime("%Y-%m-%d")
        
        urls = []
        added_paths = set()

        def add_url(path, priority="0.5", freq="weekly"):
            if not path: return
            
            # Normalize path
            # Remove domain if present in path (rare but possible)
            path = path.replace(BASE_DOMAIN, "")
            
            # Trim and ensure leading slash
            clean = path.strip()
            if not clean.startswith('/'):
                clean = '/' + clean
            
            # Remove trailing slash for consistency (except root)
            if clean.endswith('/') and len(clean) > 1:
                clean = clean[:-1]
            
            # Avoid duplicates (case-insensitive)
            low = clean.lower()
            if low in added_paths:
                return
            added_paths.add(low)

            urls.append(f"""  <url>
    <loc>{BASE_DOMAIN}{clean}</loc>
    <lastmod>{today}</lastmod>
    <changefreq>{freq}</changefreq>
    <priority>{priority}</priority>
  </url>""")

        print("🚀 Generating sitemap...")

        # 1. Static Core Pages
        add_url("/", "1.0", "daily")
        add_url("/rates", "0.8", "daily")
        add_url("/services", "0.8", "daily")
        add_url("/contacts", "0.8", "daily")
        add_url("/faq", "0.8", "daily")

        # 2. Dynamic Services
        services = db.query(ServiceItem).filter(ServiceItem.is_active == True).all()
        for svc in services:
            add_url(svc.link_url, "0.7", "weekly")

        # 3. Dynamic Articles
        articles = db.query(ArticleItem).filter(ArticleItem.is_published == True).all()
        for art in articles:
            add_url(f"/articles/{art.id}", "0.6", "monthly")

        # 4. Currency SEO Pages (Only those with explicitly defined URLs, filtering out defaults)
        currencies = db.query(Currency).filter(Currency.is_active == True).all()
        for curr in currencies:
            priority = "0.9" if curr.is_popular else "0.7"
            
            # Buy Page
            if curr.buy_url and curr.buy_url.strip():
                # Filter out default patterns like /buy-usd, /buy-nok etc. (buy- + 3 chars)
                path = curr.buy_url.strip().lower()
                # Matches /buy-usd, buy-usd, /BUY-USD etc where the code part is 3 chars
                is_default = re.match(r'^/?buy-[a-z]{3}$', path)
                if not is_default:
                    add_url(curr.buy_url, priority, "daily")
            
            # Sell Page
            if curr.sell_url and curr.sell_url.strip():
                # Filter out default patterns like /sell-usd, /sell-nok etc. (sell- + 3 chars)
                path = curr.sell_url.strip().lower()
                is_default = re.match(r'^/?sell-[a-z]{3}$', path)
                if not is_default:
                    add_url(curr.sell_url, priority, "daily")

        # 5. Additional SEO Metadata Paths
        seo_paths = db.query(SeoMetadata).all()
        for seo in seo_paths:
            # Skip root as it's added first
            if seo.url_path != "/":
                add_url(seo.url_path, "0.6", "weekly")

        # Combine into XML
        xml_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{"".join(urls)}
</urlset>"""

        # Ensure directory exists
        os.makedirs(os.path.dirname(SITEMAP_PATH), exist_ok=True)

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
