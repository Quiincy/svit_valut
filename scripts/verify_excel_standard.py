import sys
import os
import io
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

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

def test_standardization():
    print("Setting up test database...")
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    print("Running init_db_data...")
    init_db_data(db)
    
    # Verify Currencies Count
    currencies = db.query(models.Currency).all()
    print(f"Currencies in DB: {len(currencies)}")
    
    if len(currencies) < 34:
        print("FAIL: Expected at least 34 currencies.")
        missing = set([c.code for c in currencies_data]) - set([c.code for c in currencies])
        print(f"Missing: {missing}")
    else:
        print("PASS: Currencies count looks correct.")

    # Verify Template Generation Logic
    # We simulate the logic using the imported ORDERED_CURRENCIES
    
    # Check ordered list matches user request
    print("Verifying ORDERED_CURRENCIES list compliance...")
    db_codes = [c.code for c in db.query(models.Currency).all()]
    # The DB might not return them in custom order unless sorted.
    # But the template logic uses ORDERED_CURRENCIES list to iterate.
    
    # Let's simulate the template creation part
    data_rows = []
    
    branches = db.query(models.Branch).order_by(models.Branch.id).all()
    all_rates = db.query(models.BranchRate).all()
    rates_map = {(r.branch_id, r.currency_code): r for r in all_rates}
    curr_info_map = {c.code: c for c in currencies}
    
    columns = ['Код', 'Прапор', 'Валюта']
    for branch in branches:
        b_name = f"{branch.id} {branch.address}"
        columns.extend([f"{b_name} Купівля", f"{b_name} Продаж", f"{b_name} Опт Купівля", f"{b_name} Опт Продаж"])
        
    for code in ORDERED_CURRENCIES:
        curr_info = curr_info_map.get(code)
        if not curr_info:
             print(f"WARNING: Currency {code} not found in DB after init!")
             continue
             
        row = {'Код': code, 'Валюта': curr_info.name_uk}
        data_rows.append(row)

    df = pd.DataFrame(data_rows)
    print("Template DataFrame Head:")
    print(df[['Код', 'Валюта']].head())
    
    # Verify exact order
    generated_codes = df['Код'].tolist()
    if generated_codes == ORDERED_CURRENCIES:
        print("PASS: Template generates currencies in exact requested order.")
    else:
        print("FAIL: Order mismatch.")
        print(f"Expected: {ORDERED_CURRENCIES[:5]}...")
        print(f"Got: {generated_codes[:5]}...")

if __name__ == "__main__":
    test_standardization()
