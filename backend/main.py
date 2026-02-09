from fastapi import FastAPI, HTTPException, UploadFile, File, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime, timedelta, timezone
import enum
import random
import secrets
import io
import os
from sqlalchemy.orm import Session
import models, database
import urllib.request
import urllib.parse
import json
from database import engine, get_db, SessionLocal

app = FastAPI(title="Світ Валют API", version="2.0.0")
security = HTTPBasic()

# Create tables
models.Base.metadata.create_all(bind=engine)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=[*""],
)

# ============== SITE SETTINGS ==============
class SiteSettingsBase(BaseModel):
    company_name: str = "Світ Валют"
    phone: str = "(096) 048-88-84"
    phone_secondary: Optional[str] = None
    email: str = "info@svitvalut.ua"
    working_hours: str = "щодня: 8:00-20:00"
    telegram_url: str = "https://t.me/svitvalut"
    viber_url: str = "viber://chat?number=+380960488884"
    whatsapp_url: str = "https://wa.me/380960488884"
    instagram_url: Optional[str] = None
    facebook_url: Optional[str] = None
    address: str = "м. Київ"
    min_wholesale_amount: int = 1000
    reservation_time_minutes: int = 60
    google_maps_embed: str = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d162757.7284!2d30.3907!3d50.4017!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x40d4cf4ee15a4505%3A0x764931d2170146fe!2z0JrQuNGX0LI!5e0!3m2!1suk!2sua!4v1702000000000!5m2!1suk!2sua"

class FAQItemBase(BaseModel):
    id: int
    question: str
    answer: str
    link_text: Optional[str] = None
    link_url: Optional[str] = None
    order: int = 0

class ServiceItemBase(BaseModel):
    id: int
    title: str
    description: str
    image_url: str
    link_url: Optional[str] = None
    is_active: bool = True
    order: int = 0

class ArticleItemBase(BaseModel):
    id: int
    title: str
    excerpt: str
    content: str
    image_url: Optional[str] = None
    is_published: bool = True
    created_at: str

# Global settings storage
# These are now mostly for API documentation (Pydantic models)
class SiteSettings(SiteSettingsBase):
    pass

class FAQItem(FAQItemBase):
    class Config:
        from_attributes = True

class ServiceItem(ServiceItemBase):
    class Config:
        from_attributes = True

class ArticleItem(ArticleItemBase):
    class Config:
        from_attributes = True

faq_items: List[FAQItem] = [
    FAQItem(id=1, question="Як захиститися від фальшивих купюр", answer="Ми використовуємо професійне обладнання для перевірки справжності банкнот. Кожна купюра проходить детальну перевірку на спеціальних детекторах.", order=1),
    FAQItem(id=2, question="Як правильно розрахувати курс USD → EUR?", answer='Це питання детально розібрано в статті "Що таке конвертація валюти та як вірно рахувати".', link_text="Детальніше", link_url="/articles/conversion", order=2),
    FAQItem(id=3, question="Як працює міжбанк і чому курс змінюється", answer="Міжбанківський курс формується на основі попиту та пропозиції на валютному ринку між банками. Курс змінюється в залежності від економічної ситуації, новин та обсягів торгів.", order=3),
    FAQItem(id=4, question="Коли діє оптовий курс?", answer="Оптовий курс діє при обміні від 1000 USD або еквівалент в іншій валюті. Для отримання оптового курсу достатньо забронювати суму через наш сайт або зателефонувати.", order=4),
    FAQItem(id=5, question="Які банкноти вважаються зношеними?", answer="Зношеними вважаються банкноти з пошкодженнями: надриви, плями, написи, відсутні фрагменти до 40% площі. Ми приймаємо такі банкноти за спеціальним курсом.", order=5),
]

service_items: List[ServiceItem] = [
    ServiceItem(id=1, title="Приймаємо валюту, яка вийшла з обігу", description="Миттєво обміняємо старі фунти, франки, марки, та багато інших.", image_url="https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=400&h=200&fit=crop", link_url="/services/old-currency", order=1),
    ServiceItem(id=2, title="Приймаємо зношену валюту", description="Зручний спосіб позбутися непотрібних купюр.", image_url="https://images.unsplash.com/photo-1605792657660-596af9009e82?w=400&h=200&fit=crop", link_url="/services/damaged-currency", order=2),
    ServiceItem(id=3, title="Старі франки на нові або USD", description="Оновіть франки які вийшли з обігу на нові або долари США.", image_url="https://images.unsplash.com/photo-1580519542036-c47de6196ba5?w=400&h=200&fit=crop", link_url="/services/old-francs", order=3),
]

articles_db: List[ArticleItem] = [
    ArticleItem(id=1, title="Що таке конвертація валюти та як вірно рахувати", excerpt="Інтерес жителів нашої країни до іноземної валюти дуже високий, тому обмін різних видів грошей у Києві є доволі затребуваною послугою.", content="Повний текст статті про конвертацію валюти...", is_published=True, created_at="2025-01-15T10:00:00"),
]

# Enums for Pydantic Models
class UserRole(str, enum.Enum):
    ADMIN = "admin"
    OPERATOR = "operator"

class ReservationStatus(str, enum.Enum):
    PENDING_ADMIN = "pending_admin"
    PENDING = "pending"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    EXPIRED = "expired"

# Models (Pydantic for API)
class ReservationRequest(BaseModel):
    give_amount: float
    give_currency: str
    get_currency: str
    phone: str
    customer_name: Optional[str] = None  # New: customer name
    branch_id: Optional[int] = None

class ReservationResponse(BaseModel):
    id: int
    give_amount: float
    give_currency: str
    get_amount: float
    get_currency: str
    rate: float
    phone: str
    customer_name: Optional[str] = None  # New: customer name
    status: ReservationStatus
    branch_id: Optional[int]
    branch_address: Optional[str]
    created_at: str
    expires_at: str
    completed_at: Optional[str] = None
    operator_note: Optional[str] = None

class ReservationUpdate(BaseModel):
    status: Optional[ReservationStatus] = None
    operator_note: Optional[str] = None

class Currency(BaseModel):
    code: str
    name: str
    name_uk: str
    flag: str
    buy_rate: float
    sell_rate: float
    is_popular: bool = False
    is_active: bool = True  # New: ability to enable/disable currency

class Order(BaseModel):
    id: int
    address: str
    type: str
    amount: float
    currency: str
    flag: str
    rate: float
    created_at: str

class Branch(BaseModel):
    id: int
    address: str
    hours: str
    lat: float
    lng: float
    is_open: bool = True
    phone: Optional[str] = None
    telegram_chat: Optional[str] = None
    cashier: Optional[str] = None

class User(BaseModel):
    id: int
    username: str
    role: UserRole
    branch_id: Optional[int] = None
    name: str

class RatesUploadResponse(BaseModel):
    success: bool
    message: str
    updated_currencies: int
    errors: List[str] = []

class DashboardStats(BaseModel):
    total_reservations: int
    pending_reservations: int
    confirmed_reservations: int
    completed_today: int
    total_volume_uah: float
    total_volume_uah_month: float

# Constants
CURRENCY_FLAGS = {
    "USD": "🇺🇸", "EUR": "🇪🇺", "PLN": "🇵🇱", "GBP": "🇬🇧", "CHF": "🇨🇭",
    "EGP": "🇪🇬", "JPY": "🇯🇵", "INR": "🇮🇳", "AUD": "🇦🇺", "CAD": "🇨🇦",
    "CZK": "🇨🇿", "TRY": "🇹🇷", "CNY": "🇨🇳", "KRW": "🇰🇷", "SEK": "🇸🇪",
    "NOK": "🇳🇴", "DKK": "🇩🇰", "HUF": "🇭🇺", "RON": "🇷🇴", "BGN": "🇧🇬",
    "UAH": "🇺🇦", "ILS": "🇮🇱", "AED": "🇦🇪", "SAR": "🇸🇦", "THB": "🇹🇭",
    "HKD": "🇭🇰", "SGD": "🇸🇬", "MXN": "🇲🇽", "NZD": "🇳🇿", "GEL": "🇬🇪",
    "AZN": "🇦🇿", "KZT": "🇰🇿", "MDL": "🇲🇩", "MLD": "🇲🇩", "RSD": "🇷🇸",
}

CURRENCY_NAMES = {
    "USD": ("US Dollar", "Долар"), "EUR": ("Euro", "Євро"),
    "PLN": ("Polish Zloty", "Польський злотий"), "GBP": ("British Pound", "Фунт стерлінгів"),
    "CHF": ("Swiss Franc", "Швейцарський франк"), "EGP": ("Egyptian Pound", "Єгипетський фунт"),
    "JPY": ("Japanese Yen", "Єна"), "INR": ("Indian Rupee", "Індійська рупія"),
    "AUD": ("Australian Dollar", "Австралійський долар"), "CAD": ("Canadian Dollar", "Канадський долар"),
    "CZK": ("Czech Koruna", "Чеська крона"), "TRY": ("Turkish Lira", "Турецька ліра"),
    "CNY": ("Chinese Yuan", "Китайський юань"), "KRW": ("Korean Won", "Корейська вона"),
    "SEK": ("Swedish Krona", "Шведська крона"), "NOK": ("Norwegian Krone", "Норвезька крона"),
    "DKK": ("Danish Krone", "Данська крона"), "HUF": ("Hungarian Forint", "Угорський форинт"),
    "RON": ("Romanian Leu", "Румунський лей"), "BGN": ("Bulgarian Lev", "Болгарський лев"),
}

POPULAR_CURRENCIES = {"USD", "EUR", "GBP", "PLN", "CHF"}

class BranchRate(BaseModel):
    branch_id: int
    branch_address: str
    currency_code: str
    buy_rate: float
    sell_rate: float

class CrossRate(BaseModel):
    pair: str  # e.g., "EUR/USD"
    base_currency: str  # EUR
    quote_currency: str  # USD
    buy_rate: float
    sell_rate: float

class RatesUploadResponseV2(BaseModel):
    success: bool
    message: str
    base_rates_updated: int
    branch_rates_updated: int
    errors: List[str] = []

