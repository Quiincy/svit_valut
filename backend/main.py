from fastapi import FastAPI, HTTPException, UploadFile, File, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime, timedelta
from enum import Enum
import random
import secrets
import io

app = FastAPI(title="Світ Валют API", version="2.0.0")
security = HTTPBasic()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============== SITE SETTINGS ==============
class SiteSettings(BaseModel):
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

class FAQItem(BaseModel):
    id: int
    question: str
    answer: str
    link_text: Optional[str] = None
    link_url: Optional[str] = None
    order: int = 0

class ServiceItem(BaseModel):
    id: int
    title: str
    description: str
    image_url: str
    link_url: Optional[str] = None
    is_active: bool = True
    order: int = 0

class ArticleItem(BaseModel):
    id: int
    title: str
    excerpt: str
    content: str
    image_url: Optional[str] = None
    is_published: bool = True
    created_at: str

# Global settings storage
site_settings = SiteSettings()

faq_items: List[FAQItem] = [
    FAQItem(id=1, question="Як захиститися від фальшивих купюр", answer="Ми використовуємо професійне обладнання для перевірки справжності банкнот. Кожна купюра проходить детальну перевірку на спеціальних детекторах.", order=1),
    FAQItem(id=2, question="Як правильно розрахувати курс USD → EUR?", answer='Це питання детально розібрано в статті "Що таке конвертація валюти та як вірно рахувати".', link_text="Детальніше", link_url="/articles/conversion", order=2),
    FAQItem(id=3, question="Як працює міжбанк і чому курс змінюється", answer="Міжбанківський курс формується на основі попиту та пропозиції на валютному ринку між банками. Курс змінюється в залежності від економічної ситуації, новин та обсягів торгів.", order=3),
    FAQItem(id=4, question="Коли діє оптовий курс?", answer="Оптовий курс діє при обміні від 1000 USD або еквівалент в іншій валюті. Для отримання оптового курсу достатньо забронювати суму через наш сайт або зателефонувати.", order=4),
    FAQItem(id=5, question="Які банкноти вважаються зношеними?", answer="Зношеними вважаються банкноти з пошкодженнями: надриви, плями, написи, відсутні фрагменти до 40% площі. Ми приймаємо такі банкноти за спеціальним курсом.", order=5),
]

service_items: List[ServiceItem] = [
    ServiceItem(id=1, title="Приймаємо валюту, яка вийшла з обігу", description="Миттєво обміняємо старі фунти, франки, марки, та багато інших.", image_url="https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=400&h=200&fit=crop", link_url="/services/old-currency", order=1),
    ServiceItem(id=2, title="Приймаємо зношену валюту", description="Зручний спосіб позбутися непотрібних купюр.", image_url="https://images.unsplash.com/photo-1611324477757-c947df087651?w=400&h=200&fit=crop", link_url="/services/damaged-currency", order=2),
    ServiceItem(id=3, title="Старі франки на нові або USD", description="Оновіть франки які вийшли з обігу на нові або долари США.", image_url="https://images.unsplash.com/photo-1580519542036-c47de6196ba5?w=400&h=200&fit=crop", link_url="/services/old-francs", order=3),
]

articles_db: List[ArticleItem] = [
    ArticleItem(id=1, title="Що таке конвертація валюти та як вірно рахувати", excerpt="Інтерес жителів нашої країни до іноземної валюти дуже високий, тому обмін різних видів грошей у Києві є доволі затребуваною послугою.", content="Повний текст статті про конвертацію валюти...", is_published=True, created_at="2025-01-15T10:00:00"),
]

# Enums
class ReservationStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    EXPIRED = "expired"

class UserRole(str, Enum):
    ADMIN = "admin"
    OPERATOR = "operator"

# Models
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
    telegram_chat: Optional[str] = None  # Individual chat link for branch

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

