import sqlite3
import os

DB_PATH = '/Users/quincy/Desktop/svit_valut/backend/svit_valut.db'

# Name, Code, Buy, Sell, Flag
NEW_CURRENCIES = [
    ("Канадський долар", "CAD", 30.8, 31.8, "🇨🇦"),
    ("Австралійський долар", "AUD", 27.0, 30.5, "🇦🇺"),
    ("Данська крона", "DKK", 6.35, 6.6, "🇩🇰"),
    ("Норвезька крона", "NOK", 3.65, 3.95, "🇳🇴"),
    ("Шведська крона", "SEK", 4.0, 4.6, "🇸🇪"),
    ("Єна", "JPY", 0.23, 0.33, "🇯🇵"),
    ("Юань Женьміньбі", "CNY", 5.5, 6.25, "🇨🇳"),
    ("Чеська крона", "CZK", 1.9, 2.3, "🇨🇿"),
    ("Форинт", "HUF", 0.11, 0.14, "🇭🇺"),
    ("Новий ізраїльський шекель", "ILS", 12.0, 13.2, "🇮🇱"),
    ("Теньге", "KZT", 0.06, 0.1, "🇰🇿"),
    ("Молдовський лей", "MDL", 2.25, 2.8, "🇲🇩"), # User said MLD, correcting to MDL
    ("Румунський лей", "RON", 9.0, 10.0, "🇷🇴"),
    ("Турецька ліра", "TRY", 0.71, 1.15, "🇹🇷"),
    ("Єгипетський фунт", "EGP", 0.63, 1.07, "🇪🇬"),
    ("Саудівський ріал", "SAR", 9.45, 11.3, "🇸🇦"),
    ("Сінгапурський долар", "SGD", 24.25, 32.0, "🇸🇬"),
    ("Бат", "THB", 0.92, 1.35, "🇹🇭"),
    ("Дирхам ОАЕ", "AED", 10.5, 11.7, "🇦🇪"),
    ("Сербський динар", "RSD", 0.3, 0.4, "🇷🇸"),
    ("Азербайджанський манат", "AZN", 21.7, 25.5, "🇦🇿"),
    ("Болгарський лев", "BGN", 0.0, 0.0, "🇧🇬"), # No rate provided
    ("Гонконгівський долар", "HKD", 4.1, 5.2, "🇭🇰"),
    ("Індійська рупія", "INR", 0.37, 0.55, "🇮🇳"),
    ("Ларі", "GEL", 14.5, 16.7, "🇬🇪"),
    ("Вона", "KRW", 0.021, 0.033, "🇰🇷"),
    ("Мексиканське песо", "MXN", 1.73, 2.45, "🇲🇽"),
    ("Новозеландський долар", "NZD", 20.5, 26.0, "🇳🇿"),
]

def add_currencies():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        for name_uk, code, buy, sell, flag in NEW_CURRENCIES:
            # Check if exists
            cursor.execute("SELECT id FROM currencies WHERE code = ?", (code,))
            existing = cursor.fetchone()
            
            if existing:
                # Update rates and ensure active
                print(f"Updating {code}...")
                cursor.execute("""
                    UPDATE currencies 
                    SET buy_rate = ?, sell_rate = ?, is_active = 1
                    WHERE code = ?
                """, (buy, sell, code))
            else:
                # Insert new
                print(f"Inserting {code}...")
                # We need an English name too. Using Code as placeholder or simple lookup?
                # Using Code for now as name is not critical for simple display
                name_en = code 
                
                cursor.execute("""
                    INSERT INTO currencies (code, name, name_uk, flag, buy_rate, sell_rate, is_active, is_popular, wholesale_buy_rate, wholesale_sell_rate)
                    VALUES (?, ?, ?, ?, ?, ?, 1, 0, 0.0, 0.0)
                """, (code, name_en, name_uk, flag, buy, sell))

        conn.commit()
        print("Currencies updated successfully.")
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    add_currencies()
