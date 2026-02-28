from sqlalchemy import text
from app.core.database import engine

def run_migrations():
    """ Runs simple migrations on startup to ensure database schema matches the models. """
    print("Running database migrations...")
    with engine.connect() as conn:
        # Check if updated_at column exists in reservations table
        try:
            # SQLite specific check
            result = conn.execute(text("PRAGMA table_info(reservations)"))
            columns = [row[1] for row in result]
            
            if 'updated_at' not in columns:
                print("Adding 'updated_at' column to 'reservations' table...")
                conn.execute(text("ALTER TABLE reservations ADD COLUMN updated_at DATETIME"))
                conn.execute(text("UPDATE reservations SET updated_at = created_at"))
                conn.commit()
                print("Migration successful: added 'updated_at' column.")
            else:
                print("Database is up to date.")
        except Exception as e:
            print(f"Migration error: {e}")