# Currency flags mapping
CURRENCY_FLAGS = {
    "USD": "🇺🇸", "EUR": "🇪🇺", "PLN": "🇵🇱", "GBP": "🇬🇧", "CHF": "🇨🇭",
    "EGP": "🇪🇬", "JPY": "🇯🇵", "INR": "🇮🇳", "AUD": "🇦🇺", "CAD": "🇨🇦",
    "CZK": "🇨🇿", "TRY": "🇹🇷", "CNY": "🇨🇳", "KRW": "🇰🇷", "SEK": "🇸🇪",
    "NOK": "🇳🇴", "DKK": "🇩🇰", "HUF": "🇭🇺", "RON": "🇷🇴", "BGN": "🇧🇬",
    "UAH": "🇺🇦", "ILS": "🇮🇱", "AED": "🇦🇪", "SAR": "🇸🇦", "THB": "🇹🇭",
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

# Branch-specific rates storage
# Structure: { branch_id: { "USD": {"buy": 42.10, "sell": 42.15}, ... } }
branch_rates_db: dict = {}

# Cross-rates storage
# Structure: { "EUR/USD": {"buy": 1.08, "sell": 1.09}, ... }
cross_rates_db: dict = {}

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
    cross_rates_updated: int
    errors: List[str] = []

# Users database (in production use proper DB with hashed passwords)
users_db = {
    "admin": User(id=1, username="admin", role=UserRole.ADMIN, branch_id=None, name="Адміністратор"),
    "operator1": User(id=2, username="operator1", role=UserRole.OPERATOR, branch_id=1, name="Марія Коваленко"),
    "operator2": User(id=3, username="operator2", role=UserRole.OPERATOR, branch_id=2, name="Олексій Шевченко"),
    "operator3": User(id=4, username="operator3", role=UserRole.OPERATOR, branch_id=3, name="Ірина Бондаренко"),
    "operator4": User(id=5, username="operator4", role=UserRole.OPERATOR, branch_id=4, name="Дмитро Мельник"),
    "operator5": User(id=6, username="operator5", role=UserRole.OPERATOR, branch_id=5, name="Наталія Кравченко"),
}

# Simple password check (in production use hashed passwords)
passwords_db = {
    "admin": "admin123",
    "operator1": "op1pass",
    "operator2": "op2pass",
    "operator3": "op3pass",
    "operator4": "op4pass",
    "operator5": "op5pass",
}

# Data
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

rates_updated_at = datetime.now()

orders_data = [
    Order(id=1, address="Саксаганського, 69", type="buy", amount=3000, currency="USD", flag="🇺🇸", rate=42.05, created_at="2025-12-10T10:25:00"),
    Order(id=2, address="Саксаганського, 69", type="buy", amount=3000, currency="USD", flag="🇺🇸", rate=42.05, created_at="2025-12-10T10:20:00"),
    Order(id=3, address="Хрещатик, 22", type="sell", amount=5000, currency="EUR", flag="🇪🇺", rate=49.25, created_at="2025-12-10T10:15:00"),
    Order(id=4, address="Саксаганського, 69", type="buy", amount=3000, currency="USD", flag="🇺🇸", rate=42.05, created_at="2025-12-10T10:10:00"),
    Order(id=5, address="В. Васильківська, 110", type="buy", amount=2000, currency="GBP", flag="🇬🇧", rate=56.00, created_at="2025-12-10T10:05:00"),
    Order(id=6, address="Саксаганського, 69", type="sell", amount=10000, currency="PLN", flag="🇵🇱", rate=11.45, created_at="2025-12-10T10:00:00"),
    Order(id=7, address="Старовокзальна, 23", type="buy", amount=1500, currency="USD", flag="🇺🇸", rate=42.05, created_at="2025-12-10T09:55:00"),
    Order(id=8, address="Саксаганського, 69", type="buy", amount=3000, currency="USD", flag="🇺🇸", rate=42.05, created_at="2025-12-10T09:50:00"),
]

branches_data = [
    Branch(id=1, address="вул. Старовокзальна, 23", hours="щодня: 9:00-19:00", lat=50.4401, lng=30.4871, is_open=True, phone="(096) 048-88-81"),
    Branch(id=2, address="вул. В. Васильківська, 110", hours="щодня: 8:00-20:00", lat=50.4168, lng=30.5087, is_open=True, phone="(096) 048-88-82"),
    Branch(id=3, address="вул. В. Васильківська, 130", hours="щодня: 8:00-20:00", lat=50.4098, lng=30.5067, is_open=True, phone="(096) 048-88-83"),
    Branch(id=4, address="вул. Р. Окіпної, 2", hours="щодня: 8:00-20:00", lat=50.4358, lng=30.5598, is_open=True, phone="(096) 048-88-84"),
    Branch(id=5, address="вул. Саксаганського, 69", hours="щодня: 9:00-20:00", lat=50.4378, lng=30.5028, is_open=True, phone="(096) 048-88-85"),
]

reservations_db: List[ReservationResponse] = []

# Auth functions
def verify_credentials(credentials: HTTPBasicCredentials = Depends(security)) -> User:
    username = credentials.username
    password = credentials.password
    
    if username not in users_db or username not in passwords_db:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Basic"},
        )
    
    if not secrets.compare_digest(password.encode(), passwords_db[username].encode()):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Basic"},
        )
    
    return users_db[username]

def require_admin(user: User = Depends(verify_credentials)) -> User:
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

def require_operator_or_admin(user: User = Depends(verify_credentials)) -> User:
    if user.role not in [UserRole.ADMIN, UserRole.OPERATOR]:
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
async def get_currencies():
    """Get all available currencies with rates"""
    return currencies_data

@app.get("/api/currencies/{code}", response_model=Currency)
async def get_currency(code: str):
    """Get specific currency by code"""
    currency = next((c for c in currencies_data if c.code.upper() == code.upper()), None)
    if not currency:
        raise HTTPException(status_code=404, detail="Currency not found")
    return currency

