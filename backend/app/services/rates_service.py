import io
import pandas as pd
from datetime import datetime
from sqlalchemy.orm import Session
from app.models import models
from app.schemas import RatesUploadResponseV2
from typing import Optional, List, Dict, Any

# Constants
MAJOR_CURRENCIES = ['USD', 'EUR', 'PLN', 'GBP', 'CHF']
ORDERED_CURRENCIES = ['USD', 'EUR', 'PLN', 'GBP', 'CHF', 'CZK', 'AUD', 'BGN', 'BRL', 'CAD', 'CLP', 'CNY', 'COP', 'DKK', 'EGP', 'GEL', 'HKD', 'HUF', 'ILS', 'INR', 'JPY', 'KZT', 'MXN', 'MYR', 'NOK', 'NZD', 'PEN', 'PHP', 'RON', 'RSD', 'SAR', 'SEK', 'SGD', 'THB', 'TRY', 'TWD', 'ZAR']

CURRENCY_FLAGS = {
    "USD": "🇺🇸", "EUR": "🇪🇺", "PLN": "🇵🇱", "GBP": "🇬🇧", "CHF": "🇨🇭",
    "EGP": "🇪🇬", "JPY": "🇯🇵", "INR": "🇮🇳", "AUD": "🇦🇺", "CAD": "🇨🇦",
    "CZK": "🇨🇿", "TRY": "🇹🇷", "CNY": "🇨🇳", "KRW": "🇰🇷", "SEK": "🇸🇪",
    "NOK": "🇳🇴", "DKK": "🇩🇰", "HUF": "🇭🇺", "RON": "🇷🇴", "BGN": "🇧🇬",
    "UAH": "🇺🇦", "ILS": "🇮🇱", "AED": "🇦🇪", "SAR": "🇸🇦", "THB": "🇹🇭",
    "HKD": "🇭🇰", "SGD": "🇸🇬", "MXN": "🇲🇽", "NZD": "🇳🇿", "GEL": "🇬🇪",
    "AZN": "🇦🇿", "KZT": "🇰🇿", "MDL": "🇲🇩", "MLD": "🇲🇩", "RSD": "🇷🇸",
}

POPULAR_CURRENCIES = {"USD", "EUR", "PLN", "GBP", "CHF", "CZK"}