# Initial data for migration (will be used once to populate DB)
branches_data = [
    Branch(id=1, address="вул. Старовокзальна, 23", hours="щодня: 9:00-19:00", lat=50.443886, lng=30.490430, is_open=True, phone="(096) 048-88-81"),
    Branch(id=2, address="вул. В. Васильківська, 110", hours="щодня: 8:00-20:00", lat=50.423804, lng=30.518400, is_open=True, phone="(096) 048-88-82"),
    Branch(id=3, address="вул. В. Васильківська, 130", hours="щодня: 8:00-20:00", lat=50.416770, lng=30.522873, is_open=True, phone="(096) 048-88-83"),
    Branch(id=4, address="вул. Р. Окіпної, 2", hours="щодня: 8:00-20:00", lat=50.450606, lng=30.597410, is_open=True, phone="(096) 048-88-84"),
]

users_db = {
    "admin": User(id=1, username="admin", role=UserRole.ADMIN, branch_id=None, name="Адміністратор"),
    "operator1": User(id=2, username="operator1", role=UserRole.OPERATOR, branch_id=1, name="Марія Коваленко"),
    "operator2": User(id=3, username="operator2", role=UserRole.OPERATOR, branch_id=2, name="Олексій Шевченко"),
    "operator3": User(id=4, username="operator3", role=UserRole.OPERATOR, branch_id=3, name="Ірина Бондаренко"),
    "operator4": User(id=5, username="operator4", role=UserRole.OPERATOR, branch_id=4, name="Дмитро Мельник"),
}

passwords_db = {
    "admin": "admin123",
    "operator1": "op1pass",
    "operator2": "op2pass",
    "operator3": "op3pass",
    "operator4": "op4pass",
}

currencies_data = [
    Currency(code="USD", name="US Dollar", name_uk="Долар", flag="🇺🇸", buy_rate=42.10, sell_rate=42.15, is_popular=True),
    Currency(code="EUR", name="Euro", name_uk="Євро", flag="🇪🇺", buy_rate=49.30, sell_rate=49.35, is_popular=True),
    Currency(code="PLN", name="Polish Zloty", name_uk="Польський злотий", flag="🇵🇱", buy_rate=11.50, sell_rate=11.65, is_popular=False),
    Currency(code="GBP", name="British Pound", name_uk="Фунт стерлінгів", flag="🇬🇧", buy_rate=56.10, sell_rate=56.25, is_popular=True),
    Currency(code="CHF", name="Swiss Franc", name_uk="Швейцарський франк", flag="🇨🇭", buy_rate=52.80, sell_rate=52.95, is_popular=False),
    Currency(code="EGP", name="Egyptian Pound", name_uk="Єгипетський фунт", flag="🇪🇬", buy_rate=1.35, sell_rate=1.40, is_popular=False),
    Currency(code="JPY", name="Japanese Yen", name_uk="Єна", flag="🇯🇵", buy_rate=0.28, sell_rate=0.29, is_popular=False),
    Currency(code="INR", name="Indian Rupee", name_uk="Індійська рупія", flag="🇮🇳", buy_rate=0.50, sell_rate=0.52, is_popular=False),
    Currency(code="AUD", name="Australian Dollar", name_uk="Австралійський долар", flag="🇦🇺", buy_rate=30.40, sell_rate=30.55, is_popular=False),
    Currency(code="CAD", name="Canadian Dollar", name_uk="Канадський долар", flag="🇨🇦", buy_rate=31.20, sell_rate=31.35, is_popular=False),
    Currency(code="CZK", name="Czech Koruna", name_uk="Чеська крона", flag="🇨🇿", buy_rate=1.85, sell_rate=1.90, is_popular=False),
    Currency(code="TRY", name="Turkish Lira", name_uk="Турецька ліра", flag="🇹🇷", buy_rate=1.22, sell_rate=1.28, is_popular=False),
]

# Data migration helper
def init_db_data(db: Session):
    # Migrate Site Settings
    if not db.query(models.SiteSettings).first():
        db_settings = models.SiteSettings()
        db.add(db_settings)
    
    # Migrate FAQ
    if not db.query(models.FAQItem).first():
        for item in faq_items:
            db.add(models.FAQItem(
                question=item.question,
                answer=item.answer,
                link_text=item.link_text,
                link_url=item.link_url,
                order=item.order
            ))
            
    # Migrate Services
    if not db.query(models.ServiceItem).first():
        for item in service_items:
            db.add(models.ServiceItem(
                title=item.title,
                description=item.description,
                image_url=item.image_url,
                link_url=item.link_url,
                is_active=item.is_active,
                order=item.order
            ))
            
    # Migrate Articles
    if not db.query(models.ArticleItem).first():
        for item in articles_db:
            db.add(models.ArticleItem(
                title=item.title,
                excerpt=item.excerpt,
                content=item.content,
                image_url=item.image_url,
                is_published=item.is_published,
                created_at=datetime.fromisoformat(item.created_at)
            ))
            
    # Migrate Branches
    if not db.query(models.Branch).first():
        for b in branches_data:
            db.add(models.Branch(
                id=b.id, # Keep IDs for branches
                address=b.address,
                hours=b.hours,
                lat=b.lat,
                lng=b.lng,
                is_open=b.is_open,
                phone=b.phone
            ))
            
    # Migrate Users
    if not db.query(models.User).first():
        for username, u in users_db.items():
            db.add(models.User(
                username=username,
                password_hash=passwords_db.get(username, "pass"),
                role=models.UserRole[u.role.upper()],
                branch_id=u.branch_id,
                name=u.name
            ))
            
    # Migrate Currencies
    if not db.query(models.Currency).first():
        for i, c in enumerate(currencies_data):
            db.add(models.Currency(
                code=c.code,
                name=c.name,
                name_uk=c.name_uk,
                flag=c.flag,
                buy_rate=c.buy_rate,
                sell_rate=c.sell_rate,
                is_popular=c.is_popular,
                order=i
            ))
            
    # Migrate Initial Branch Rates (into branch_rates table for branch 1 as default)
    if not db.query(models.BranchRate).first():
        for c in currencies_data:
            db.add(models.BranchRate(
                branch_id=1,
                currency_code=c.code,
                buy_rate=c.buy_rate,
                sell_rate=c.sell_rate
            ))

    db.commit()

# Current state (in-memory parts we still use)
rates_updated_at = datetime.now()

# Startup event
@app.on_event("startup")
def startup_db_client():
    db = SessionLocal()
    try:
        init_db_data(db)
    finally:
        db.close()

reservations_db: List[ReservationResponse] = []

# Auth functions
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

def get_branch_address(branch_id: int) -> Optional[str]:
    branch = next((b for b in branches_data if b.id == branch_id), None)
    return branch.address if branch else None

# Routes
@app.get("/")
async def root():
    return {"message": "Світ Валют API", "version": "2.0.0"}

@app.get("/api/currencies", response_model=list[Currency])
async def get_currencies(branch_id: int = 1, db: Session = Depends(get_db)):
    """Get all available currencies with rates (Base Rates merged with Branch Overrides)"""
    
    # 1. Get ALL Base Rates (Active ones)
    base_currencies = db.query(models.Currency).filter(models.Currency.is_active == True).order_by(models.Currency.order).all()
    
    # 2. Get Branch Overrides (ALL valid overrides for this branch)
    # If an override exists and is_active=False, we must EXCLUDE the currency.
    overrides = {}
    if branch_id:
        branch_rates = db.query(models.BranchRate).filter(
            models.BranchRate.branch_id == branch_id
        ).all()
        overrides = {r.currency_code: r for r in branch_rates}
    
    result = []
    for base in base_currencies:
        # Check override
        ov = overrides.get(base.code)
        
        # If disabled for this branch specifically, skip it
        if ov and not ov.is_active:
            continue
            
        buy = ov.buy_rate if (ov and ov.is_active) else base.buy_rate
        sell = ov.sell_rate if (ov and ov.is_active) else base.sell_rate
        
        result.append(Currency(
            code=base.code,
            name=base.name,
            name_uk=base.name_uk,
            flag=base.flag,
            buy_rate=buy,
            sell_rate=sell,
            is_popular=base.is_popular,
            is_active=True
        ))
        
    return result

@app.get("/api/currencies/{code}", response_model=Currency)
async def get_currency(code: str, db: Session = Depends(get_db)):
    """Get specific currency by code"""
    r = db.query(models.BranchRate).filter(
        models.BranchRate.branch_id == 1,
        models.BranchRate.currency_code == code.upper()
    ).first()
    
    if not r:
        raise HTTPException(status_code=404, detail="Currency not found")
    
    names = CURRENCY_NAMES.get(r.currency_code, (r.currency_code, r.currency_code))
    return Currency(
        code=r.currency_code,
        name=names[0],
        name_uk=names[1],
        flag=CURRENCY_FLAGS.get(r.currency_code, "🏳️"),
        buy_rate=r.buy_rate,
        sell_rate=r.sell_rate,
        is_popular=r.currency_code in POPULAR_CURRENCIES
    )

@app.get("/api/rates/branch/{branch_id}", response_model=list[Currency])
async def get_branch_rates(branch_id: int, db: Session = Depends(get_db)):
    """Get currency rates for a specific branch"""
    db_rates = db.query(models.BranchRate).filter(models.BranchRate.branch_id == branch_id).all()
    
    # Fallback to branch 1 if no rates found
    if not db_rates:
        db_rates = db.query(models.BranchRate).filter(models.BranchRate.branch_id == 1).all()
    
    result = []
    for r in db_rates:
        names = CURRENCY_NAMES.get(r.currency_code, (r.currency_code, r.currency_code))
        result.append(Currency(
            code=r.currency_code,
            name=names[0],
            name_uk=names[1],
            flag=CURRENCY_FLAGS.get(r.currency_code, "🏳️"),
            buy_rate=r.buy_rate,
            sell_rate=r.sell_rate,
            is_popular=r.currency_code in POPULAR_CURRENCIES
        ))
    return result