@app.get("/api/rates")
async def get_rates():
    """Get current exchange rates"""
    return {
        "updated_at": rates_updated_at.isoformat(),
        "base": "UAH",
        "rates": {c.code: {"buy": c.buy_rate, "sell": c.sell_rate} for c in currencies_data}
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
async def get_branches():
    """Get all branches"""
    return branches_data

@app.get("/api/branches/{branch_id}", response_model=Branch)
async def get_branch(branch_id: int):
    """Get specific branch"""
    branch = next((b for b in branches_data if b.id == branch_id), None)
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    return branch

@app.post("/api/reservations", response_model=ReservationResponse)
async def create_reservation(request: ReservationRequest):
    """Create a new currency reservation"""
    from_curr = next((c for c in currencies_data if c.code.upper() == request.give_currency.upper()), None)
    
    if request.give_currency.upper() == "UAH":
        to_curr = next((c for c in currencies_data if c.code.upper() == request.get_currency.upper()), None)
        if not to_curr:
            raise HTTPException(status_code=404, detail="Currency not found")
        get_amount = request.give_amount / to_curr.sell_rate
        rate = to_curr.sell_rate
    else:
        if not from_curr:
            raise HTTPException(status_code=404, detail="Currency not found")
        get_amount = request.give_amount * from_curr.buy_rate
        rate = from_curr.buy_rate
    
    reservation_id = random.randint(10000, 99999)
    now = datetime.now()
    
    reservation = ReservationResponse(
        id=reservation_id,
        give_amount=request.give_amount,
        give_currency=request.give_currency.upper(),
        get_amount=round(get_amount, 2),
        get_currency=request.get_currency.upper(),
        rate=rate,
        phone=request.phone,
        customer_name=request.customer_name,
        status=ReservationStatus.PENDING,
        branch_id=request.branch_id,
        branch_address=get_branch_address(request.branch_id) if request.branch_id else None,
        created_at=now.isoformat(),
        expires_at=(now + timedelta(minutes=60)).isoformat()
    )
    
    reservations_db.append(reservation)
    return reservation

@app.get("/api/reservations/{reservation_id}", response_model=ReservationResponse)
async def get_reservation(reservation_id: int):
    """Get reservation by ID"""
    reservation = next((r for r in reservations_db if r.id == reservation_id), None)
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    return reservation

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
    user: User = Depends(require_admin)
):
    """Upload exchange rates from Excel file (Admin only)
    
    Supported Excel formats:
    
    1. BASIC FORMAT (Sheet: "Курси" or first sheet):
    | Код валюти | Купівля | Продаж |
    |------------|---------|--------|
    | USD        | 42.10   | 42.15  |
    
    2. BRANCH-SPECIFIC RATES (Sheet: "Відділення"):
    | Код валюти | Відділення 1 Купівля | Відділення 1 Продаж | Відділення 2 Купівля | ... |
    |------------|---------------------|---------------------|---------------------|-----|
    | USD        | 42.10               | 42.15               | 42.08               | ... |
    
    OR alternative format:
    | Відділення | Код валюти | Купівля | Продаж |
    |------------|------------|---------|--------|
    | 1          | USD        | 42.10   | 42.15  |
    | 1          | EUR        | 49.30   | 49.35  |
    | 2          | USD        | 42.08   | 42.12  |
    
    3. CROSS-RATES (Sheet: "Крос-курси"):
    | Пара    | Купівля | Продаж |
    |---------|---------|--------|
    | EUR/USD | 1.08    | 1.09   |
    | GBP/EUR | 1.17    | 1.18   |
    """
    global currencies_data, rates_updated_at, branch_rates_db, cross_rates_db
    
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
        cross_updated = 0
        
        # 1. Process BASE RATES (first sheet or "курси" sheet)
        base_sheet = None
        if 'курси' in sheet_names:
            base_sheet = xlsx.sheet_names[sheet_names.index('курси')]
        elif 'rates' in sheet_names:
            base_sheet = xlsx.sheet_names[sheet_names.index('rates')]
        else:
            base_sheet = xlsx.sheet_names[0]
        
        df_base = pd.read_excel(xlsx, sheet_name=base_sheet)
        df_base.columns = df_base.columns.str.strip().str.lower()
        
        # Find columns
        code_col = next((c for c in df_base.columns if any(x in c for x in ['код', 'code', 'валют', 'currency'])), df_base.columns[0])
        buy_col = next((c for c in df_base.columns if any(x in c for x in ['купів', 'buy', 'покуп'])), None)
        sell_col = next((c for c in df_base.columns if any(x in c for x in ['прода', 'sell'])), None)
        
        if buy_col and sell_col:
            for _, row in df_base.iterrows():
                try:
                    code = str(row[code_col]).strip().upper()
                    if not code or code == 'NAN' or len(code) > 5:
                        continue
                    
                    buy_rate = float(row[buy_col])
                    sell_rate = float(row[sell_col])
                    
                    if buy_rate <= 0 or sell_rate <= 0:
                        errors.append(f"{code}: Некоректні курси")
                        continue
                    
                    existing = next((c for c in currencies_data if c.code == code), None)
                    if existing:
                        existing.buy_rate = buy_rate
                        existing.sell_rate = sell_rate
                        base_updated += 1
                    else:
                        names = CURRENCY_NAMES.get(code, (code, code))
                        new_currency = Currency(
                            code=code, name=names[0], name_uk=names[1],
                            flag=CURRENCY_FLAGS.get(code, "🏳️"),
                            buy_rate=buy_rate, sell_rate=sell_rate,
                            is_popular=code in POPULAR_CURRENCIES
                        )
                        currencies_data.append(new_currency)
                        base_updated += 1
                except Exception as e:
                    errors.append(f"Базові курси: {str(e)}")
        
        # 2. Process BRANCH-SPECIFIC RATES
        branch_sheet = None
        if 'відділення' in sheet_names:
            branch_sheet = xlsx.sheet_names[sheet_names.index('відділення')]
        elif 'branches' in sheet_names:
            branch_sheet = xlsx.sheet_names[sheet_names.index('branches')]
        elif 'філії' in sheet_names:
            branch_sheet = xlsx.sheet_names[sheet_names.index('філії')]
        
        if branch_sheet:
            df_branch = pd.read_excel(xlsx, sheet_name=branch_sheet)
            df_branch.columns = df_branch.columns.str.strip().str.lower()
            
            # Check format type
            has_branch_col = any('відділ' in c or 'branch' in c or 'філі' in c for c in df_branch.columns)
            
            if has_branch_col:
                # Format: | Відділення | Код валюти | Купівля | Продаж |
                branch_col = next((c for c in df_branch.columns if any(x in c for x in ['відділ', 'branch', 'філі'])), None)
                code_col = next((c for c in df_branch.columns if any(x in c for x in ['код', 'code', 'валют'])), None)
                buy_col = next((c for c in df_branch.columns if any(x in c for x in ['купів', 'buy'])), None)
                sell_col = next((c for c in df_branch.columns if any(x in c for x in ['прода', 'sell'])), None)
                
                if all([branch_col, code_col, buy_col, sell_col]):
                    for _, row in df_branch.iterrows():
                        try:
                            branch_id = int(row[branch_col])
                            code = str(row[code_col]).strip().upper()
                            buy_rate = float(row[buy_col])
                            sell_rate = float(row[sell_col])
                            
                            if branch_id not in branch_rates_db:
                                branch_rates_db[branch_id] = {}
                            
                            branch_rates_db[branch_id][code] = {
                                "buy": buy_rate,
                                "sell": sell_rate
                            }
                            branch_updated += 1
                        except Exception as e:
                            errors.append(f"Відділення: {str(e)}")
            else:
                # Format: | Код валюти | Відділення 1 Купівля | Відділення 1 Продаж | ...
                code_col = next((c for c in df_branch.columns if any(x in c for x in ['код', 'code', 'валют'])), df_branch.columns[0])
                
                # Find branch columns
                branch_cols = {}
                for col in df_branch.columns:
                    if col == code_col:
                        continue
                    # Try to extract branch number
                    import re
                    match = re.search(r'(\d+)', col)
                    if match:
                        branch_id = int(match.group(1))
                        if branch_id not in branch_cols:
                            branch_cols[branch_id] = {}
                        if any(x in col.lower() for x in ['купів', 'buy']):
                            branch_cols[branch_id]['buy'] = col
                        elif any(x in col.lower() for x in ['прода', 'sell']):
                            branch_cols[branch_id]['sell'] = col
                
                for _, row in df_branch.iterrows():
                    try:
                        code = str(row[code_col]).strip().upper()
                        if not code or code == 'NAN':
                            continue
                        
                        for branch_id, cols in branch_cols.items():
                            if 'buy' in cols and 'sell' in cols:
                                buy_rate = float(row[cols['buy']])
                                sell_rate = float(row[cols['sell']])
                                
                                if branch_id not in branch_rates_db:
                                    branch_rates_db[branch_id] = {}
                                
                                branch_rates_db[branch_id][code] = {
                                    "buy": buy_rate,
                                    "sell": sell_rate
                                }
                                branch_updated += 1
                    except Exception as e:
                        errors.append(f"Відділення: {str(e)}")
        
        # 3. Process CROSS-RATES
        cross_sheet = None
        if 'крос' in ' '.join(sheet_names):
            cross_sheet = next((xlsx.sheet_names[i] for i, s in enumerate(sheet_names) if 'крос' in s), None)
        elif 'cross' in ' '.join(sheet_names):
            cross_sheet = next((xlsx.sheet_names[i] for i, s in enumerate(sheet_names) if 'cross' in s), None)
        
        if cross_sheet:
            df_cross = pd.read_excel(xlsx, sheet_name=cross_sheet)
            df_cross.columns = df_cross.columns.str.strip().str.lower()
            
            pair_col = next((c for c in df_cross.columns if any(x in c for x in ['пара', 'pair', 'крос', 'cross'])), df_cross.columns[0])
            buy_col = next((c for c in df_cross.columns if any(x in c for x in ['купів', 'buy'])), None)
            sell_col = next((c for c in df_cross.columns if any(x in c for x in ['прода', 'sell'])), None)
            
            if buy_col and sell_col:
                for _, row in df_cross.iterrows():
                    try:
                        pair = str(row[pair_col]).strip().upper()
                        if '/' not in pair:
                            continue
                        
                        buy_rate = float(row[buy_col])
                        sell_rate = float(row[sell_col])
                        
                        base, quote = pair.split('/')
                        cross_rates_db[pair] = {
                            "base": base,
                            "quote": quote,
                            "buy": buy_rate,
                            "sell": sell_rate
                        }
                        cross_updated += 1
                    except Exception as e:
                        errors.append(f"Крос-курси: {str(e)}")
        
        rates_updated_at = datetime.now()
        
        return RatesUploadResponseV2(
            success=True,
            message=f"Курси оновлено о {rates_updated_at.strftime('%H:%M:%S')}",
            base_rates_updated=base_updated,
            branch_rates_updated=branch_updated,
            cross_rates_updated=cross_updated,
            errors=errors[:10]  # Limit errors
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Помилка обробки файлу: {str(e)}")

@app.get("/api/admin/rates/template")
async def download_rates_template(user: User = Depends(require_admin)):
    """Download Excel template for rates upload with all sheets"""
    from fastapi.responses import StreamingResponse
    import pandas as pd
    
    output = io.BytesIO()
    
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        # Sheet 1: Base rates
        base_data = {
            'Код валюти': [c.code for c in currencies_data],
            'Назва': [c.name_uk for c in currencies_data],
            'Купівля': [c.buy_rate for c in currencies_data],
            'Продаж': [c.sell_rate for c in currencies_data],
        }
        pd.DataFrame(base_data).to_excel(writer, index=False, sheet_name='Курси')
        
        # Sheet 2: Branch rates (vertical format)
        branch_rows = []
        for branch in branches_data:
            for c in currencies_data[:5]:  # Top 5 currencies
                rates = branch_rates_db.get(branch.id, {}).get(c.code, {"buy": c.buy_rate, "sell": c.sell_rate})
                branch_rows.append({
                    'Відділення': branch.id,
                    'Адреса': branch.address,
                    'Код валюти': c.code,
                    'Купівля': rates["buy"],
                    'Продаж': rates["sell"],
                })
        pd.DataFrame(branch_rows).to_excel(writer, index=False, sheet_name='Відділення')
        
        # Sheet 3: Cross-rates
        cross_data = {
            'Пара': ['EUR/USD', 'GBP/USD', 'GBP/EUR', 'CHF/USD', 'PLN/EUR'],
            'Купівля': [
                cross_rates_db.get('EUR/USD', {}).get('buy', 1.08),
                cross_rates_db.get('GBP/USD', {}).get('buy', 1.27),
                cross_rates_db.get('GBP/EUR', {}).get('buy', 1.17),
                cross_rates_db.get('CHF/USD', {}).get('buy', 1.13),
                cross_rates_db.get('PLN/EUR', {}).get('buy', 0.23),
            ],
            'Продаж': [
                cross_rates_db.get('EUR/USD', {}).get('sell', 1.09),
                cross_rates_db.get('GBP/USD', {}).get('sell', 1.28),
                cross_rates_db.get('GBP/EUR', {}).get('sell', 1.18),
                cross_rates_db.get('CHF/USD', {}).get('sell', 1.14),
                cross_rates_db.get('PLN/EUR', {}).get('sell', 0.24),
            ],
        }
        pd.DataFrame(cross_data).to_excel(writer, index=False, sheet_name='Крос-курси')
    
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=rates_template.xlsx"}
    )

