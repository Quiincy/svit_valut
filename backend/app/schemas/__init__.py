from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import enum

# Enums
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

class ChatSessionStatusEnum(str, enum.Enum):
    ACTIVE = "active"
    CLOSED = "closed"

# ============== SEO METADATA ==============
class SeoMetadataBase(BaseModel):
    url_path: str
    h1: Optional[str] = None
    h2: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    text: Optional[str] = None
    image_url: Optional[str] = None

class SeoMetadataCreate(SeoMetadataBase):
    pass

class SeoMetadataUpdate(SeoMetadataBase):
    pass

class SeoMetadata(SeoMetadataBase):
    id: int

    class Config:
        from_attributes = True

# ============== SITE SETTINGS ==============
class SiteSettingsBase(BaseModel):
    company_name: str = "Світ Валют"
    phone: str = "(096) 048-88-84"
    phone_secondary: Optional[str] = None
    email: str = "info@svitvalut.ua"
    working_hours: str = "щодня: 8:00-20:00"
    telegram_url: Optional[str] = "https://t.me/svitvalut"
    viber_url: Optional[str] = "viber://chat?number=+380960488884"
    whatsapp_url: Optional[str] = "https://wa.me/380960488884"
    instagram_url: Optional[str] = None
    facebook_url: Optional[str] = None
    address: str = "м. Київ"
    min_wholesale_amount: int = 1000
    reservation_time_minutes: int = 60
    google_maps_embed: Optional[str] = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d162757.7284!2d30.3907!3d50.4017!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x40d4cf4ee15a4505%3A0x764931d2170146fe!2z0JrQuNGX0LI!5e0!3m2!1suk!2sua!4v1702000000000!5m2!1suk!2sua"
    homepage_seo_text: Optional[str] = None

class SiteSettings(SiteSettingsBase):
    class Config:
        from_attributes = True

class FAQItemBase(BaseModel):
    id: Optional[int] = None
    question: str
    answer: str
    link_text: Optional[str] = None
    link_url: Optional[str] = None
    order: int = 0

class FAQItem(FAQItemBase):
    class Config:
        from_attributes = True

class ServiceItemBase(BaseModel):
    id: Optional[int] = None
    title: str
    short_description: str = ""
    description: str
    image_url: str
    link_url: Optional[str] = None
    is_active: bool = True
    order: int = 0

class ServiceItem(ServiceItemBase):
    class Config:
        from_attributes = True

class ArticleItemBase(BaseModel):
    id: Optional[int] = None
    title: str
    excerpt: str
    content: str
    image_url: Optional[str] = None
    is_published: bool = True
    created_at: Optional[str] = None

class ArticleItem(ArticleItemBase):
    class Config:
        from_attributes = True

# ============== RESERVATIONS ==============
class ReservationRequest(BaseModel):
    give_amount: float
    give_currency: str
    get_currency: str
    phone: str
    customer_name: Optional[str] = None
    branch_id: Optional[int] = None

class ReservationResponse(BaseModel):
    id: int
    give_amount: float
    give_currency: str
    get_amount: float
    get_currency: str
    rate: float
    phone: str
    customer_name: Optional[str] = None
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

class ReservationEdit(BaseModel):
    give_amount: Optional[float] = None
    get_amount: Optional[float] = None
    rate: Optional[float] = None
    branch_id: Optional[int] = None

# ============== CURRENCIES & RATES ==============
class Currency(BaseModel):
    code: str
    name: str
    name_uk: str
    flag: str
    buy_rate: float
    sell_rate: float
    wholesale_buy_rate: float = 0.0
    wholesale_sell_rate: float = 0.0
    wholesale_threshold: int = 1000
    is_popular: bool = False
    is_active: bool = True
    
    # SEO Fields
    buy_url: Optional[str] = None
    sell_url: Optional[str] = None
    seo_h1: Optional[str] = None
    seo_h2: Optional[str] = None
    seo_image: Optional[str] = None
    seo_text: Optional[str] = None
    
    # Split SEO Fields
    seo_buy_h1: Optional[str] = None
    seo_buy_h2: Optional[str] = None
    seo_buy_title: Optional[str] = None
    seo_buy_desc: Optional[str] = None
    seo_buy_text: Optional[str] = None
    seo_buy_image: Optional[str] = None

    seo_sell_h1: Optional[str] = None
    seo_sell_h2: Optional[str] = None
    seo_sell_title: Optional[str] = None
    seo_sell_desc: Optional[str] = None
    seo_sell_text: Optional[str] = None
    seo_sell_image: Optional[str] = None

class CurrencyUpdate(BaseModel):
    is_active: Optional[bool] = None
    is_popular: Optional[bool] = None
    buy_rate: Optional[float] = None
    sell_rate: Optional[float] = None
    buy_url: Optional[str] = None
    sell_url: Optional[str] = None
    seo_h1: Optional[str] = None
    seo_h2: Optional[str] = None
    seo_image: Optional[str] = None
    seo_text: Optional[str] = None
    seo_buy_h1: Optional[str] = None
    seo_buy_h2: Optional[str] = None
    seo_buy_title: Optional[str] = None
    seo_buy_desc: Optional[str] = None
    seo_buy_text: Optional[str] = None
    seo_buy_image: Optional[str] = None
    seo_sell_h1: Optional[str] = None
    seo_sell_h2: Optional[str] = None
    seo_sell_title: Optional[str] = None
    seo_sell_desc: Optional[str] = None
    seo_sell_text: Optional[str] = None
    seo_sell_image: Optional[str] = None
    wholesale_threshold: Optional[int] = None

