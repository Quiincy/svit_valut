
import sqlite3
import os

DB_PATH = "../backend/svit_valut.db"

def migrate():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # Check if columns already exist to avoid errors
        cursor.execute("PRAGMA table_info(currencies)")
        columns = [info[1] for info in cursor.fetchall()]

        new_fields = [
            # Buy SEO
            ("seo_buy_h1", "VARCHAR"),
            ("seo_buy_h2", "VARCHAR"),
            ("seo_buy_title", "VARCHAR"), # Maybe not needed if h1 covers it, but good for meta title
            ("seo_buy_desc", "VARCHAR"),  # Meta description
            ("seo_buy_text", "TEXT"),
            ("seo_buy_image", "VARCHAR"),
            
            # Sell SEO
            ("seo_sell_h1", "VARCHAR"),
            ("seo_sell_h2", "VARCHAR"),
            ("seo_sell_title", "VARCHAR"),
            ("seo_sell_desc", "VARCHAR"),
            ("seo_sell_text", "TEXT"),
            ("seo_sell_image", "VARCHAR"),
        ]

        print("Adding new SEO columns...")
        for field, dtype in new_fields:
            if field not in columns:
                print(f"  Adding {field}...")
                cursor.execute(f"ALTER TABLE currencies ADD COLUMN {field} {dtype}")
            else:
                print(f"  {field} already exists.")

        # Migrate data: Copy existing SEO fields to BOTH Buy and Sell fields
        print("\nMigrating existing SEO data...")
        cursor.execute("SELECT id, seo_h1, seo_h2, seo_text, seo_image FROM currencies")
        rows = cursor.fetchall()
        
        for row in rows:
            cid, h1, h2, text, image = row
            # Update Buy fields
            cursor.execute("""
                UPDATE currencies SET 
                seo_buy_h1 = ?, seo_buy_h2 = ?, seo_buy_text = ?, seo_buy_image = ?,
                seo_sell_h1 = ?, seo_sell_h2 = ?, seo_sell_text = ?, seo_sell_image = ?
                WHERE id = ?
            """, (h1, h2, text, image, h1, h2, text, image, cid))
            
        conn.commit()
        print("Migration completed successfully.")

    except Exception as e:
        print(f"Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