@app.get("/api/rates/branch/{branch_id}")
async def get_branch_rates(branch_id: int):
    """Get rates for specific branch"""
    branch = next((b for b in branches_data if b.id == branch_id), None)
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    
    branch_specific = branch_rates_db.get(branch_id, {})
    
    rates = {}
    for c in currencies_data:
        if c.code in branch_specific:
            rates[c.code] = branch_specific[c.code]
        else:
            rates[c.code] = {"buy": c.buy_rate, "sell": c.sell_rate}
    
    return {
        "branch_id": branch_id,
        "branch_address": branch.address,
        "updated_at": rates_updated_at.isoformat(),
        "rates": rates
    }

@app.get("/api/rates/cross")
async def get_cross_rates():
    """Get all cross-rates"""
    return {
        "updated_at": rates_updated_at.isoformat(),
        "cross_rates": cross_rates_db
    }

@app.get("/api/rates/cross/{pair}")
async def get_cross_rate(pair: str):
    """Get specific cross-rate (e.g., EUR/USD)"""
    pair = pair.upper()
    if pair not in cross_rates_db:
        # Try to calculate from base rates
        parts = pair.split('/')
        if len(parts) == 2:
            base_curr = next((c for c in currencies_data if c.code == parts[0]), None)
            quote_curr = next((c for c in currencies_data if c.code == parts[1]), None)
            
            if base_curr and quote_curr:
                # Calculate cross rate: BASE/QUOTE = (BASE/UAH) / (QUOTE/UAH)
                buy_rate = round(base_curr.buy_rate / quote_curr.sell_rate, 4)
                sell_rate = round(base_curr.sell_rate / quote_curr.buy_rate, 4)
                return {
                    "pair": pair,
                    "base": parts[0],
                    "quote": parts[1],
                    "buy": buy_rate,
                    "sell": sell_rate,
                    "calculated": True
                }
        
        raise HTTPException(status_code=404, detail="Cross-rate not found")
    
    rate = cross_rates_db[pair]
    return {
        "pair": pair,
        "base": rate["base"],
        "quote": rate["quote"],
        "buy": rate["buy"],
        "sell": rate["sell"],
        "calculated": False
    }

