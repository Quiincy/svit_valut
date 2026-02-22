from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from sqlalchemy.orm import Session
import secrets
from app.models import models
from app.core.database import get_db

security = HTTPBasic()

def verify_credentials(credentials: HTTPBasicCredentials = Depends(security), db: Session = Depends(get_db)) -> models.User:
    username = credentials.username
    password = credentials.password
    
    user = db.query(models.User).filter(models.User.username == username).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Basic"},
        )
    
    if not secrets.compare_digest(password.encode(), user.password_hash.encode()):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Basic"},
        )
    
    return user

def require_admin(user: models.User = Depends(verify_credentials)) -> models.User:
    if user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

def require_operator_or_admin(user: models.User = Depends(verify_credentials)) -> models.User:
    if user.role not in [models.UserRole.ADMIN, models.UserRole.OPERATOR]:
        raise HTTPException(status_code=403, detail="Operator or admin access required")
    return user
