import sqlite3

def migrate():
    try:
        conn = sqlite3.connect('svit_valut.db')
        cursor = conn.cursor()
        
        # Check if column exists
        cursor.execute("PRAGMA table_info(branches)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if 'number' not in columns:
            print("Adding 'number' column to branches table...")
            cursor.execute("ALTER TABLE branches ADD COLUMN number INTEGER DEFAULT 0")
            
            # Update existing branches to set number = id
            print("Updating existing branches to set number = id...")
            cursor.execute("UPDATE branches SET number = id")
            
            conn.commit()
            print("Migration successful.")
        else:
            print("'number' column already exists.")
            
        conn.close()
    except Exception as e:
        print(f"Migration failed: {e}")

if __name__ == "__main__":
    migrate()