@app.get("/api/calculate/cross")
async def calculate_cross_exchange(
    amount: float,
    from_currency: str,
    to_currency: str
):
    """Calculate exchange using cross-rate"""
    from_currency = from_currency.upper()
    to_currency = to_currency.upper()
    
    if from_currency == to_currency:
        return {"from_amount": amount, "to_amount": amount, "rate": 1.0}
    
    # Try direct cross-rate
    pair = f"{from_currency}/{to_currency}"
    reverse_pair = f"{to_currency}/{from_currency}"
    
    if pair in cross_rates_db:
        rate = cross_rates_db[pair]["buy"]
        return {
            "from_amount": amount,
            "from_currency": from_currency,
            "to_amount": round(amount * rate, 2),
            "to_currency": to_currency,
            "rate": rate,
            "pair": pair
        }
    elif reverse_pair in cross_rates_db:
        rate = 1 / cross_rates_db[reverse_pair]["sell"]
        return {
            "from_amount": amount,
            "from_currency": from_currency,
            "to_amount": round(amount * rate, 2),
            "to_currency": to_currency,
            "rate": round(rate, 4),
            "pair": f"{from_currency}/{to_currency} (calculated)"
        }
    
    # Calculate via UAH
    from_curr = next((c for c in currencies_data if c.code == from_currency), None)
    to_curr = next((c for c in currencies_data if c.code == to_currency), None)
    
    if not from_curr or not to_curr:
        raise HTTPException(status_code=404, detail="Currency not found")
    
    # FROM -> UAH -> TO
    uah_amount = amount * from_curr.buy_rate
    to_amount = uah_amount / to_curr.sell_rate
    effective_rate = from_curr.buy_rate / to_curr.sell_rate
    
    return {
        "from_amount": amount,
        "from_currency": from_currency,
        "to_amount": round(to_amount, 2),
        "to_currency": to_currency,
        "rate": round(effective_rate, 4),
        "pair": f"{from_currency}/{to_currency} (via UAH)"
    }

