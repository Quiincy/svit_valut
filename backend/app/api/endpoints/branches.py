from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models import models
from app.schemas import Branch
from typing import List

router = APIRouter()

@router.get("/", response_model=List[Branch])
async def get_branches(db: Session = Depends(get_db)):
    """Get all open branches (public)"""
    return db.query(models.Branch).filter(models.Branch.is_open == True).order_by(models.Branch.order.asc()).all()
