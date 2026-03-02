from sqlalchemy import text
from app.core.database import engine

def run_migrations():
    """ Runs simple migrations on startup to ensure database schema matches the models. """
    print("Running database migrations...")
    with engine.connect() as conn:
        # Check if updated_at column exists in reservations table
        try:
            # Check reservations table
            res = conn.execute(text("PRAGMA table_info(reservations)"))
            res_cols = [row[1] for row in res]
            if 'updated_at' not in res_cols:
                print("Adding 'updated_at' column to 'reservations' table...")
                conn.execute(text("ALTER TABLE reservations ADD COLUMN updated_at DATETIME"))
                conn.execute(text("UPDATE reservations SET updated_at = created_at"))
                print("Migration successful: added 'updated_at' column.")
                
            # Check branch_rates table
            br_res = conn.execute(text("PRAGMA table_info(branch_rates)"))
            br_cols = [row[1] for row in br_res]
            if 'wholesale2_threshold' not in br_cols:
                print("Adding wholesale 2 columns to 'branch_rates' table...")
                conn.execute(text("ALTER TABLE branch_rates ADD COLUMN wholesale2_buy_rate FLOAT DEFAULT 0.0"))
                conn.execute(text("ALTER TABLE branch_rates ADD COLUMN wholesale2_sell_rate FLOAT DEFAULT 0.0"))
                conn.execute(text("ALTER TABLE branch_rates ADD COLUMN wholesale2_threshold INTEGER DEFAULT 5000"))
                print("Migration successful: added wholesale 2 columns to branch_rates.")
                
            # Check currencies table
            cur_res = conn.execute(text("PRAGMA table_info(currencies)"))
            cur_cols = [row[1] for row in cur_res]
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
            ss_res = conn.execute(text("PRAGMA table_info(site_settings)"))
            ss_cols = [row[1] for row in ss_res]
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

            conn.commit()
            print("Database migrations completed.")
        except Exception as e:
            print(f"Migration error: {e}")
            conn.rollback()