@app.get("/api/admin/rates/all")
async def get_all_rates_admin(user: User = Depends(require_admin)):
    """Get all rates including branch-specific and cross-rates (Admin only)"""
    return {
        "updated_at": rates_updated_at.isoformat(),
        "base_rates": {c.code: {"buy": c.buy_rate, "sell": c.sell_rate, "name": c.name_uk} for c in currencies_data},
        "branch_rates": branch_rates_db,
        "cross_rates": cross_rates_db,
        "branches": [{"id": b.id, "address": b.address} for b in branches_data]
    }

@app.get("/api/admin/dashboard", response_model=DashboardStats)
async def get_admin_dashboard(user: User = Depends(require_admin)):
    """Get admin dashboard statistics"""
    today = datetime.now().date()
    
    total = len(reservations_db)
    pending = len([r for r in reservations_db if r.status == ReservationStatus.PENDING])
    confirmed = len([r for r in reservations_db if r.status == ReservationStatus.CONFIRMED])
    completed_today = len([
        r for r in reservations_db 
        if r.status == ReservationStatus.COMPLETED 
        and r.completed_at 
        and datetime.fromisoformat(r.completed_at).date() == today
    ])
    
    total_volume = sum(r.get_amount for r in reservations_db if r.get_currency == "UAH")
    
    return DashboardStats(
        total_reservations=total,
        pending_reservations=pending,
        confirmed_reservations=confirmed,
        completed_today=completed_today,
        total_volume_uah=total_volume
    )

@app.get("/api/admin/reservations")
async def get_all_reservations(
    user: User = Depends(require_admin),
    status: Optional[ReservationStatus] = None,
    branch_id: Optional[int] = None,
    page: int = 1,
    limit: int = 20
):
    """Get all reservations (Admin only)"""
    filtered = reservations_db
    
    if status:
        filtered = [r for r in filtered if r.status == status]
    if branch_id:
        filtered = [r for r in filtered if r.branch_id == branch_id]
    
    # Sort by created_at descending
    filtered = sorted(filtered, key=lambda x: x.created_at, reverse=True)
    
    start = (page - 1) * limit
    end = start + limit
    
    return {
        "items": filtered[start:end],
        "total": len(filtered),
        "page": page,
        "pages": (len(filtered) + limit - 1) // limit
    }


# ============== OPERATOR ENDPOINTS ==============

@app.get("/api/operator/dashboard", response_model=DashboardStats)
async def get_operator_dashboard(user: User = Depends(require_operator_or_admin)):
    """Get operator dashboard statistics for their branch"""
    today = datetime.now().date()
    
    # Filter by branch for operators
    branch_reservations = reservations_db
    if user.role == UserRole.OPERATOR and user.branch_id:
        branch_reservations = [r for r in reservations_db if r.branch_id == user.branch_id]
    
    total = len(branch_reservations)
    pending = len([r for r in branch_reservations if r.status == ReservationStatus.PENDING])
    confirmed = len([r for r in branch_reservations if r.status == ReservationStatus.CONFIRMED])
    completed_today = len([
        r for r in branch_reservations 
        if r.status == ReservationStatus.COMPLETED 
        and r.completed_at 
        and datetime.fromisoformat(r.completed_at).date() == today
    ])
    
    total_volume = sum(r.get_amount for r in branch_reservations if r.get_currency == "UAH")
    
    return DashboardStats(
        total_reservations=total,
        pending_reservations=pending,
        confirmed_reservations=confirmed,
        completed_today=completed_today,
        total_volume_uah=total_volume
    )