@app.get("/api/rates")
async def get_rates(db: Session = Depends(get_db)):
    """Get current exchange rates"""
    db_rates = db.query(models.BranchRate).filter(models.BranchRate.branch_id == 1).all()
    return {
        "updated_at": rates_updated_at.isoformat(),
        "base": "UAH",
        "rates": {r.currency_code: {"buy": r.buy_rate, "sell": r.sell_rate} for r in db_rates}
    }

@app.get("/api/calculate")
async def calculate_exchange(
    amount: float,
    from_currency: str,
    to_currency: str = "UAH"
):
    """Calculate exchange amount"""
    from_curr = next((c for c in currencies_data if c.code.upper() == from_currency.upper()), None)
    
    if from_currency.upper() == "UAH":
        to_curr = next((c for c in currencies_data if c.code.upper() == to_currency.upper()), None)
        if not to_curr:
            raise HTTPException(status_code=404, detail="Currency not found")
        result = amount / to_curr.sell_rate
        rate = to_curr.sell_rate
    elif to_currency.upper() == "UAH":
        if not from_curr:
            raise HTTPException(status_code=404, detail="Currency not found")
        result = amount * from_curr.buy_rate
        rate = from_curr.buy_rate
    else:
        raise HTTPException(status_code=400, detail="One currency must be UAH")
    
    return {
        "from_amount": amount,
        "from_currency": from_currency.upper(),
        "to_amount": round(result, 2),
        "to_currency": to_currency.upper(),
        "rate": rate
    }

@app.get("/api/orders", response_model=list[Order])
async def get_orders(
    type: Optional[str] = None,
    page: int = 1,
    limit: int = 10
):
    """Get active orders"""
    filtered = orders_data
    if type and type != "all":
        filtered = [o for o in orders_data if o.type == type]
    
    start = (page - 1) * limit
    end = start + limit
    
    return filtered[start:end]

@app.get("/api/orders/count")
async def get_orders_count():
    """Get total orders count"""
    return {
        "total": len(orders_data),
        "buy": len([o for o in orders_data if o.type == "buy"]),
        "sell": len([o for o in orders_data if o.type == "sell"])
    }

@app.get("/api/branches", response_model=list[Branch])
async def get_branches(db: Session = Depends(get_db)):
    """Get all branches"""
    return db.query(models.Branch).all()

