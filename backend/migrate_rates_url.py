import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        # Check if column already exists (SQLite compatible)
        result = conn.execute(text("PRAGMA table_info(site_settings)"))
        columns = [row[1] for row in result.fetchall()]
        if 'rates_url' in columns:
            print("✅ Column 'rates_url' already exists. Nothing to do.")
            return

        conn.execute(text(
            "ALTER TABLE site_settings ADD COLUMN rates_url VARCHAR DEFAULT '/rates'"
        ))
        conn.commit()
        print("✅ Added 'rates_url' column to site_settings table.")

if __name__ == "__main__":
    migrate()