@app.get("/api/operator/reservations")
async def get_branch_reservations(
    user: User = Depends(require_operator_or_admin),
    status: Optional[ReservationStatus] = None,
    page: int = 1,
    limit: int = 20
):
    """Get reservations for operator's branch"""
    # Filter by branch for operators
    filtered = reservations_db
    if user.role == UserRole.OPERATOR and user.branch_id:
        filtered = [r for r in reservations_db if r.branch_id == user.branch_id]
    
    if status:
        filtered = [r for r in filtered if r.status == status]
    
    # Sort by created_at descending
    filtered = sorted(filtered, key=lambda x: x.created_at, reverse=True)
    
    start = (page - 1) * limit
    end = start + limit
    
    return {
        "items": filtered[start:end],
        "total": len(filtered),
        "page": page,
        "pages": (len(filtered) + limit - 1) // limit
    }

@app.put("/api/operator/reservations/{reservation_id}")
async def update_reservation(
    reservation_id: int,
    update: ReservationUpdate,
    user: User = Depends(require_operator_or_admin)
):
    """Update reservation status (Operator)"""
    reservation = next((r for r in reservations_db if r.id == reservation_id), None)
    
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    # Check if operator has access to this reservation
    if user.role == UserRole.OPERATOR and user.branch_id:
        if reservation.branch_id != user.branch_id:
            raise HTTPException(status_code=403, detail="Access denied to this reservation")
    
    if update.status:
        reservation.status = update.status
        if update.status == ReservationStatus.COMPLETED:
            reservation.completed_at = datetime.now().isoformat()
    
    if update.operator_note:
        reservation.operator_note = update.operator_note
    
    return reservation

@app.post("/api/operator/reservations/{reservation_id}/confirm")
async def confirm_reservation(
    reservation_id: int,
    user: User = Depends(require_operator_or_admin)
):
    """Confirm a pending reservation"""
    reservation = next((r for r in reservations_db if r.id == reservation_id), None)
    
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    if user.role == UserRole.OPERATOR and user.branch_id:
        if reservation.branch_id != user.branch_id:
            raise HTTPException(status_code=403, detail="Access denied")
    
    if reservation.status != ReservationStatus.PENDING:
        raise HTTPException(status_code=400, detail="Can only confirm pending reservations")
    
    reservation.status = ReservationStatus.CONFIRMED
    return reservation

@app.post("/api/operator/reservations/{reservation_id}/complete")
async def complete_reservation(
    reservation_id: int,
    user: User = Depends(require_operator_or_admin)
):
    """Mark reservation as completed"""
    reservation = next((r for r in reservations_db if r.id == reservation_id), None)
    
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    if user.role == UserRole.OPERATOR and user.branch_id:
        if reservation.branch_id != user.branch_id:
            raise HTTPException(status_code=403, detail="Access denied")
    
    if reservation.status not in [ReservationStatus.PENDING, ReservationStatus.CONFIRMED]:
        raise HTTPException(status_code=400, detail="Cannot complete this reservation")
    
    reservation.status = ReservationStatus.COMPLETED
    reservation.completed_at = datetime.now().isoformat()
    return reservation

@app.post("/api/operator/reservations/{reservation_id}/cancel")
async def cancel_reservation(
    reservation_id: int,
    user: User = Depends(require_operator_or_admin)
):
    """Cancel a reservation"""
    reservation = next((r for r in reservations_db if r.id == reservation_id), None)
    
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    if user.role == UserRole.OPERATOR and user.branch_id:
        if reservation.branch_id != user.branch_id:
            raise HTTPException(status_code=403, detail="Access denied")
    
    if reservation.status == ReservationStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Cannot cancel completed reservation")
    
    reservation.status = ReservationStatus.CANCELLED
    return reservation


# ============== PUBLIC SETTINGS ENDPOINTS ==============

@app.get("/api/settings")
async def get_public_settings():
    """Get public site settings"""
    return site_settings

@app.get("/api/faq")
async def get_faq():
    """Get FAQ items"""
    return sorted(faq_items, key=lambda x: x.order)

@app.get("/api/services")
async def get_services():
    """Get services"""
    return sorted([s for s in service_items if s.is_active], key=lambda x: x.order)

@app.get("/api/articles")
async def get_articles():
    """Get published articles"""
    return [a for a in articles_db if a.is_published]

@app.get("/api/articles/{article_id}")
async def get_article(article_id: int):
    """Get single article"""
    article = next((a for a in articles_db if a.id == article_id and a.is_published), None)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return article


# ============== ADMIN SETTINGS ENDPOINTS ==============

@app.get("/api/admin/settings")
async def get_admin_settings(user: User = Depends(require_admin)):
    """Get all settings (Admin only)"""
    return {
        "site": site_settings,
        "faq": faq_items,
        "services": service_items,
        "articles": articles_db,
    }

@app.put("/api/admin/settings")
async def update_settings(settings: SiteSettings, user: User = Depends(require_admin)):
    """Update site settings (Admin only)"""
    global site_settings
    site_settings = settings
    return {"success": True, "message": "Налаштування оновлено"}

@app.get("/api/admin/faq")
async def get_admin_faq(user: User = Depends(require_admin)):
    """Get all FAQ items (Admin only)"""
    return faq_items