class RatesService:
    def __init__(self, db: Session):
        self.db = db

    def process_excel_upload(self, file_contents: bytes) -> RatesUploadResponseV2:
        xlsx = pd.ExcelFile(io.BytesIO(file_contents))
        sheet_names = [s.lower() for s in xlsx.sheet_names]
        
        errors = []
        base_updated = 0
        branch_updated = 0
        processed_codes = set()
        
        # 1. Process BASE RATES
        base_sheet = None
        if 'курси' in sheet_names:
            base_sheet = xlsx.sheet_names[sheet_names.index('курси')]
        elif 'rates' in sheet_names:
            base_sheet = xlsx.sheet_names[sheet_names.index('rates')]
        else:
            base_sheet = xlsx.sheet_names[0]
        
        df_preview = pd.read_excel(xlsx, sheet_name=base_sheet, header=None, nrows=3)
        header_row = 0
        branch_col_map = {}
        branch_col_definitions = {}
        
        if not df_preview.empty and df_preview.shape[0] >= 3:
             row0 = df_preview.iloc[0].astype(str).values
             row1 = df_preview.iloc[1].astype(str).values
             has_id_row0 = any(x for x in row0 if 'ID:' in str(x) or '№' in str(x) or 'No' in str(x))
             row2 = df_preview.iloc[2].astype(str).values
             has_headers_row2 = any(x for x in row2 if 'Код' in str(x) or 'Code' in str(x) or 'Валюта' in str(x))
             
             if has_id_row0 and has_headers_row2:
                 header_row = 2
                 current_branch = None
                 for i in range(3, len(row0)):
                     addr_val = str(row1[i]).strip()
                     number_val = str(row0[i]).strip()
                     
                     if addr_val and addr_val != 'nan':
                         branch = self.db.query(models.Branch).filter(models.Branch.address == addr_val).first()
                         if not branch:
                             branch = self.db.query(models.Branch).filter(models.Branch.address.ilike(f"%{addr_val}%")).first()
                         
                         if branch:
                             current_branch = branch
                             new_number = None
                             if number_val and number_val != 'nan':
                                 import re
                                 match = re.search(r'(\d+)', number_val)
                                 if match:
                                     new_number = int(match.group(1))
                             needs_update = False
                             if new_number is not None and new_number != branch.number:
                                 branch.number = new_number
                                 needs_update = True
                             if branch.order != i:
                                 branch.order = i
                                 needs_update = True
                             if needs_update:
                                 self.db.add(branch)
                     
                     if current_branch:
                         header_val = str(row2[i]).lower()
                         rate_type = None
                         if 'опт' in header_val:
                             if 'куп' in header_val: rate_type = 'wholesale_buy'
                             elif 'прод' in header_val: rate_type = 'wholesale_sell'
                         else:
                             if 'куп' in header_val: rate_type = 'buy'
                             elif 'прод' in header_val: rate_type = 'sell'
                         if rate_type:
                             branch_col_definitions[i] = {'branch_id': current_branch.id, 'type': rate_type}

             elif has_id_row0:
                 header_row = 1
                 order_counter = 1
                 for i in range(3, len(row0)):
                    val = str(row0[i])
                    if any(marker in val for marker in ['ID:', '№', 'Nr', 'No']):
                        try:
                            import re
                            match = re.search(r'(\d+)', val)
                            if match:
                                bid = int(match.group(1))
                                branch_col_map[i] = bid
                                b = self.db.query(models.Branch).filter(models.Branch.id == bid).first()
                                if b and b.order != order_counter:
                                    b.order = order_counter
                                    self.db.add(b)
                                order_counter += 1
                        except:
                            pass

        df_base = pd.read_excel(xlsx, sheet_name=base_sheet, header=header_row)
        
        new_cols_base = []
        counts_base = {}
        for col in df_base.columns:
            c_clean = str(col).strip().lower()
            if c_clean in counts_base:
                counts_base[c_clean] += 1
                new_cols_base.append(f"{c_clean}_{counts_base[c_clean]}")
            else:
                counts_base[c_clean] = 0
                new_cols_base.append(c_clean)
        df_base.columns = new_cols_base
        
        code_col = next((c for c in df_base.columns if any(x in c for x in ['код', 'code', 'iso'])), None)
        if not code_col:
             code_col = next((c for c in df_base.columns if any(x in c for x in ['валют', 'currency']) and not any(x in c for x in ['назва', 'name'])), None)
             
        name_col = next((c for c in df_base.columns if c != code_col and any(x in c for x in ['назва', 'name', 'валют', 'currency'])), None)
        buy_col = next((c for c in df_base.columns if any(x in c for x in ['купів', 'buy', 'покуп']) and not 'опт' in str(c).lower()), None)
        sell_col = next((c for c in df_base.columns if any(x in c for x in ['прода', 'sell']) and not 'опт' in str(c).lower()), None)
        wholesale_buy_col = next((c for c in df_base.columns if 'опт' in str(c).lower() and any(x in c for x in ['купів', 'buy', 'покуп'])), None)
        wholesale_sell_col = next((c for c in df_base.columns if 'опт' in str(c).lower() and any(x in c for x in ['прода', 'sell'])), None)
        flag_col = next((c for c in df_base.columns if any(x in c for x in ['прапор', 'flag'])), None)
        
        if code_col and 'валют' in code_col and not 'код' in code_col:
             first_valid = df_base[df_base[code_col].notna()].head(1)
             if not first_valid.empty and len(str(first_valid.iloc[0][code_col])) > 3:
                 code_col = None

        if not code_col or code_col == buy_col or code_col == sell_col:
             for col in df_base.columns:
                 sample = df_base[df_base[col].notna()].head(3)
                 if not sample.empty and all(len(str(x).strip()) == 3 and str(x).strip().isalpha() for x in sample[col]):
                     code_col = col
                     break

        if code_col and buy_col and sell_col:
            for idx, row in df_base.iterrows():
                try:
                    code_val = row[code_col]
                    if pd.isna(code_val): continue
                    code = str(code_val).strip().upper()
                    if len(code) != 3: continue
                    
                    try:
                        b_val = str(row[buy_col]).replace(',', '.').replace(' ', '').strip()
                        buy_rate = float(b_val)
                        s_val = str(row[sell_col]).replace(',', '.').replace(' ', '').strip()
                        sell_rate = float(s_val)
                    except:
                        continue
                    
                    if buy_rate <= 0 or sell_rate <= 0: continue
                    
                    wholesale_buy = 0.0
                    wholesale_sell = 0.0
                    if wholesale_buy_col and pd.notna(row[wholesale_buy_col]):
                         try: 
                             wb_val = str(row[wholesale_buy_col]).replace(',', '.').replace(' ', '').strip()
                             wholesale_buy = float(wb_val)
                         except: pass
                    if wholesale_sell_col and pd.notna(row[wholesale_sell_col]):
                         try: 
                             ws_val = str(row[wholesale_sell_col]).replace(',', '.').replace(' ', '').strip()
                             wholesale_sell = float(ws_val)
                         except: pass
                    
                    flag = "🏳️"
                    if flag_col and pd.notna(row[flag_col]):
                        flag = str(row[flag_col]).strip()
                    else:
                        flag = CURRENCY_FLAGS.get(code, "🏳️")

                    name_uk = None
                    if name_col and pd.notna(row[name_col]):
                        name_uk = str(row[name_col]).strip()
                    
                    branch_updates = {}
                    
                    if branch_col_definitions:
                        for defs in branch_col_definitions.values():
                             if defs['branch_id'] not in branch_updates:
                                 branch_updates[defs['branch_id']] = {}

                        for col_idx, defs in branch_col_definitions.items():
                            if col_idx >= len(row): continue
                            val = row.iloc[col_idx]
                            if pd.isna(val): continue
                            
                            try:
                                val_str = str(val).replace(',', '.').replace(' ', '').strip()
                                val_float = float(val_str)
                                if val_float <= 0: continue
                                b_id = defs['branch_id']
                                r_type = defs['type']
                                if b_id not in branch_updates:
                                    branch_updates[b_id] = {}
                                branch_updates[b_id][r_type] = val_float
                            except: pass
                    
                    if wholesale_buy <= 0 and branch_updates:
                        for b_data in branch_updates.values():
                            if b_data.get('wholesale_buy', 0) > 0:
                                wholesale_buy = b_data['wholesale_buy']
                                break
                    
                    if wholesale_sell <= 0 and branch_updates:
                        for b_data in branch_updates.values():
                            if b_data.get('wholesale_sell', 0) > 0:
                                wholesale_sell = b_data['wholesale_sell']
                                break

                    curr_db = self.db.query(models.Currency).filter(models.Currency.code == code).first()
                    if curr_db:
                        curr_db.buy_rate = buy_rate
                        curr_db.sell_rate = sell_rate
                        curr_db.wholesale_buy_rate = wholesale_buy
                        curr_db.wholesale_sell_rate = wholesale_sell
                        curr_db.is_active = True
                        if not curr_db.flag or (flag_col and pd.notna(row[flag_col])):
                            curr_db.flag = flag
                        if name_uk:
                             curr_db.name_uk = name_uk
                             curr_db.name = name_uk 
                        base_updated += 1
                    else:
                        final_name = name_uk if name_uk else code
                        curr_db = models.Currency(
                            code=code, name=final_name, name_uk=final_name,
                            buy_rate=buy_rate, sell_rate=sell_rate,
                            wholesale_buy_rate=wholesale_buy, wholesale_sell_rate=wholesale_sell,
                            flag=flag,
                            is_active=True, is_popular=code in POPULAR_CURRENCIES
                        )
                        self.db.add(curr_db)
                        self.db.commit()
                        self.db.refresh(curr_db)
                        base_updated += 1
                    
                    processed_codes.add(code)
                
                    if branch_col_definitions:
                        for b_id, rates in branch_updates.items():
                            has_fallback = (wholesale_buy > 0 or wholesale_sell > 0)
                            if not rates and not has_fallback: continue
                            
                            br_rate = self.db.query(models.BranchRate).filter(
                                models.BranchRate.branch_id == b_id,
                                models.BranchRate.currency_code == code
                            ).first()
                            
                            w_buy = rates.get('wholesale_buy', 0)
                            if w_buy <= 0 and wholesale_buy > 0: w_buy = wholesale_buy
                            
                            w_sell = rates.get('wholesale_sell', 0)
                            if w_sell <= 0 and wholesale_sell > 0: w_sell = wholesale_sell
                            
                            if not br_rate:
                                br_rate = models.BranchRate(
                                    branch_id=b_id,
                                    currency_code=code,
                                    buy_rate=rates.get('buy', 0),
                                    sell_rate=rates.get('sell', 0),
                                    wholesale_buy_rate=w_buy,
                                    wholesale_sell_rate=w_sell
                                )
                                self.db.add(br_rate)
                            else:
                                if 'buy' in rates: br_rate.buy_rate = rates['buy']
                                if 'sell' in rates: br_rate.sell_rate = rates['sell']
                                if w_buy > 0: br_rate.wholesale_buy_rate = w_buy
                                if w_sell > 0: br_rate.wholesale_sell_rate = w_sell
                            
                            branch_updated += 1

                    elif branch_col_map:
                         for col_idx, branch_id in branch_col_map.items():
                             if col_idx + 1 >= len(df_base.columns): continue
                             
                             try:
                                 val_buy = row.iloc[col_idx]
                                 val_sell = row.iloc[col_idx+1]
                                 if pd.isna(val_buy) or pd.isna(val_sell): continue
                                 b_buy = float(val_buy)
                                 b_sell = float(val_sell)
                                 if b_buy <= 0 or b_sell <= 0: continue
                                 
                                 b_wh_buy = 0.0
                                 b_wh_sell = 0.0
                                 try: b_wh_buy = float(row.iloc[col_idx+2])
                                 except: pass
                                 try: b_wh_sell = float(row.iloc[col_idx+3])
                                 except: pass
                                 
                                 br_rate = self.db.query(models.BranchRate).filter(
                                     models.BranchRate.branch_id == branch_id,
                                     models.BranchRate.currency_code == code
                                 ).first()
                                 
                                 if br_rate:
                                     br_rate.buy_rate = b_buy
                                     br_rate.sell_rate = b_sell
                                     br_rate.wholesale_buy_rate = b_wh_buy
                                     br_rate.wholesale_sell_rate = b_wh_sell
                                 else:
                                      br_rate = models.BranchRate(
                                          branch_id=branch_id,
                                          currency_code=code,
                                          buy_rate=b_buy,
                                          sell_rate=b_sell,
                                          wholesale_buy_rate=b_wh_buy,
                                          wholesale_sell_rate=b_wh_sell
                                      )
                                      self.db.add(br_rate)
                                 branch_updated += 1
                             except: pass
                except Exception:
                    pass
            self.db.commit()
        
        # FINAL SYNC
        if processed_codes:
            missing_currencies = self.db.query(models.Currency).filter(
                models.Currency.is_active == True,
                ~models.Currency.code.in_(processed_codes)
            ).all()
            
            for mc in missing_currencies:
                mc.is_active = False
            
            self.db.query(models.BranchRate).filter(
                ~models.BranchRate.currency_code.in_(processed_codes)
            ).update({models.BranchRate.is_active: False}, synchronize_session=False)
            
            self.db.commit()
            
        rates_updated_at = datetime.now()
        
        return RatesUploadResponseV2(
            success=True,
            message=f"Курси оновлено о {rates_updated_at.strftime('%H:%M:%S')}",
            base_rates_updated=base_updated,
            branch_rates_updated=branch_updated,
            errors=errors[:10]
        )
