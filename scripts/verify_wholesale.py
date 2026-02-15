import sqlite3
import pandas as pd

DB_PATH = '/Users/quincy/Desktop/svit_valut/backend/svit_valut.db'

def verify():
    conn = sqlite3.connect(DB_PATH)
    try:
        df = pd.read_sql("PRAGMA table_info(currencies)", conn)
        columns = df['name'].tolist()
        print("Columns in currencies table:", columns)
        
        if 'wholesale_buy_rate' in columns and 'wholesale_sell_rate' in columns:
            print("SUCCESS: Wholesale columns found.")
        else:
            print("FAILURE: Wholesale columns missing.")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    verify()