@app.post("/api/admin/faq")
async def create_faq(item: FAQItem, user: User = Depends(require_admin)):
    """Create FAQ item"""
    item.id = max([f.id for f in faq_items], default=0) + 1
    faq_items.append(item)
    return item

@app.put("/api/admin/faq/{faq_id}")
async def update_faq(faq_id: int, item: FAQItem, user: User = Depends(require_admin)):
    """Update FAQ item"""
    existing = next((f for f in faq_items if f.id == faq_id), None)
    if not existing:
        raise HTTPException(status_code=404, detail="FAQ not found")
    
    idx = faq_items.index(existing)
    item.id = faq_id
    faq_items[idx] = item
    return item

@app.delete("/api/admin/faq/{faq_id}")
async def delete_faq(faq_id: int, user: User = Depends(require_admin)):
    """Delete FAQ item"""
    global faq_items
    faq_items = [f for f in faq_items if f.id != faq_id]
    return {"success": True}

@app.get("/api/admin/services")
async def get_admin_services(user: User = Depends(require_admin)):
    """Get all services (Admin only)"""
    return service_items

@app.post("/api/admin/services")
async def create_service(item: ServiceItem, user: User = Depends(require_admin)):
    """Create service"""
    item.id = max([s.id for s in service_items], default=0) + 1
    service_items.append(item)
    return item

@app.put("/api/admin/services/{service_id}")
async def update_service(service_id: int, item: ServiceItem, user: User = Depends(require_admin)):
    """Update service"""
    existing = next((s for s in service_items if s.id == service_id), None)
    if not existing:
        raise HTTPException(status_code=404, detail="Service not found")
    
    idx = service_items.index(existing)
    item.id = service_id
    service_items[idx] = item
    return item

@app.delete("/api/admin/services/{service_id}")
async def delete_service(service_id: int, user: User = Depends(require_admin)):
    """Delete service"""
    global service_items
    service_items = [s for s in service_items if s.id != service_id]
    return {"success": True}


# ============== ADMIN BRANCH MANAGEMENT ==============

class BranchUpdate(BaseModel):
    address: Optional[str] = None
    hours: Optional[str] = None
    phone: Optional[str] = None
    telegram_chat: Optional[str] = None
    is_open: Optional[bool] = None

@app.get("/api/admin/branches")
async def get_admin_branches(user: User = Depends(require_admin)):
    """Get all branches with full details"""
    return branches_data

@app.put("/api/admin/branches/{branch_id}")
async def update_branch(branch_id: int, update: BranchUpdate, user: User = Depends(require_admin)):
    """Update branch info"""
    branch = next((b for b in branches_data if b.id == branch_id), None)
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
    if update.is_open is not None:
        branch.is_open = update.is_open
    
    return branch


# ============== ADMIN CURRENCY MANAGEMENT ==============

class CurrencyUpdate(BaseModel):
    is_active: Optional[bool] = None
    is_popular: Optional[bool] = None
    buy_rate: Optional[float] = None
    sell_rate: Optional[float] = None

@app.get("/api/admin/currencies")
async def get_admin_currencies(user: User = Depends(require_admin)):
    """Get all currencies including inactive"""
    return currencies_data

@app.put("/api/admin/currencies/{code}")
async def update_currency(code: str, update: CurrencyUpdate, user: User = Depends(require_admin)):
    """Update currency settings (enable/disable, rates)"""
    currency = next((c for c in currencies_data if c.code.upper() == code.upper()), None)
    if not currency:
        raise HTTPException(status_code=404, detail="Currency not found")
    
    if update.is_active is not None:
        currency.is_active = update.is_active
    if update.is_popular is not None:
        currency.is_popular = update.is_popular
    if update.buy_rate is not None:
        currency.buy_rate = update.buy_rate
    if update.sell_rate is not None:
        currency.sell_rate = update.sell_rate
    
    global rates_updated_at
    rates_updated_at = datetime.now()
    
    return currency


# ============== OPERATOR RATES DOWNLOAD ==============

@app.get("/api/operator/rates/download")
async def download_operator_rates(user: User = Depends(require_operator_or_admin)):
    """Download rates for operator's branch as Excel"""
    import io
    try:
        import pandas as pd
    except ImportError:
        raise HTTPException(status_code=500, detail="pandas not installed")
    
    branch_id = user.branch_id
    branch = next((b for b in branches_data if b.id == branch_id), None) if branch_id else None
    
    # Get rates for this branch (or base rates if no branch-specific rates)
    if branch_id and branch_id in branch_rates_db:
        rates_data = []
        for code, rates in branch_rates_db[branch_id].items():
            currency = next((c for c in currencies_data if c.code == code), None)
            if currency:
                rates_data.append({
                    'Код валюти': code,
                    'Назва': currency.name_uk,
                    'Купівля': rates['buy'],
                    'Продаж': rates['sell'],
                })
    else:
        # Use base rates, filter by is_active (default True if not set)
        rates_data = [{
            'Код валюти': c.code,
            'Назва': c.name_uk,
            'Купівля': c.buy_rate,
            'Продаж': c.sell_rate,
        } for c in currencies_data if getattr(c, 'is_active', True)]
    
    if not rates_data:
        # Fallback if no data
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
