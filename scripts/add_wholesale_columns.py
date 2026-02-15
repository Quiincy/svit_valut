import sqlite3
import os

DB_PATH = '/Users/quincy/Desktop/svit_valut/backend/svit_valut.db'

def migrate():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # Add wholesale_buy_rate
        try:
            cursor.execute("ALTER TABLE currencies ADD COLUMN wholesale_buy_rate FLOAT DEFAULT 0.0")
            print("Added column: wholesale_buy_rate")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print("Column wholesale_buy_rate already exists")
            else:
                raise e

        # Add wholesale_sell_rate
        try:
            cursor.execute("ALTER TABLE currencies ADD COLUMN wholesale_sell_rate FLOAT DEFAULT 0.0")
            print("Added column: wholesale_sell_rate")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print("Column wholesale_sell_rate already exists")
            else:
                raise e

        conn.commit()
        print("Migration completed successfully.")
    except Exception as e:
        print(f"Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
