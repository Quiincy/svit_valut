from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models import models
from app.schemas import Currency, CrossRate, RatesUploadResponseV2, BranchRate
from app.services.rates_service import RatesService
from datetime import datetime
from typing import List, Dict

router = APIRouter()

# Global state for cache (refactor this later if needed)
rates_updated_at = datetime.now()

@router.get("")
async def get_base_rates(db: Session = Depends(get_db)):
    """Get all base rates (public). Always fetches from DB to stay current."""
    currencies = db.query(models.Currency).filter(models.Currency.is_active == True).order_by(models.Currency.order).all()
    result = {}
    for c in currencies:
        result[c.code] = {
            "code": c.code,
            "name": c.name,
            "name_uk": c.name_uk,
            "flag": c.flag,
            "buy_rate": round(c.buy_rate, 4),
            "sell_rate": round(c.sell_rate, 4),
            "wholesale_buy_rate": round(c.wholesale_buy_rate, 4),
            "wholesale_sell_rate": round(c.wholesale_sell_rate, 4),
            "is_popular": c.is_popular
        }
    return {
        "updated_at": rates_updated_at.isoformat(),
        "rates": result
    }

@router.get("/cross")
async def get_cross_rates(db: Session = Depends(get_db)):
    """Get all active cross-rate pairs from manually configured data"""
    pairs = db.query(models.CrossRate).filter(models.CrossRate.is_active == True).order_by(models.CrossRate.order.asc()).all()
    results = {}
    for p in pairs:
        pair_name = f"{p.base_currency}/{p.quote_currency}"
        results[pair_name] = {
            "base": p.base_currency,
            "quote": p.quote_currency,
            "buy": round(p.buy_rate, 4),
            "sell": round(p.sell_rate, 4),
            "calculated": False
        }
    return {
        "updated_at": rates_updated_at.isoformat(),
        "cross_rates": results
    }

@router.get("/cross/{pair}")
async def get_cross_rate(pair: str, db: Session = Depends(get_db)):
    """Get specific cross-rate (e.g., EUR/USD)"""
    pair = pair.upper()
    parts = pair.split('/')
    if len(parts) != 2:
        raise HTTPException(status_code=400, detail="Invalid pair format. Use BASE/QUOTE")
    
    base_r = db.query(models.BranchRate).filter(models.BranchRate.branch_id == 1, models.BranchRate.currency_code == parts[0]).first()
    quote_r = db.query(models.BranchRate).filter(models.BranchRate.branch_id == 1, models.BranchRate.currency_code == parts[1]).first()
    
    if not base_r or not quote_r:
        raise HTTPException(status_code=404, detail="One or both currencies not found")
        
    try:
        return {
            "pair": pair,
            "base": parts[0],
            "quote": parts[1],
            "buy": round(base_r.buy_rate / quote_r.sell_rate, 4),
            "sell": round(base_r.sell_rate / quote_r.buy_rate, 4),
            "calculated": True,
            "timestamp": datetime.now().isoformat()
        }
    except ZeroDivisionError:
        raise HTTPException(status_code=500, detail="Calculation error due to zero rates")

@router.get("/{branch_id}")
async def get_branch_rates(branch_id: int, db: Session = Depends(get_db)):
    """Get base rates + branch specific overrides"""
    try:
        # Fetch base currencies
        currencies = db.query(models.Currency).filter(models.Currency.is_active == True).order_by(models.Currency.order).all()
        base_map = {c.code: c for c in currencies}
        
        # Fetch ALL branch rates (both active and inactive) so we know if a currency was explicitly disabled here
        branch_rates = db.query(models.BranchRate).filter(
            models.BranchRate.branch_id == branch_id
        ).all()
        br_map = {r.currency_code: r for r in branch_rates}
        
        result = {}
        for code, base_c in base_map.items():
            br = br_map.get(code)
            
            is_active = br.is_active if br else base_c.is_active
            
            # If explicitly disabled for this branch, return 0s
            if not is_active:
                actual_buy = 0.0
                actual_sell = 0.0
                actual_w_buy = 0.0
                actual_w_sell = 0.0
                actual_threshold = base_c.wholesale_threshold
            else:
                actual_buy = br.buy_rate if br and br.buy_rate > 0 else base_c.buy_rate
                actual_sell = br.sell_rate if br and br.sell_rate > 0 else base_c.sell_rate
                actual_w_buy = br.wholesale_buy_rate if br and br.wholesale_buy_rate > 0 else base_c.wholesale_buy_rate
                actual_w_sell = br.wholesale_sell_rate if br and br.wholesale_sell_rate > 0 else base_c.wholesale_sell_rate
                actual_threshold = br.wholesale_threshold if br and br.wholesale_threshold and br.wholesale_threshold != 1000 else base_c.wholesale_threshold

            result[code] = {
                "code": code,
                "name": base_c.name,
                "name_uk": base_c.name_uk,
                "flag": base_c.flag,
                "buy_rate": round(actual_buy, 4),
                "sell_rate": round(actual_sell, 4),
                "wholesale_buy_rate": round(actual_w_buy, 4),
                "wholesale_sell_rate": round(actual_w_sell, 4),
                "wholesale_threshold": actual_threshold,
                "is_popular": base_c.is_popular,
                "is_active": is_active
            }
                
        return {
            "updated_at": rates_updated_at.isoformat(),
            "branch_id": branch_id,
            "rates": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
