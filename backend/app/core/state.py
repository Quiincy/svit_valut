from datetime import datetime
from sqlalchemy.orm import Session

class AppState:
    rates_updated_at: datetime = datetime.now()

state = AppState()

def get_rates_updated_at(db: Session) -> datetime:
    from app.models import models
    try:
        settings = db.query(models.SiteSettings).first()
        if settings and settings.rates_updated_at:
            state.rates_updated_at = settings.rates_updated_at
            return settings.rates_updated_at
    except Exception:
        pass
    return state.rates_updated_at

def set_rates_updated_at(db: Session, dt: datetime = None):
    from app.models import models
    dt = dt or datetime.now()
    state.rates_updated_at = dt
    try:
        settings = db.query(models.SiteSettings).first()
        if settings:
            settings.rates_updated_at = dt
            db.commit()
    except Exception:
        pass
