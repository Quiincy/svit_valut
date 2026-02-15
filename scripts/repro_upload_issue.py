import sys
import os
import pandas as pd
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from main import app, init_db_data, models, currencies_data, ORDERED_CURRENCIES
from database import Base

# Setup Test DB
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def simulate_upload_issue():
    print("Setting up test database...")
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    # 1. Initialize DB with ONLY FEW currencies (Simulating old state)
    # We purposefully exclude some new ones to see if upload adds them.
    initial_currencies = [c for c in currencies_data if c.code in ['USD', 'EUR', 'UAH']]
    for i, c in enumerate(initial_currencies):
        db.add(models.Currency(
            code=c.code, name=c.name, name_uk=c.name_uk,
            buy_rate=c.buy_rate, sell_rate=c.sell_rate, is_active=True
        ))
    db.commit()
    print(f"Initial DB Currencies: {[c.code for c in db.query(models.Currency).all()]}")
    
    # 2. Create a Mock Excel File with ALL 34 currencies
    # mimicking what download_rates_template produces
    data_rows = []
    columns = ['Код', 'Прапор', 'Валюта', '1 TestBranch Купівля', '1 TestBranch Продаж']
    
    for code in ORDERED_CURRENCIES:
        data_rows.append({
            'Код': code,
            'Прапор': '🏳️',
            'Валюта': code,
            '1 TestBranch Купівля': 10.0,
            '1 TestBranch Продаж': 11.0
        })
    
    df = pd.DataFrame(data_rows)
    print(f"Generated Excel with {len(df)} currencies.")
    
    # 3. Simulate the Upload Logic (Hybrid Matrix Part)
    # This matches the code in main.py lines ~1136+
    
    # ... Copying logic from main.py for reproduction ...
    
    # Map lower cased symbols and codes to canonical codes
    # CRITICAL: This is where I suspect the bug is.
    # The code queries `models.Currency` with `is_active=True`.
    # If a currency is NOT in DB, it won't be in `curr_map`.
    
    all_currencies = db.query(models.Currency).filter(models.Currency.is_active == True).all()
    curr_map = {}
    for c in all_currencies:
        curr_map[c.code.lower()] = c.code
    
    # Standard overrides (from main.py)
    curr_map['$'] = 'USD'
    curr_map['€'] = 'EUR'
    curr_map['zł'] = 'PLN'
    curr_map['pln'] = 'PLN'
    curr_map['gbp'] = 'GBP'
    curr_map['chf'] = 'CHF'
    
    print(f"Currency Map Keys: {list(curr_map.keys())}")
    
    matrix_cols = []
    # Simulating column headers from our DF
    # The DF columns are: Код, Прапор, Валюта, 1 TestBranch Купівля, 1 TestBranch Продаж
    # Wait, the Template format is VERTICAL (Rows = Currencies).
    # The Upload Logic supports "Hybrid" which is this vertical format.
    
    # Let's verify how main.py handles Vertical format.
    # Lines 1213 in main.py:
    # `elif all([code_col_b, buy_col_b, sell_col_b]):`
    
    # If the file has 'branch' column, it treats it as Vertical/Hybrid.
    # Our template (v2) does NOT have a 'branch' column. It has specific columns PER branch.
    # e.g. "1 Address Buy", "1 Address Sell".
    
    # Trace main.py:
    # `has_branch_col = any(x in c for c in df_branch.columns for x in ['відділ', 'branch', 'філі', 'каса', 'cashier'])`
    # The generated template columns are: "1 address Купівля".
    # Does "1 address Купівля" contain "branch" or "відділ"? Likely NO.
    
    # If `has_branch_col` is False...
    # It goes to `else:` block (Line 1236+ in main.py):
    # `Matrix Format (Legacy: Row=Currency, Cols=Branches[1_buy, 1_sell])`
    
    # Let's see if our template falls into this "Legacy" matrix format.
    # Columns: "1 TestBranch Купівля", "1 TestBranch Продаж".
    # `code_col_b` found? Yes ("Код").
    # `branch_cols` logic:
    # Regex `r'(\d+)'` finds "1".
    
    # So it enters the "Legacy" block.
    # `for _, row in df_branch.iterrows():`
    #   `code = str(row[code_col_b])...` -> "MDL"
    #   `rate_entry = db.query(models.BranchRate)...`
    #   `if rate_entry: ... update`
    #   `else: ... db.add(...)`
    
    # Wait!
    # `else:` block (Line 1271):
    # `key_active = db.query(models.Currency).filter(models.Currency.code == code).first()`
    # `if key_active:`
    #    `db.add(...)`
    
    # HERE IS THE BUG!
    # If `key_active` (the Currency in DB) does NOT exist, it skips adding the rate!
    # `if key_active:` check prevents adding rates for currencies that don't exist in `currencies` table.
    
    print("--- Simulating Legacy Matrix Logic ---")
    processed_count = 0
    for idx, row in df.iterrows():
        code = row['Код']
        # Simulation of the check involved
        key_active = db.query(models.Currency).filter(models.Currency.code == code).first()
        if key_active:
             print(f"Processing {code}: Currency Exists -> Adding Rate")
             processed_count += 1
        else:
             print(f"Processing {code}: Currency MISSING in DB -> SKIP (Rate ignored)")
    
    print(f"Total Processed: {processed_count} out of {len(df)}")
    
    if processed_count < len(df):
        print("FAIL: Missing currencies are ignored during upload!")
    else:
        print("PASS: All currencies processed.")

if __name__ == "__main__":
    simulate_upload_issue()
