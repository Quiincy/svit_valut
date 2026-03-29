from sqlalchemy import text
from app.core.database import engine

def get_columns(conn, table_name):
    if engine.dialect.name == 'sqlite':
        res = conn.execute(text(f"PRAGMA table_info({table_name})"))
        return [row[1] for row in res]
    elif engine.dialect.name == 'postgresql':
        res = conn.execute(text(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table_name}'"))
        return [row[0] for row in res]
    return []

def run_migrations():
    """Runs simple migrations on startup to ensure database schema matches the models."""
    print("Running database migrations...")

    with engine.begin() as conn:
        try:
            # Check reservations table
            res_cols = get_columns(conn, "reservations")
            if res_cols and 'updated_at' not in res_cols:
                print("Adding 'updated_at' column to 'reservations' table...")
                conn.execute(text("ALTER TABLE reservations ADD COLUMN updated_at DATETIME"))
                conn.execute(text("UPDATE reservations SET updated_at = created_at"))
                print("Migration successful: added 'updated_at' column.")

            # Check branch_rates table
            br_cols = get_columns(conn, "branch_rates")
            if br_cols and 'wholesale2_threshold' not in br_cols:
                print("Adding wholesale 2 columns to 'branch_rates' table...")
                conn.execute(text("ALTER TABLE branch_rates ADD COLUMN wholesale2_buy_rate FLOAT DEFAULT 0.0"))
                conn.execute(text("ALTER TABLE branch_rates ADD COLUMN wholesale2_sell_rate FLOAT DEFAULT 0.0"))
                conn.execute(text("ALTER TABLE branch_rates ADD COLUMN wholesale2_threshold INTEGER DEFAULT 5000"))
                print("Migration successful: added wholesale 2 columns to branch_rates.")

            # Check currencies table
            cur_cols = get_columns(conn, "currencies")
            if cur_cols:
                if 'wholesale_threshold' not in cur_cols:
                    print("Adding wholesale_threshold to 'currencies' table...")
                    conn.execute(text("ALTER TABLE currencies ADD COLUMN wholesale_threshold INTEGER DEFAULT 1000"))

                if 'wholesale2_threshold' not in cur_cols:
                    print("Adding wholesale2 columns to 'currencies' table...")
                    conn.execute(text("ALTER TABLE currencies ADD COLUMN wholesale2_buy_rate FLOAT DEFAULT 0.0"))
                    conn.execute(text("ALTER TABLE currencies ADD COLUMN wholesale2_sell_rate FLOAT DEFAULT 0.0"))
                    conn.execute(text("ALTER TABLE currencies ADD COLUMN wholesale2_threshold INTEGER DEFAULT 5000"))
                    print("Migration successful: added wholesale columns to currencies.")

            # Check site_settings table
            ss_cols = get_columns(conn, "site_settings")
            if ss_cols:
                if 'contacts_url' not in ss_cols:
                    print("Adding url columns to 'site_settings' table...")
                    conn.execute(text("ALTER TABLE site_settings ADD COLUMN contacts_url VARCHAR DEFAULT '/contacts'"))
                    conn.execute(text("ALTER TABLE site_settings ADD COLUMN faq_url VARCHAR DEFAULT '/faq'"))
                    conn.execute(text("ALTER TABLE site_settings ADD COLUMN rates_url VARCHAR DEFAULT '/rates'"))

                if 'homepage_seo_text' not in ss_cols:
                    print("Adding seo columns to 'site_settings' table...")
                    conn.execute(text("ALTER TABLE site_settings ADD COLUMN homepage_seo_text TEXT DEFAULT NULL"))
                    conn.execute(text("ALTER TABLE site_settings ADD COLUMN meta_title VARCHAR DEFAULT NULL"))
                    conn.execute(text("ALTER TABLE site_settings ADD COLUMN meta_description VARCHAR DEFAULT NULL"))

                if 'tiktok_url' not in ss_cols:
                    print("Adding social columns to 'site_settings' table...")
                    conn.execute(text("ALTER TABLE site_settings ADD COLUMN tiktok_url VARCHAR DEFAULT NULL"))
                    conn.execute(text("ALTER TABLE site_settings ADD COLUMN footer_telegram_url VARCHAR DEFAULT NULL"))

                if 'rates_updated_at' not in ss_cols:
                    print("Adding rates_updated_at column to 'site_settings' table...")
                    conn.execute(text("ALTER TABLE site_settings ADD COLUMN rates_updated_at DATETIME"))

            # Check service_items table for SEO fields
            si_cols = get_columns(conn, "service_items")
            if si_cols:
                if 'seo_h1' not in si_cols:
                    print("Adding seo columns to 'service_items' table...")
                    conn.execute(text("ALTER TABLE service_items ADD COLUMN seo_h1 VARCHAR DEFAULT NULL"))
                    conn.execute(text("ALTER TABLE service_items ADD COLUMN seo_h2 VARCHAR DEFAULT NULL"))
                    conn.execute(text("ALTER TABLE service_items ADD COLUMN seo_title VARCHAR DEFAULT NULL"))
                    conn.execute(text("ALTER TABLE service_items ADD COLUMN seo_description VARCHAR DEFAULT NULL"))
                    conn.execute(text("ALTER TABLE service_items ADD COLUMN seo_text TEXT DEFAULT NULL"))
                    conn.execute(text("ALTER TABLE service_items ADD COLUMN seo_image VARCHAR DEFAULT NULL"))

            # Check chat_messages table for image_url column
            cm_cols = get_columns(conn, "chat_messages")
            if cm_cols:
                if 'image_url' not in cm_cols:
                    print("Adding 'image_url' column to 'chat_messages' table...")
                    conn.execute(text("ALTER TABLE chat_messages ADD COLUMN image_url VARCHAR DEFAULT NULL"))
                    print("Migration successful: added 'image_url' column to chat_messages.")

                if engine.dialect.name == 'postgresql':
                    try:
                        conn.execute(text("ALTER TABLE chat_messages ALTER COLUMN content DROP NOT NULL"))
                    except Exception:
                        pass

            # Create seo_pages table if it doesn't exist
            if engine.dialect.name == 'sqlite':
                res = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='seo_pages'"))
                if not res.fetchone():
                    print("Creating 'seo_pages' table...")
                    conn.execute(text("""
                        CREATE TABLE seo_pages (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            slug VARCHAR UNIQUE NOT NULL,
                            h1 VARCHAR,
                            h2 VARCHAR,
                            meta_title VARCHAR,
                            meta_description VARCHAR,
                            seo_text TEXT,
                            image_url VARCHAR,
                            is_active BOOLEAN DEFAULT 1,
                            created_at DATETIME
                        )
                    """))
                    conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_seo_pages_slug ON seo_pages (slug)"))
                    print("Migration successful: created 'seo_pages' table.")

            elif engine.dialect.name == 'postgresql':
                res = conn.execute(text("SELECT to_regclass('public.seo_pages')"))
                if res.scalar() is None:
                    print("Creating 'seo_pages' table...")
                    conn.execute(text("""
                        CREATE TABLE seo_pages (
                            id SERIAL PRIMARY KEY,
                            slug VARCHAR UNIQUE NOT NULL,
                            h1 VARCHAR,
                            h2 VARCHAR,
                            meta_title VARCHAR,
                            meta_description VARCHAR,
                            seo_text TEXT,
                            image_url VARCHAR,
                            is_active BOOLEAN DEFAULT TRUE,
                            created_at TIMESTAMP
                        )
                    """))
                    conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_seo_pages_slug ON seo_pages (slug)"))
                    print("Migration successful: created 'seo_pages' table.")

            print("Database migrations completed.")

        except Exception as e:
            print(f"Migration error: {e}")