class BranchRate(BaseModel):
    branch_id: int
    branch_address: str
    currency_code: str
    buy_rate: float
    sell_rate: float
    wholesale_buy_rate: float = 0.0
    wholesale_sell_rate: float = 0.0

class BranchRateUpdate(BaseModel):
    buy_rate: Optional[float] = None
    sell_rate: Optional[float] = None
    wholesale_buy_rate: Optional[float] = None
    wholesale_sell_rate: Optional[float] = None
    wholesale_threshold: Optional[int] = None
    is_active: Optional[bool] = None

class CrossRate(BaseModel):
    pair: str
    base_currency: str
    quote_currency: str
    buy_rate: float
    sell_rate: float

class RatesUploadResponse(BaseModel):
    success: bool
    message: str
    updated_currencies: int
    errors: List[str] = []

class RatesUploadResponseV2(BaseModel):
    success: bool
    message: str
    base_rates_updated: int
    branch_rates_updated: int
    errors: List[str] = []

# ============== USERS & BRANCHES ==============
class User(BaseModel):
    id: int
    username: str
    role: UserRole
    branch_id: Optional[int] = None
    name: str

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

class Branch(BaseModel):
    id: int
    number: int = 0
    address: str
    hours: str
    lat: float
    lng: float
    is_open: bool = True
    phone: Optional[str] = None
    telegram_chat: Optional[str] = None
    cashier: Optional[str] = None

class BranchCreate(BaseModel):
    number: int = 0
    address: str
    hours: str = "щодня: 9:00-20:00"
    lat: Optional[float] = None
    lng: Optional[float] = None
    is_open: bool = True
    phone: Optional[str] = None
    telegram_chat: Optional[str] = None
    cashier: Optional[str] = None

class BranchUpdate(BaseModel):
    number: Optional[int] = None
    address: Optional[str] = None
    hours: Optional[str] = None
    phone: Optional[str] = None
    telegram_chat: Optional[str] = None
    cashier: Optional[str] = None
    is_open: Optional[bool] = None

# ============== SYSTEM ==============
class Order(BaseModel):
    id: int
    address: str
    type: str
    amount: float
    currency: str
    flag: str
    rate: float
    created_at: str

class DashboardStats(BaseModel):
    total_reservations: int
    pending_reservations: int
    confirmed_reservations: int
    completed_today: int
    total_volume_uah: float
    total_volume_uah_month: float

# ============== CHAT ==============
class ChatMessageBase(BaseModel):
    sender: str
    content: str

class ChatMessageCreate(ChatMessageBase):
    pass

class ChatMessage(ChatMessageBase):
    id: int
    session_id: int
    created_at: datetime
    is_read: bool
    
    class Config:
        from_attributes = True

class ChatSessionBase(BaseModel):
    session_id: str
    
class ChatSessionCreate(ChatSessionBase):
    pass

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
    wholesale_buy_rate: float = 0.0
    wholesale_sell_rate: float = 0.0
    wholesale_threshold: int = 1000
    is_popular: bool = False
    is_active: bool = True  # New: ability to enable/disable currency
    
    # SEO Fields
    buy_url: Optional[str] = None
    sell_url: Optional[str] = None
    seo_h1: Optional[str] = None
    seo_h2: Optional[str] = None
    seo_image: Optional[str] = None
    seo_text: Optional[str] = None
    
    # Split SEO Fields
    seo_buy_h1: Optional[str] = None
    seo_buy_h2: Optional[str] = None
    seo_buy_title: Optional[str] = None
    seo_buy_desc: Optional[str] = None
    seo_buy_text: Optional[str] = None
    seo_buy_image: Optional[str] = None

    seo_sell_h1: Optional[str] = None
    seo_sell_h2: Optional[str] = None
    seo_sell_title: Optional[str] = None
    seo_sell_desc: Optional[str] = None
    seo_sell_text: Optional[str] = None
    seo_sell_image: Optional[str] = None

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
    number: int = 0
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

class BranchRate(BaseModel):
    branch_id: int
    branch_address: str
    currency_code: str
    buy_rate: float
    sell_rate: float
    wholesale_buy_rate: float = 0.0
    wholesale_sell_rate: float = 0.0

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

# ============== CHAT ==============
class ChatMessageBase(BaseModel):
    sender: str
    content: str

class ChatMessageCreate(ChatMessageBase):
    pass

class ChatMessage(ChatMessageBase):
    id: int
    session_id: int
    created_at: datetime
    is_read: bool
    
    class Config:
        from_attributes = True

class ChatSessionBase(BaseModel):
    session_id: str
    
class ChatSessionCreate(ChatSessionBase):
    pass

class ChatSession(ChatSessionBase):
    id: int
    created_at: datetime
    last_message_at: datetime
    status: ChatSessionStatusEnum
    messages: List[ChatMessage] = []

    class Config:
        from_attributes = True

