
import sqlite3

def add_column():


    # Try finding DB in backend/ or root
    db_path = "backend/svit_valut.db"
    
    try:
        conn = sqlite3.connect(db_path)
    except:
        db_path = "svit_valut.db"
        conn = sqlite3.connect(db_path)
        
    print(f"Opening DB: {db_path}")
    cursor = conn.cursor()
    
    # Debug: List tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print("Tables:", [t[0] for t in tables])

    try:
        cursor.execute("ALTER TABLE currencies ADD COLUMN wholesale_threshold INTEGER DEFAULT 1000")
        conn.commit()
        print("Successfully added wholesale_threshold column to currencies table.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("Column wholesale_threshold already exists.")
        else:
            print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    add_column()