@app.get("/api/branches/{branch_id}", response_model=Branch)
async def get_branch(branch_id: int, db: Session = Depends(get_db)):
    """Get specific branch"""
    branch = db.query(models.Branch).filter(models.Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    return branch

@app.post("/api/reservations", response_model=ReservationResponse)
async def create_reservation(request: ReservationRequest, db: Session = Depends(get_db)):
    """Create a new currency reservation"""
    # Fetch rates for specified branch or branch 1
    branch_id = request.branch_id or 1
    
    if request.give_currency.upper() == "UAH":
        to_curr = db.query(models.BranchRate).filter(
            models.BranchRate.branch_id == branch_id,
            models.BranchRate.currency_code == request.get_currency.upper()
        ).first()
        if not to_curr:
            # Fallback to branch 1
            to_curr = db.query(models.BranchRate).filter(
                models.BranchRate.branch_id == 1,
                models.BranchRate.currency_code == request.get_currency.upper()
            ).first()
            
        if not to_curr:
            raise HTTPException(status_code=404, detail="Currency not found")
        get_amount = request.give_amount / to_curr.sell_rate
        rate = to_curr.sell_rate
    else:
        from_curr = db.query(models.BranchRate).filter(
            models.BranchRate.branch_id == branch_id,
            models.BranchRate.currency_code == request.give_currency.upper()
        ).first()
        if not from_curr:
            # Fallback to branch 1
            from_curr = db.query(models.BranchRate).filter(
                models.BranchRate.branch_id == 1,
                models.BranchRate.currency_code == request.give_currency.upper()
            ).first()
            
        if not from_curr:
            raise HTTPException(status_code=404, detail="Currency not found")
        get_amount = request.give_amount * from_curr.buy_rate
        rate = from_curr.buy_rate
    
    # Use Naive Kyiv Time to ensure correct string-based sorting with existing legacy data
    # and correct display on frontend (as local time).
    try:
        from zoneinfo import ZoneInfo
        kyiv = ZoneInfo("Europe/Kyiv")
        now = datetime.now(kyiv).replace(tzinfo=None)
    except ImportError:
        # Fallback for systems without zoneinfo (e.g. older python)
        # Kyiv is UTC+2 in winter, UTC+3 in summer. Currently Feb -> +2
        now = datetime.utcnow() + timedelta(hours=2)

    expires_at = now + timedelta(minutes=60)
    
    db_res = models.Reservation(
        give_amount=request.give_amount,
        give_currency=request.give_currency.upper(),
        get_amount=round(get_amount, 2),
        get_currency=request.get_currency.upper(),
        rate=rate,
        phone=request.phone,
        customer_name=request.customer_name,
        status=models.ReservationStatus.PENDING_ADMIN,
        branch_id=request.branch_id,
        created_at=now,
        expires_at=expires_at
    )
    
    db.add(db_res)
    db.commit()
    db.refresh(db_res)
    
    branch = db.query(models.Branch).filter(models.Branch.id == db_res.branch_id).first()
    
    return ReservationResponse(
        id=db_res.id,
        give_amount=db_res.give_amount,
        give_currency=db_res.give_currency,
        get_amount=db_res.get_amount,
        get_currency=db_res.get_currency,
        rate=db_res.rate,
        phone=db_res.phone,
        customer_name=db_res.customer_name,
        status=db_res.status,
        branch_id=db_res.branch_id,
        branch_address=branch.address if branch else None,
        created_at=db_res.created_at.isoformat(),
        expires_at=db_res.expires_at.isoformat()
    )

@app.get("/api/reservations/{reservation_id}", response_model=ReservationResponse)
async def get_reservation(reservation_id: int, db: Session = Depends(get_db)):
    """Get reservation by ID"""
    db_res = db.query(models.Reservation).filter(models.Reservation.id == reservation_id).first()
    if not db_res:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    branch = db.query(models.Branch).filter(models.Branch.id == db_res.branch_id).first()
    
    return ReservationResponse(
        id=db_res.id,
        give_amount=db_res.give_amount,
        give_currency=db_res.give_currency,
        get_amount=db_res.get_amount,
        get_currency=db_res.get_currency,
        rate=db_res.rate,
        phone=db_res.phone,
        customer_name=db_res.customer_name,
        status=db_res.status,
        branch_id=db_res.branch_id,
        branch_address=branch.address if branch else None,
        created_at=db_res.created_at.isoformat(),
        expires_at=db_res.expires_at.isoformat(),
        completed_at=db_res.completed_at.isoformat() if db_res.completed_at else None,
        operator_note=db_res.operator_note
    )

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


# ============== AUTH ENDPOINTS ==============

@app.post("/api/auth/login")
async def login(user: User = Depends(verify_credentials)):
    """Login and get user info"""
    branch = None
    if user.branch_id:
        branch = next((b for b in branches_data if b.id == user.branch_id), None)
    
    return {
        "user": {
            "id": user.id,
            "username": user.username,
            "name": user.name,
            "role": user.role,
            "branch_id": user.branch_id,
            "branch_address": branch.address if branch else None
        }
    }

@app.get("/api/auth/me")
async def get_current_user(user: User = Depends(verify_credentials)):
    """Get current user info"""
    branch = None
    if user.branch_id:
        branch = next((b for b in branches_data if b.id == user.branch_id), None)
    
    return {
        "id": user.id,
        "username": user.username,
        "name": user.name,
        "role": user.role,
        "branch_id": user.branch_id,
        "branch_address": branch.address if branch else None
    }


# ============== ADMIN ENDPOINTS ==============

@app.post("/api/admin/rates/upload", response_model=RatesUploadResponseV2)
async def upload_rates(
    file: UploadFile = File(...),
    user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Upload Excel file with rates.
    Supports two formats:
    1. Base rates: 'Курси' or first sheet
    2. Branch rates: 'Відділення' (Vertical format) or Sheet with branch columns (Matrix)
    """
    global currencies_data, rates_updated_at
    
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="File must be .xlsx or .xls")
    
    try:
        import pandas as pd
        
        contents = await file.read()
        xlsx = pd.ExcelFile(io.BytesIO(contents))
        sheet_names = [s.lower() for s in xlsx.sheet_names]
        
        errors = []
        base_updated = 0
        branch_updated = 0
        
        # 1. Process BASE RATES
        base_sheet = None
        if 'курси' in sheet_names:
            base_sheet = xlsx.sheet_names[sheet_names.index('курси')]
        elif 'rates' in sheet_names:
            base_sheet = xlsx.sheet_names[sheet_names.index('rates')]
        else:
            base_sheet = xlsx.sheet_names[0]
        
        df_base = pd.read_excel(xlsx, sheet_name=base_sheet)
        
        # Deduplicate base columns
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
        
        # Find columns
        code_col = next((c for c in df_base.columns if any(x in c for x in ['код', 'code', 'валют', 'currency']) and not any(x in c for x in ['назва', 'name'])), None)
        name_col = next((c for c in df_base.columns if any(x in c for x in ['назва', 'name'])), None)
        buy_col = next((c for c in df_base.columns if any(x in c for x in ['купів', 'buy', 'покуп'])), None)
        sell_col = next((c for c in df_base.columns if any(x in c for x in ['прода', 'sell'])), None)
        flag_col = next((c for c in df_base.columns if any(x in c for x in ['прапор', 'flag'])), None)
        
        # Heuristic: If code_col looks like "Name" (e.g. "Назва валюти"), try searching for 3-letter codes
        # (This is handled by ensuring code_col avoids 'назва' above, but let's keep logic safe)
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
            for _, row in df_base.iterrows():
                try:
                    code_val = row[code_col]
                    if pd.isna(code_val): continue
                    code = str(code_val).strip().upper()
                    if len(code) != 3: continue
                    
                    buy_rate = float(row[buy_col])
                    sell_rate = float(row[sell_col])
                    
                    if buy_rate <= 0 or sell_rate <= 0: continue
                    
                    # Determine Flag
                    flag = "🏳️"
                    if flag_col and pd.notna(row[flag_col]):
                        flag = str(row[flag_col]).strip()
                    else:
                        flag = CURRENCY_FLAGS.get(code, "🏳️")

                    # Determine Name
                    name_uk = None
                    if name_col and pd.notna(row[name_col]):
                        name_uk = str(row[name_col]).strip()
                    
                    # Upsert Currency (Base Rate)
                    curr_db = db.query(models.Currency).filter(models.Currency.code == code).first()
                    if curr_db:
                        curr_db.buy_rate = buy_rate
                        curr_db.sell_rate = sell_rate
                        curr_db.is_active = True
                        if not curr_db.flag or (flag_col and pd.notna(row[flag_col])):
                            curr_db.flag = flag
                        if name_uk:
                             curr_db.name_uk = name_uk
                             # Optional: update 'name' too if you want English to follow suit or keep as is?
                             # Assuming 'name' can be same as name_uk for simplicity if one provided
                             curr_db.name = name_uk 
                        base_updated += 1
                    else:
                        names = CURRENCY_NAMES.get(code, (code, code))
                        # Override if name fetched from excel
                        final_name = name_uk if name_uk else names[0]
                        final_name_uk = name_uk if name_uk else names[1]
                        
                        new_currency = models.Currency(
                            code=code, name=final_name, name_uk=final_name_uk,
                            buy_rate=buy_rate, sell_rate=sell_rate,
                            flag=flag,
                            is_active=True, is_popular=code in POPULAR_CURRENCIES
                        )
                        db.add(new_currency)
                        base_updated += 1
                        
                    # Update cache
                    existing_cache = next((c for c in currencies_data if c.code == code), None)
                    if existing_cache:
                        existing_cache.buy_rate = buy_rate
                        existing_cache.sell_rate = sell_rate
                
                except Exception as e:
                    # errors.append(f"Базові курси {code}: {str(e)}")
                    pass
            
            db.commit()
        
        # 2. Process BRANCH RATES
        branch_sheet = None
        if 'відділення' in sheet_names:
            branch_sheet = xlsx.sheet_names[sheet_names.index('відділення')]
        elif 'branches' in sheet_names:
            branch_sheet = xlsx.sheet_names[sheet_names.index('branches')]
        elif 'філії' in sheet_names:
            branch_sheet = xlsx.sheet_names[sheet_names.index('філії')]
        elif base_sheet:
            # Fallback: Check if base_sheet contains branch columns
            # This supports the single-sheet hybrid format
            branch_sheet = base_sheet
            
        if branch_sheet:
            df_branch = pd.read_excel(xlsx, sheet_name=branch_sheet)
            
            # Deduplicate columns (handle '$' and '$ ' becoming same after strip)
            new_cols = []
            counts = {}
            for col in df_branch.columns:
                c_clean = str(col).strip().lower()
                if c_clean in counts:
                    counts[c_clean] += 1
                    new_cols.append(f"{c_clean}_{counts[c_clean]}")
                else:
                    counts[c_clean] = 0
                    new_cols.append(c_clean)
            df_branch.columns = new_cols
            
            # Check format type
            has_branch_col = any(x in c for c in df_branch.columns for x in ['відділ', 'branch', 'філі', 'каса', 'cashier'])
            
            if has_branch_col:
                # Vertical Format OR Hybrid Matrix (Row=Branch)
                branch_col_name = next((c for c in df_branch.columns if any(x in c for x in ['відділ', 'branch', 'філі'])), None)
                cashier_col_name = next((c for c in df_branch.columns if any(x in c for x in ['каса', 'cashier', 'касир'])), None)
                code_col_b = next((c for c in df_branch.columns if any(x in c for x in ['код', 'code', 'валют'])), None)
                buy_col_b = next((c for c in df_branch.columns if any(x in c for x in ['купів', 'buy'])), None)
                sell_col_b = next((c for c in df_branch.columns if any(x in c for x in ['прода', 'sell'])), None)

                # Check for Branch Matrix Cols (Hybrid)
                # Map lower cased symbols to codes
                curr_map = {'$': 'USD', '€': 'EUR', 'pln': 'PLN', 'zł': 'PLN', 'gbp': 'GBP', 'chf': 'CHF'}
                matrix_cols = []
                for idx, col in enumerate(df_branch.columns):
                    c_clean = str(col).strip() # already lower cased by deduplication
                    found_curr = None
                    
                    # Exact match to find the "Buy" column (the first one, no suffix)
                    if c_clean in curr_map:
                        found_curr = curr_map[c_clean]
                    
                    # If we found a "Buy" column, the next one is "Sell"
                    if found_curr and idx + 1 < len(df_branch.columns):
                         matrix_cols.append({'code': found_curr, 'buy_idx': idx, 'sell_idx': idx + 1})

                # Determine Mode
                use_hybrid = len(matrix_cols) > 0
                
                # Cache branches for cashier lookup if needed
                branch_cashier_map = {}
                if cashier_col_name:
                     all_branches = db.query(models.Branch).all()
                     for b in all_branches:
                         if b.cashier:
                             branch_cashier_map[b.cashier.strip().lower()] = b.id

                for _, row in df_branch.iterrows():
                    try:
                        branch_id = None
                        # Resolve Branch ID
                        if branch_col_name and pd.notna(row[branch_col_name]):
                            try:
                                bid_val = row[branch_col_name]
                                if isinstance(bid_val, (int, float)):
                                    branch_id = int(bid_val)
                                else:
                                    branch_id = int(str(bid_val).strip())
                            except: pass
                        
                        if not branch_id and cashier_col_name and pd.notna(row[cashier_col_name]):
                            c_val = str(row[cashier_col_name]).strip().lower()
                            branch_id = branch_cashier_map.get(c_val)
                        
                        if not branch_id: continue

                        # 1. Process Matrix Columns (Hybrid/Row-Matrix)
                        if use_hybrid:
                            for mc in matrix_cols:
                                try:
                                    buy_val = row.iloc[mc['buy_idx']]
                                    sell_val = row.iloc[mc['sell_idx']]
                                    if pd.isna(buy_val) or pd.isna(sell_val): continue
                                    buy = float(buy_val)
                                    sell = float(sell_val)
                                    
                                    # Upsert
                                    rate_entry = db.query(models.BranchRate).filter(
                                        models.BranchRate.branch_id == branch_id,
                                        models.BranchRate.currency_code == mc['code']
                                    ).first()
                                    if rate_entry:
                                        rate_entry.buy_rate = buy
                                        rate_entry.sell_rate = sell
                                        rate_entry.is_active = True
                                    else:
                                        key_active = db.query(models.Currency).filter(models.Currency.code == mc['code']).first()
                                        if key_active:
                                            db.add(models.BranchRate(branch_id=branch_id, currency_code=mc['code'], buy_rate=buy, sell_rate=sell, is_active=True))
                                    branch_updated += 1
                                except: pass
                            
                            # IMPORTANT: In Hybrid mode, we IGNORE the legacy vertical columns (like NOK in row 3).
                            # This ensures that minor currencies use the Base Rate (Global) as instructed by user.
                            
                            # CLEANUP: Remove any BranchRates for this branch that were NOT in the matrix_cols
                            # The user wants "Exactly 5" (or whatever is in the file). Residual data must go.
                            updated_codes = [mc['code'] for mc in matrix_cols]
                            db.query(models.BranchRate).filter(
                                models.BranchRate.branch_id == branch_id,
                                models.BranchRate.currency_code.notin_(updated_codes)
                            ).delete(synchronize_session=False)

                            pass

                        # 2. Process Vertical Columns (ONLY if NOT hybrid OR fallback needed)
                        elif all([code_col_b, buy_col_b, sell_col_b]):
                            try:
                                code = str(row[code_col_b]).strip().upper()
                                buy = float(row[buy_col_b])
                                sell = float(row[sell_col_b])
                                
                                rate_entry = db.query(models.BranchRate).filter(
                                    models.BranchRate.branch_id == branch_id,
                                    models.BranchRate.currency_code == code
                                ).first()
                                if rate_entry:
                                    rate_entry.buy_rate = buy
                                    rate_entry.sell_rate = sell
                                    rate_entry.is_active = True
                                else:
                                    key_active = db.query(models.Currency).filter(models.Currency.code == code).first()
                                    if key_active:
                                        db.add(models.BranchRate(branch_id=branch_id, currency_code=code, buy_rate=buy, sell_rate=sell, is_active=True))
                                branch_updated += 1
                            except: pass

                    except Exception as e:
                        errors.append(f"Відділення (ряд): {str(e)}")
            else:
                # Matrix Format (Legacy: Row=Currency, Cols=Branches[1_buy, 1_sell])
                code_col_b = next((c for c in df_branch.columns if any(x in c for x in ['код', 'code', 'валют'])), df_branch.columns[0])
                
                branch_cols = {}
                for col in df_branch.columns:
                    if col == code_col_b: continue
                    import re
                    match = re.search(r'(\d+)', col)
                    if match:
                        bid = int(match.group(1))
                        if bid not in branch_cols: branch_cols[bid] = {}
                        if any(x in col for x in ['купів', 'buy']): branch_cols[bid]['buy'] = col
                        elif any(x in col for x in ['прода', 'sell']): branch_cols[bid]['sell'] = col
                
                for _, row in df_branch.iterrows():
                    try:
                        code = str(row[code_col_b]).strip().upper()
                        if not code or code == 'NAN': continue
                        
                        for bid, cols in branch_cols.items():
                            if 'buy' in cols and 'sell' in cols:
                                try:
                                    buy = float(row[cols['buy']])
                                    sell = float(row[cols['sell']])
                                    
                                    rate_entry = db.query(models.BranchRate).filter(
                                        models.BranchRate.branch_id == bid,
                                        models.BranchRate.currency_code == code
                                    ).first()
                                    
                                    if rate_entry:
                                        rate_entry.buy_rate = buy
                                        rate_entry.sell_rate = sell
                                    else:
                                        key_active = db.query(models.Currency).filter(models.Currency.code == code).first()
                                        if key_active:
                                            db.add(models.BranchRate(
                                                branch_id=bid,
                                                currency_code=code,
                                                buy_rate=buy,
                                                sell_rate=sell
                                            ))
                                    branch_updated += 1
                                except: pass
                    except Exception as e:
                        errors.append(f"Відділення (матриця): {str(e)}")

            db.commit()

        rates_updated_at = datetime.now()
        
        return RatesUploadResponseV2(
            success=True,
            message=f"Курси оновлено о {rates_updated_at.strftime('%H:%M:%S')}",
            base_rates_updated=base_updated,
            branch_rates_updated=branch_updated,
            errors=errors[:10]
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Помилка обробки файлу: {str(e)}")

@app.get("/api/admin/rates/template")
async def download_rates_template(
    user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Download Excel template for rates upload with all sheets"""
    from fastapi.responses import StreamingResponse
    import pandas as pd
    
    output = io.BytesIO()
    
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        # Single Sheet "Курси"
        
        # 1. Prepare Columns
        # Standard columns
        columns = ['каса']
        
        # Matrix Columns for Major Currencies
        # User requested: $, €, zł, GBP, CHF
        matrix_map = {
            'USD': '$', 
            'EUR': '€', 
            'PLN': 'zł', 
            'GBP': 'GBP', 
            'CHF': 'CHF'
        }
        # Order matters: USD, EUR, PLN, GBP, CHF
        major_codes = ['USD', 'EUR', 'PLN', 'GBP', 'CHF']
        
        # We need headers. Pandas does not easily support merged cells or "Buy/Sell" under "$" in one pass easily.
        # We will use "Symbol" for Buy and "Symbol Sell" for Sell, effectively.
        # Or better: Just alternating columns. 
        # But to match user format exactly with merged headers requires openpyxl manipulation.
        # For now, we will name columns: "$", "$ ", "€", "€ " (using space to distinguish).
        
        for code in major_codes:
            sym = matrix_map.get(code, code)
            columns.append(sym)        # Buy
            columns.append(sym + ' ')  # Sell (space to differentiate)

        # Base Rate Columns at end
        columns.extend(['Прапор', 'Назва валюти', 'Купівля', 'Продаж', 'Код валюти'])

        data_rows = []

        # 2. Add Base Rates (Minor Currencies)
        # These are rows where 'каса' is Empty.
        # We place them at the top.
        currencies = db.query(models.Currency).order_by(models.Currency.order).all()
        for c in currencies:
            if c.code in major_codes: continue # Skip major, they are in matrix
            
            row = {col: None for col in columns}
            row['Прапор'] = c.flag
            row['Назва валюти'] = c.name_uk
            row['Купівля'] = c.buy_rate
            row['Продаж'] = c.sell_rate
            row['Код валюти'] = c.code # Helper for import logic
            data_rows.append(row)

        # 3. Add Branch Rows (Matrix)
        branches = db.query(models.Branch).all()
        all_rates = db.query(models.BranchRate).all()
        # Map: (branch_id, code) -> rate
        rates_map = {(r.branch_id, r.currency_code): r for r in all_rates} # Fixed indentation

        for branch in branches:
            row = {col: None for col in columns}
            row['каса'] = branch.cashier if branch.cashier else f"{branch.id} {branch.address}"
            
            for code in major_codes:
                rate = rates_map.get((branch.id, code))
                
                # If no branch rate, maybe show base rate? 
                # User said "different price". If not set, show 0 or base?
                # Better to show current DB state.
                buy = rate.buy_rate if rate else 0.0
                sell = rate.sell_rate if rate else 0.0
                
                sym = matrix_map.get(code, code)
                row[sym] = buy
                row[sym + ' '] = sell
            
            data_rows.append(row)
            
        pd.DataFrame(data_rows, columns=columns).to_excel(writer, index=False, sheet_name='Курси')
    
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=rates_template.xlsx"}
    )



@app.get("/api/rates/cross")
async def get_cross_rates(db: Session = Depends(get_db)):
    """Get all cross-rates (calculates common pairs dynamically)"""
    # Common pairs to show
    common_pairs = ["EUR/USD", "GBP/USD", "USD/PLN", "EUR/PLN"]
    results = {}
    
    for pair in common_pairs:
        parts = pair.split('/')
        base_r = db.query(models.BranchRate).filter(models.BranchRate.branch_id == 1, models.BranchRate.currency_code == parts[0]).first()
        quote_r = db.query(models.BranchRate).filter(models.BranchRate.branch_id == 1, models.BranchRate.currency_code == parts[1]).first()
        
        if base_r and quote_r:
            results[pair] = {
                "base": parts[0],
                "quote": parts[1],
                "buy": round(base_r.buy_rate / quote_r.sell_rate, 4),
                "sell": round(base_r.sell_rate / quote_r.buy_rate, 4),
                "calculated": True
            }
    
    return {
        "updated_at": rates_updated_at.isoformat(),
        "cross_rates": results
    }

@app.get("/api/rates/cross/{pair}")
async def get_cross_rate(pair: str, db: Session = Depends(get_db)):
    """Get specific cross-rate (e.g., EUR/USD)"""
    pair = pair.upper()
    parts = pair.split('/')
    if len(parts) != 2:
        raise HTTPException(status_code=400, detail="Invalid pair format. Use BASE/QUOTE")
    
    base_r = db.query(models.BranchRate).filter(models.BranchRate.branch_id == 1, models.BranchRate.currency_code == parts[0]).first()
    quote_r = db.query(models.BranchRate).filter(models.BranchRate.branch_id == 1, models.BranchRate.currency_code == parts[1]).first()
    
    if not base_r or not quote_r:
        raise HTTPException(status_code=404, detail="Currency not found")
        
    return {
        "pair": pair,
        "base": parts[0],
        "quote": parts[1],
        "buy": round(base_r.buy_rate / quote_r.sell_rate, 4),
        "sell": round(base_r.sell_rate / quote_r.buy_rate, 4),
        "calculated": True
    }

@app.get("/api/calculate/cross")
async def calculate_cross_exchange(
    amount: float,
    from_currency: str,
    to_currency: str,
    db: Session = Depends(get_db)
):
    """Calculate exchange using automatic 2-step conversion via UAH"""
    from_currency = from_currency.upper()
    to_currency = to_currency.upper()
    
    if from_currency == to_currency:
        return {"from_amount": amount, "to_amount": amount, "rate": 1.0}
    
    # Calculate via UAH
    # Step 1: FROM -> UAH (Buy rate for from_currency)
    # Step 2: UAH -> TO (Sell rate for to_currency)
    
    from_r = db.query(models.BranchRate).filter(models.BranchRate.branch_id == 1, models.BranchRate.currency_code == from_currency).first()
    to_r = db.query(models.BranchRate).filter(models.BranchRate.branch_id == 1, models.BranchRate.currency_code == to_currency).first()
    
    if from_currency == "UAH":
        if not to_r:
            raise HTTPException(status_code=404, detail=f"Currency {to_currency} not found")
        to_amount = amount / to_r.sell_rate
        effective_rate = 1 / to_r.sell_rate
    elif to_currency == "UAH":
        if not from_r:
            raise HTTPException(status_code=404, detail=f"Currency {from_currency} not found")
        to_amount = amount * from_r.buy_rate
        effective_rate = from_r.buy_rate
    else:
        if not from_r or not to_r:
            raise HTTPException(status_code=404, detail="Currency not found")
        
        # FROM -> UAH -> TO
        uah_amount = amount * from_r.buy_rate
        to_amount = uah_amount / to_r.sell_rate
        effective_rate = from_r.buy_rate / to_r.sell_rate
    
    return {
        "from_amount": amount,
        "from_currency": from_currency,
        "to_amount": round(to_amount, 2),
        "to_currency": to_currency,
        "rate": round(effective_rate, 4),
        "pair": f"{from_currency}/{to_currency} (auto-calc via UAH)"
    }

class BranchRateUpdate(BaseModel):
    buy_rate: Optional[float] = None
    sell_rate: Optional[float] = None
    is_active: Optional[bool] = None

@app.put("/api/admin/rates/branch/{branch_id}/{currency_code}")
async def update_branch_rate(
    branch_id: int,
    currency_code: str,
    data: BranchRateUpdate,
    user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Update or create branch specific rate"""
    currency_code = currency_code.upper()
    
    # Check if rate exists
    rate = db.query(models.BranchRate).filter(
        models.BranchRate.branch_id == branch_id,
        models.BranchRate.currency_code == currency_code
    ).first()
    
    # SPECIAL LOGIC: "Reset to Base" for Minor Currencies
    # If user toggles "Active" (True) for a minor currency (e.g. CAD),
    # and implies no price change (None), we should DELETE the override
    # so it falls back to Base Rate (Dynamic).
    MAJOR_CURS = ['USD', 'EUR', 'PLN', 'GBP', 'CHF']
    
    # Only if we are just toggling (prices are None)
    if data.buy_rate is None and data.sell_rate is None:
        if currency_code not in MAJOR_CURS:
            if data.is_active is True:
                # User wants to ENABLE it.
                # Use Base Rate -> Delete Branch Override
                if rate:
                    db.delete(rate)
                    db.commit()
                return {"message": "Reverted to Base Rate"}
                
    if not rate:
        # Create new rate if it doesn't exist
        rate = models.BranchRate(
            branch_id=branch_id,
            currency_code=currency_code,
            buy_rate=data.buy_rate if data.buy_rate is not None else 0.0,
            sell_rate=data.sell_rate if data.sell_rate is not None else 0.0,
            is_active=data.is_active if data.is_active is not None else True
        )
        db.add(rate)
    else:
        # Update existing
        if data.buy_rate is not None:
            rate.buy_rate = data.buy_rate
        if data.sell_rate is not None:
            rate.sell_rate = data.sell_rate
        if data.is_active is not None:
            rate.is_active = data.is_active
        if data.sell_rate is not None:
            rate.sell_rate = data.sell_rate
        if data.is_active is not None:
            rate.is_active = data.is_active
            
    db.commit()
    return {"success": True}

@app.get("/api/admin/rates/all")
async def get_all_rates_admin(user: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    """Get all rates including branch-specific and cross-rates (Admin only)"""
    
    # Base rates (Global list)
    base_rates = {
        c.code: {"buy": c.buy_rate, "sell": c.sell_rate, "name": c.name_uk} 
        for c in currencies_data
    }
    
    # Branches (DB)
    branches_list = db.query(models.Branch).all()
    branches_out = [{"id": b.id, "address": b.address} for b in branches_list]
    
    # Branch rates (DB)
    branch_rates_rows = db.query(models.BranchRate).all()
    branch_rates = {}
    
    for br in branch_rates_rows:
        if br.branch_id not in branch_rates:
            branch_rates[br.branch_id] = {}
        branch_rates[br.branch_id][br.currency_code] = {
            "buy": br.buy_rate,
            "sell": br.sell_rate,
            "is_active": br.is_active
        }
        
    return {
        "updated_at": rates_updated_at.isoformat(),
        "base_rates": base_rates,
        "branch_rates": branch_rates,
        "branches": branches_out
    }

@app.get("/api/admin/dashboard", response_model=DashboardStats)
async def get_admin_dashboard(user: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    """Get admin dashboard statistics"""
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    
    total = db.query(models.Reservation).count()
    pending = db.query(models.Reservation).filter(
        models.Reservation.status.in_([models.ReservationStatus.PENDING, models.ReservationStatus.PENDING_ADMIN])
    ).count()
    confirmed = db.query(models.Reservation).filter(models.Reservation.status == models.ReservationStatus.CONFIRMED).count()
    completed_today = db.query(models.Reservation).filter(
        models.Reservation.status == models.ReservationStatus.COMPLETED,
        models.Reservation.completed_at >= today_start
    ).count()
    
    total_volume = db.query(models.Reservation).filter(
        models.Reservation.get_currency == "UAH",
        models.Reservation.status == models.ReservationStatus.COMPLETED,
        models.Reservation.completed_at >= today_start
    ).with_entities(models.Reservation.get_amount).all()
    
    total_volume_uah = sum(r[0] for r in total_volume)
    
    # Calculate MONTHLY volume
    month_start = today_start.replace(day=1)
    
    total_volume_month = db.query(models.Reservation).filter(
        models.Reservation.get_currency == "UAH",
        models.Reservation.status == models.ReservationStatus.COMPLETED,
        models.Reservation.completed_at >= month_start
    ).with_entities(models.Reservation.get_amount).all()
    
    total_volume_uah_month = sum(r[0] for r in total_volume_month)
    
    return DashboardStats(
        total_reservations=total,
        pending_reservations=pending,
        confirmed_reservations=confirmed,
        completed_today=completed_today,
        total_volume_uah=total_volume_uah,
        total_volume_uah_month=total_volume_uah_month
    )

@app.get("/api/admin/reservations")
async def get_all_reservations(
    user: models.User = Depends(require_admin),
    status: Optional[models.ReservationStatus] = None,
    branch_id: Optional[int] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """Get all reservations (Admin only)"""
    query = db.query(models.Reservation)
    
    if status:
        query = query.filter(models.Reservation.status == status)
    if branch_id:
        query = query.filter(models.Reservation.branch_id == branch_id)
    
    if date_from:
        try:
            dt_from = datetime.strptime(date_from, "%Y-%m-%d")
            query = query.filter(models.Reservation.created_at >= dt_from)
        except ValueError:
            pass
            
    if date_to:
        try:
            dt_to = datetime.strptime(date_to, "%Y-%m-%d") + timedelta(days=1)
            query = query.filter(models.Reservation.created_at < dt_to)
        except ValueError:
            pass
    
    total = query.count()
    
    # Sort by created_at descending
    db_items = query.order_by(models.Reservation.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    
    items = []
    for r in db_items:
        branch = db.query(models.Branch).filter(models.Branch.id == r.branch_id).first()
        items.append(ReservationResponse(
            id=r.id,
            give_amount=r.give_amount,
            give_currency=r.give_currency,
            get_amount=r.get_amount,
            get_currency=r.get_currency,
            rate=r.rate,
            phone=r.phone,
            customer_name=r.customer_name,
            status=r.status,
            branch_id=r.branch_id,
            branch_address=branch.address if branch else None,
            created_at=r.created_at.isoformat(),
            expires_at=r.expires_at.isoformat(),
            completed_at=r.completed_at.isoformat() if r.completed_at else None,
            operator_note=r.operator_note
        ))
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }


class ReservationEdit(BaseModel):
    give_amount: Optional[float] = None
    get_amount: Optional[float] = None
    rate: Optional[float] = None
    branch_id: Optional[int] = None


@app.put("/api/admin/reservations/{reservation_id}")
async def update_reservation(
    reservation_id: int,
    data: ReservationEdit,
    user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Update reservation details (Admin only)"""
    res = db.query(models.Reservation).filter(models.Reservation.id == reservation_id).first()
    if not res:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    if data.give_amount is not None:
        res.give_amount = data.give_amount
    if data.get_amount is not None:
        res.get_amount = data.get_amount
    if data.rate is not None:
        res.rate = data.rate
    if data.branch_id is not None:
        branch = db.query(models.Branch).filter(models.Branch.id == data.branch_id).first()
        if not branch:
            raise HTTPException(status_code=400, detail="Branch not found")
        res.branch_id = data.branch_id
    
    db.commit()
    db.refresh(res)
    
    branch = db.query(models.Branch).filter(models.Branch.id == res.branch_id).first()
    return ReservationResponse(
        id=res.id,
        give_amount=res.give_amount,
        give_currency=res.give_currency,
        get_amount=res.get_amount,
        get_currency=res.get_currency,
        rate=res.rate,
        phone=res.phone,
        customer_name=res.customer_name,
        status=res.status,
        branch_id=res.branch_id,
        branch_address=branch.address if branch else None,
        created_at=res.created_at.isoformat(),
        expires_at=res.expires_at.isoformat(),
        completed_at=res.completed_at.isoformat() if res.completed_at else None,
        operator_note=res.operator_note
    )


@app.post("/api/admin/reservations/{reservation_id}/assign")
async def assign_reservation_to_operator(
    reservation_id: int,
    user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Assign reservation to operator (changes status from pending_admin to pending)"""
    res = db.query(models.Reservation).filter(models.Reservation.id == reservation_id).first()
    if not res:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    if res.status != models.ReservationStatus.PENDING_ADMIN:
        raise HTTPException(status_code=400, detail="Reservation is not in pending_admin status")
    
    if not res.branch_id:
        raise HTTPException(status_code=400, detail="Reservation must have a branch assigned")
    
    res.status = models.ReservationStatus.PENDING
    db.commit()
    db.refresh(res)
    
    branch = db.query(models.Branch).filter(models.Branch.id == res.branch_id).first()
    return ReservationResponse(
        id=res.id,
        give_amount=res.give_amount,
        give_currency=res.give_currency,
        get_amount=res.get_amount,
        get_currency=res.get_currency,
        rate=res.rate,
        phone=res.phone,
        customer_name=res.customer_name,
        status=res.status,
        branch_id=res.branch_id,
        branch_address=branch.address if branch else None,
        created_at=res.created_at.isoformat(),
        expires_at=res.expires_at.isoformat(),
        completed_at=res.completed_at.isoformat() if res.completed_at else None,
        operator_note=res.operator_note
    )


# ============== OPERATOR ENDPOINTS ==============

@app.get("/api/operator/dashboard", response_model=DashboardStats)
async def get_operator_dashboard(user: models.User = Depends(require_operator_or_admin), db: Session = Depends(get_db)):
    """Get operator dashboard statistics for their branch"""
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    
    query = db.query(models.Reservation)
    if user.role == models.UserRole.OPERATOR and user.branch_id:
        query = query.filter(models.Reservation.branch_id == user.branch_id)
    
    total = query.count()
    pending = query.filter(models.Reservation.status == models.ReservationStatus.PENDING).count()
    confirmed = query.filter(models.Reservation.status == models.ReservationStatus.CONFIRMED).count()
    completed_today = query.filter(
        models.Reservation.status == models.ReservationStatus.COMPLETED,
        models.Reservation.completed_at >= today_start
    ).count()
    
    # Volume Today
    volume_today_query = query.filter(
        models.Reservation.get_currency == "UAH",
        models.Reservation.status == models.ReservationStatus.COMPLETED,
        models.Reservation.completed_at >= today_start
    )
    total_volume_uah = sum(r.get_amount for r in volume_today_query.all())
    
    # Volume Month
    month_start = today_start.replace(day=1)
    volume_month_query = query.filter(
        models.Reservation.get_currency == "UAH",
        models.Reservation.status == models.ReservationStatus.COMPLETED,
        models.Reservation.completed_at >= month_start
    )
    total_volume_uah_month = sum(r.get_amount for r in volume_month_query.all())
    
    return DashboardStats(
        total_reservations=total,
        pending_reservations=pending,
        confirmed_reservations=confirmed,
        completed_today=completed_today,
        total_volume_uah=total_volume_uah,
        total_volume_uah_month=total_volume_uah_month
    )

@app.get("/api/operator/reservations")
async def get_branch_reservations(
    user: models.User = Depends(require_operator_or_admin),
    status: Optional[models.ReservationStatus] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """Get reservations for operator's branch"""
    query = db.query(models.Reservation)
    if user.role == models.UserRole.OPERATOR and user.branch_id:
        query = query.filter(models.Reservation.branch_id == user.branch_id)
    
    if status:
        query = query.filter(models.Reservation.status == status)
        
    if date_from:
        try:
            dt_from = datetime.strptime(date_from, "%Y-%m-%d")
            query = query.filter(models.Reservation.created_at >= dt_from)
        except ValueError:
            pass
            
    if date_to:
        try:
            dt_to = datetime.strptime(date_to, "%Y-%m-%d") + timedelta(days=1)
            query = query.filter(models.Reservation.created_at < dt_to)
        except ValueError:
            pass
    
    total = query.count()
    db_items = query.order_by(models.Reservation.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    
    items = []
    for r in db_items:
        branch = db.query(models.Branch).filter(models.Branch.id == r.branch_id).first()
        items.append(ReservationResponse(
            id=r.id,
            give_amount=r.give_amount,
            give_currency=r.give_currency,
            get_amount=r.get_amount,
            get_currency=r.get_currency,
            rate=r.rate,
            phone=r.phone,
            customer_name=r.customer_name,
            status=r.status,
            branch_id=r.branch_id,
            branch_address=branch.address if branch else None,
            created_at=r.created_at.isoformat(),
            expires_at=r.expires_at.isoformat(),
            completed_at=r.completed_at.isoformat() if r.completed_at else None,
            operator_note=r.operator_note
        ))
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

@app.put("/api/operator/reservations/{reservation_id}")
async def update_reservation(
    reservation_id: int,
    update: ReservationUpdate,
    user: models.User = Depends(require_operator_or_admin),
    db: Session = Depends(get_db)
):
    """Update reservation status (Operator)"""
    db_res = db.query(models.Reservation).filter(models.Reservation.id == reservation_id).first()
    if not db_res:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    # Check if operator has access to this reservation
    if user.role == models.UserRole.OPERATOR and user.branch_id:
        if db_res.branch_id != user.branch_id:
            raise HTTPException(status_code=403, detail="Access denied to this reservation")
    
    if update.status:
        db_res.status = update.status
        if update.status == models.ReservationStatus.COMPLETED:
            db_res.completed_at = datetime.now()
    
    if update.operator_note:
        db_res.operator_note = update.operator_note
    
    db.commit()
    db.refresh(db_res)
    
    branch = db.query(models.Branch).filter(models.Branch.id == db_res.branch_id).first()
    
    return ReservationResponse(
        id=db_res.id,
        give_amount=db_res.give_amount,
        give_currency=db_res.give_currency,
        get_amount=db_res.get_amount,
        get_currency=db_res.get_currency,
        rate=db_res.rate,
        phone=db_res.phone,
        customer_name=db_res.customer_name,
        status=db_res.status,
        branch_id=db_res.branch_id,
        branch_address=branch.address if branch else None,
        created_at=db_res.created_at.isoformat(),
        expires_at=db_res.expires_at.isoformat(),
        completed_at=db_res.completed_at.isoformat() if db_res.completed_at else None,
        operator_note=db_res.operator_note
    )

@app.post("/api/operator/reservations/{reservation_id}/confirm")
async def confirm_reservation(
    reservation_id: int,
    user: User = Depends(require_operator_or_admin),
    db: Session = Depends(get_db)
):
    """Confirm a pending reservation"""
    reservation = db.query(models.Reservation).filter(models.Reservation.id == reservation_id).first()
    
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    if user.role == models.UserRole.OPERATOR and user.branch_id:
        if reservation.branch_id != user.branch_id:
            raise HTTPException(status_code=403, detail="Access denied")
    
    if reservation.status != models.ReservationStatus.PENDING:
        raise HTTPException(status_code=400, detail="Can only confirm pending reservations")
    
    reservation.status = models.ReservationStatus.CONFIRMED
    db.commit()
    db.refresh(reservation)
    return reservation

@app.post("/api/operator/reservations/{reservation_id}/complete")
async def complete_reservation(
    reservation_id: int,
    user: User = Depends(require_operator_or_admin),
    db: Session = Depends(get_db)
):
    """Mark reservation as completed"""
    reservation = db.query(models.Reservation).filter(models.Reservation.id == reservation_id).first()
    
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    if user.role == models.UserRole.OPERATOR and user.branch_id:
        if reservation.branch_id != user.branch_id:
            raise HTTPException(status_code=403, detail="Access denied")
    
    if reservation.status not in [models.ReservationStatus.PENDING, models.ReservationStatus.CONFIRMED]:
        raise HTTPException(status_code=400, detail="Cannot complete this reservation")
    
    reservation.status = models.ReservationStatus.COMPLETED
    reservation.completed_at = datetime.now()
    db.commit()
    db.refresh(reservation)
    return reservation

@app.post("/api/operator/reservations/{reservation_id}/cancel")
async def cancel_reservation(
    reservation_id: int,
    user: User = Depends(require_operator_or_admin),
    db: Session = Depends(get_db)
):
    """Cancel a reservation"""
    reservation = db.query(models.Reservation).filter(models.Reservation.id == reservation_id).first()
    
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    if user.role == models.UserRole.OPERATOR and user.branch_id:
        if reservation.branch_id != user.branch_id:
            raise HTTPException(status_code=403, detail="Access denied")
    
    if reservation.status == models.ReservationStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Cannot cancel completed reservation")
    
    reservation.status = models.ReservationStatus.CANCELLED
    db.commit()
    db.refresh(reservation)
    return reservation


# ============== PUBLIC SETTINGS ENDPOINTS ==============

@app.get("/api/settings")
async def get_public_settings(db: Session = Depends(get_db)):
    """Get public site settings"""
    settings = db.query(models.SiteSettings).first()
    if not settings:
        # Create default if absolutely missing
        settings = models.SiteSettings()
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings

@app.get("/api/faq", response_model=List[FAQItem])
async def get_faq(db: Session = Depends(get_db)):
    """Get FAQ items"""
    return db.query(models.FAQItem).order_by(models.FAQItem.order).all()

@app.get("/api/services", response_model=List[ServiceItem])
async def get_services(db: Session = Depends(get_db)):
    """Get services"""
    return db.query(models.ServiceItem).filter(models.ServiceItem.is_active == True).order_by(models.ServiceItem.order).all()

@app.get("/api/articles", response_model=List[ArticleItem])
async def get_articles(db: Session = Depends(get_db)):
    """Get published articles"""
    return db.query(models.ArticleItem).filter(models.ArticleItem.is_published == True).order_by(models.ArticleItem.created_at.desc()).all()

@app.get("/api/articles/{article_id}", response_model=ArticleItem)
async def get_article(article_id: int, db: Session = Depends(get_db)):
    """Get single article"""
    article = db.query(models.ArticleItem).filter(models.ArticleItem.id == article_id, models.ArticleItem.is_published == True).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return article


# ============== ADMIN SETTINGS ENDPOINTS ==============

@app.get("/api/admin/settings")
async def get_admin_settings(user: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    """Get all settings (Admin only)"""
    return {
        "site": db.query(models.SiteSettings).first(),
        "faq": db.query(models.FAQItem).all(),
        "services": db.query(models.ServiceItem).all(),
        "articles": db.query(models.ArticleItem).all(),
    }

@app.put("/api/admin/settings")
async def update_settings(settings: SiteSettings, user: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    """Update site settings (Admin only)"""
    db_settings = db.query(models.SiteSettings).first()
    if not db_settings:
        db_settings = models.SiteSettings()
        db.add(db_settings)
    
    # Update fields
    for key, value in settings.dict().items():
        setattr(db_settings, key, value)
    
    db.commit()
    return {"success": True, "message": "Налаштування оновлено"}

@app.get("/api/admin/faq")
async def get_admin_faq(user: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    """Get all FAQ items (Admin only)"""
    return db.query(models.FAQItem).order_by(models.FAQItem.order).all()

@app.post("/api/admin/faq")
async def create_faq(item: FAQItem, user: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    """Create FAQ item"""
    db_item = models.FAQItem(
        question=item.question,
        answer=item.answer,
        link_text=item.link_text,
        link_url=item.link_url,
        order=item.order
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@app.put("/api/admin/faq/{faq_id}")
async def update_faq(faq_id: int, item: FAQItem, user: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    """Update FAQ item"""
    db_item = db.query(models.FAQItem).filter(models.FAQItem.id == faq_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="FAQ not found")
    
    db_item.question = item.question
    db_item.answer = item.answer
    db_item.link_text = item.link_text
    db_item.link_url = item.link_url
    db_item.order = item.order
    
    db.commit()
    db.refresh(db_item)
    return db_item

@app.delete("/api/admin/faq/{faq_id}")
async def delete_faq(faq_id: int, user: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    """Delete FAQ item"""
    db_item = db.query(models.FAQItem).filter(models.FAQItem.id == faq_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="FAQ not found")
    db.delete(db_item)
    db.commit()
    return {"success": True}

@app.get("/api/admin/services")
async def get_admin_services(user: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    """Get all services (Admin only)"""
    return db.query(models.ServiceItem).order_by(models.ServiceItem.order).all()

@app.post("/api/admin/services")
async def create_service(item: ServiceItem, user: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    """Create service"""
    db_item = models.ServiceItem(
        title=item.title,
        description=item.description,
        image_url=item.image_url,
        link_url=item.link_url,
        is_active=item.is_active,
        order=item.order
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@app.put("/api/admin/services/{service_id}")
async def update_service(service_id: int, item: ServiceItem, user: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    """Update service"""
    db_item = db.query(models.ServiceItem).filter(models.ServiceItem.id == service_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Service not found")
    
    db_item.title = item.title
    db_item.description = item.description
    db_item.image_url = item.image_url
    db_item.link_url = item.link_url
    db_item.is_active = item.is_active
    db_item.order = item.order
    
    db.commit()
    db.refresh(db_item)
    return db_item

@app.delete("/api/admin/services/{service_id}")
async def delete_service(service_id: int, user: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    """Delete service"""
    db_item = db.query(models.ServiceItem).filter(models.ServiceItem.id == service_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Service not found")
    db.delete(db_item)
    db.commit()
    return {"success": True}


# ============== ADMIN BRANCH MANAGEMENT ==============

class BranchCreate(BaseModel):
    address: str
    hours: str = "щодня: 9:00-20:00"
    lat: Optional[float] = None
    lng: Optional[float] = None
    is_open: bool = True
    phone: Optional[str] = None
    telegram_chat: Optional[str] = None
    cashier: Optional[str] = None

class BranchUpdate(BaseModel):
    address: Optional[str] = None
    hours: Optional[str] = None
    phone: Optional[str] = None
    telegram_chat: Optional[str] = None
    cashier: Optional[str] = None
    is_open: Optional[bool] = None

@app.get("/api/admin/branches")
async def get_admin_branches(user: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    """Get all branches with full details"""
    return db.query(models.Branch).all()

@app.put("/api/admin/branches/{branch_id}")
async def update_branch(branch_id: int, update: BranchUpdate, user: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    """Update branch info"""
    branch = db.query(models.Branch).filter(models.Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    
    if update.address is not None:
        branch.address = update.address
    if update.hours is not None:
        branch.hours = update.hours
    if update.phone is not None:
        branch.phone = update.phone
    if update.telegram_chat is not None:
        branch.telegram_chat = update.telegram_chat
    if update.cashier is not None:
        branch.cashier = update.cashier
    if update.is_open is not None:
        branch.is_open = update.is_open
    
    # Auto-geocode if address changed
    if update.address is not None and update.address != branch.address:
        coords = geocode_address(update.address)
        if coords:
            branch.lat = coords[0]
            branch.lng = coords[1]
    
    db.commit()
    db.refresh(branch)
    return branch

def geocode_address(address: str) -> Optional[tuple[float, float]]:
    try:
        # Enhance address with City if needed, but 'Kyiv' is usually enough if not present
        search_query = address
        if "київ" not in address.lower() and "kyiv" not in address.lower():
            search_query += ", Київ"
            
        url = f"https://nominatim.openstreetmap.org/search?q={urllib.parse.quote(search_query)}&format=json&limit=1"
        req = urllib.request.Request(url, headers={'User-Agent': 'SvitValutApp/1.0'})
        
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            if data and len(data) > 0:
                lat = float(data[0]['lat'])
                lon = float(data[0]['lon'])
                return (lat, lon)
    except Exception as e:
        print(f"Geocoding error for {address}: {e}")
    return None

@app.post("/api/admin/branches", response_model=Branch)
async def create_branch(branch: BranchCreate, user: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    """Create a new branch"""
    # Create new ID (simple max + 1)
    last_branch = db.query(models.Branch).order_by(models.Branch.id.desc()).first()
    new_id = (last_branch.id + 1) if last_branch else 1
    
    
    # Auto-geocode if lat/lng not provided
    geo_lat = branch.lat
    geo_lng = branch.lng
    
    if geo_lat is None or geo_lng is None:
        coords = geocode_address(branch.address)
        if coords:
            geo_lat = coords[0]
            geo_lng = coords[1]
        else:
            # Fallback to defaults if geocoding fails
            geo_lat = geo_lat or 50.4501
            geo_lng = geo_lng or 30.5234

    db_branch = models.Branch(
        id=new_id,
        address=branch.address,
        hours=branch.hours,
        lat=geo_lat,
        lng=geo_lng,
        is_open=branch.is_open,
        phone=branch.phone,
        telegram_chat=branch.telegram_chat,
        cashier=branch.cashier
    )
    db.add(db_branch)
    db.commit()
    db.refresh(db_branch)
    
    # Initialize rates for this branch using branch 1 (or default) as template
    base_rates = db.query(models.BranchRate).filter(models.BranchRate.branch_id == 1).all()
    for rate in base_rates:
        db.add(models.BranchRate(
            branch_id=db_branch.id,
            currency_code=rate.currency_code,
            buy_rate=rate.buy_rate,
            sell_rate=rate.sell_rate
        ))
    db.commit()
    
    return db_branch

@app.delete("/api/admin/branches/{branch_id}")
async def delete_branch(branch_id: int, user: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    """Delete branch"""
    branch = db.query(models.Branch).filter(models.Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    
    if branch_id == 1:
        raise HTTPException(status_code=400, detail="Cannot delete main branch")
        
    # Check if used by users
    users = db.query(models.User).filter(models.User.branch_id == branch_id).first()
    if users:
        raise HTTPException(status_code=400, detail="Cannot delete branch with assigned operators")
    
    # Delete rates first
    db.query(models.BranchRate).filter(models.BranchRate.branch_id == branch_id).delete()
    
    db.delete(branch)
    db.commit()
    return {"success": True}


# ============== ADMIN USER MANAGEMENT ==============

class UserCreate(BaseModel):
    username: str
    password: str
    name: str
    branch_id: Optional[int] = None
    role: UserRole = UserRole.OPERATOR

class UserUpdate(BaseModel):
    name: Optional[str] = None
    branch_id: Optional[int] = None
    password: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    username: str
    name: str
    role: UserRole
    branch_id: Optional[int]
    branch_address: Optional[str] = None

@app.get("/api/admin/users", response_model=List[UserResponse])
async def get_admin_users(user: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    """Get all users"""
    users = db.query(models.User).all()
    result = []
    for u in users:
        branch_address = None
        if u.branch_id:
            branch = db.query(models.Branch).filter(models.Branch.id == u.branch_id).first()
            branch_address = branch.address if branch else None
        result.append(UserResponse(
            id=u.id,
            username=u.username,
            name=u.name,
            role=UserRole(u.role.value),
            branch_id=u.branch_id,
            branch_address=branch_address
        ))
    return result

@app.post("/api/admin/users", response_model=UserResponse)
async def create_user(user_data: UserCreate, user: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    """Create new operator"""
    # Check username uniqueness
    existing = db.query(models.User).filter(models.User.username == user_data.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Validate branch if provided
    if user_data.branch_id:
        branch = db.query(models.Branch).filter(models.Branch.id == user_data.branch_id).first()
        if not branch:
            raise HTTPException(status_code=400, detail="Branch not found")
    
    new_user = models.User(
        username=user_data.username,
        password_hash=user_data.password,  # In production, hash this!
        name=user_data.name,
        role=models.UserRole[user_data.role.value.upper()],
        branch_id=user_data.branch_id
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    branch_address = None
    if new_user.branch_id:
        branch = db.query(models.Branch).filter(models.Branch.id == new_user.branch_id).first()
        branch_address = branch.address if branch else None
    
    return UserResponse(
        id=new_user.id,
        username=new_user.username,
        name=new_user.name,
        role=UserRole(new_user.role.value),
        branch_id=new_user.branch_id,
        branch_address=branch_address
    )

@app.put("/api/admin/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: int, user_data: UserUpdate, user: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    """Update user"""
    target_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user_data.name is not None:
        target_user.name = user_data.name
    if user_data.branch_id is not None:
        # Validate branch
        branch = db.query(models.Branch).filter(models.Branch.id == user_data.branch_id).first()
        if not branch:
            raise HTTPException(status_code=400, detail="Branch not found")
        target_user.branch_id = user_data.branch_id
    if user_data.password is not None and user_data.password.strip():
        target_user.password_hash = user_data.password  # In production, hash this!
    
    db.commit()
    db.refresh(target_user)
    
    branch_address = None
    if target_user.branch_id:
        branch = db.query(models.Branch).filter(models.Branch.id == target_user.branch_id).first()
        branch_address = branch.address if branch else None
    
    return UserResponse(
        id=target_user.id,
        username=target_user.username,
        name=target_user.name,
        role=UserRole(target_user.role.value),
        branch_id=target_user.branch_id,
        branch_address=branch_address
    )

@app.delete("/api/admin/users/{user_id}")
async def delete_user(user_id: int, user: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    """Delete user"""
    if user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    target_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(target_user)
    db.commit()
    return {"success": True}


# ============== ADMIN CURRENCY MANAGEMENT ==============

class CurrencyUpdate(BaseModel):
    is_active: Optional[bool] = None
    is_popular: Optional[bool] = None
    buy_rate: Optional[float] = None
    sell_rate: Optional[float] = None

@app.get("/api/admin/currencies")
async def get_admin_currencies(user: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    """Get all currencies including inactive"""
    # Query definitive list from Currency table
    currencies = db.query(models.Currency).order_by(models.Currency.order).all()
    
    result = []
    for c in currencies:
        result.append(Currency(
            code=c.code,
            name=c.name,
            name_uk=c.name_uk,
            flag=c.flag,
            buy_rate=c.buy_rate,
            sell_rate=c.sell_rate,
            is_popular=c.is_popular,
            is_active=c.is_active
        ))
    return result

@app.put("/api/admin/currencies/{code}")
async def update_currency(code: str, update: CurrencyUpdate, user: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    """Update currency settings (enable/disable, base rates)"""
    # Use Currency table for Base Rates
    c = db.query(models.Currency).filter(models.Currency.code == code.upper()).first()
    
    if not c:
        raise HTTPException(status_code=404, detail="Currency not found")
    
    if update.buy_rate is not None:
        c.buy_rate = update.buy_rate
    if update.sell_rate is not None:
        c.sell_rate = update.sell_rate
    if update.is_active is not None:
        c.is_active = update.is_active
    if update.is_popular is not None:
        c.is_popular = update.is_popular
    
    global rates_updated_at
    rates_updated_at = datetime.now()
    
    db.commit()
    db.refresh(c)
    
    return Currency(
        code=c.code,
        name=c.name,
        name_uk=c.name_uk,
        flag=c.flag,
        buy_rate=c.buy_rate,
        sell_rate=c.sell_rate,
        is_popular=c.is_popular,
        is_active=c.is_active
    )


# ============== OPERATOR RATES DOWNLOAD ==============

@app.get("/api/operator/rates/download")
async def download_operator_rates(user: models.User = Depends(require_operator_or_admin), db: Session = Depends(get_db)):
    """Download rates for operator's branch as Excel"""
    import io
    try:
        import pandas as pd
    except ImportError:
        raise HTTPException(status_code=500, detail="pandas not installed")
    
    branch_id = user.branch_id or 1
    branch = db.query(models.Branch).filter(models.Branch.id == branch_id).first()
    
    db_rates = db.query(models.BranchRate).filter(models.BranchRate.branch_id == branch_id).all()
    
    rates_data = []
    for r in db_rates:
        names = CURRENCY_NAMES.get(r.currency_code, (r.currency_code, r.currency_code))
        rates_data.append({
            'Код валюти': r.currency_code,
            'Назва': names[1],
            'Купівля': r.buy_rate,
            'Продаж': r.sell_rate,
        })
    
    if not rates_data:
        rates_data = [{'Код валюти': 'Немає даних', 'Назва': '', 'Купівля': 0, 'Продаж': 0}]
    
    df = pd.DataFrame(rates_data)
    
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Курси', index=False)
    output.seek(0)
    
    from fastapi.responses import StreamingResponse
    branch_name = branch.address if branch else 'all'
    # Clean filename
    safe_name = ''.join(c if c.isalnum() or c in '._-' else '_' for c in branch_name)
    filename = f"rates_{safe_name}.xlsx"
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{filename}"}
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
