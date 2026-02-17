from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, Text, DateTime, Enum as SQLEnum
from sqlalchemy.orm import relationship
from database import Base
import datetime
import enum

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    OPERATOR = "operator"

class ReservationStatus(str, enum.Enum):
    PENDING_ADMIN = "pending_admin"  # New: awaiting admin review
    PENDING = "pending"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    EXPIRED = "expired"

class SiteSettings(Base):
    __tablename__ = "site_settings"
    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String, default="Світ Валют")
    phone = Column(String, default="(096) 048-88-84")
    phone_secondary = Column(String, nullable=True)
    email = Column(String, default="info@svitvalut.ua")
    working_hours = Column(String, default="щодня: 8:00-20:00")
    address = Column(String, default="м. Львів, вул. Городоцька, 1")
    telegram_url = Column(String, nullable=True)
    viber_url = Column(String, nullable=True)
    whatsapp_url = Column(String, nullable=True)
    facebook_url = Column(String, nullable=True)
    instagram_url = Column(String, nullable=True)
    min_wholesale_amount = Column(Integer, default=1000)
    reservation_time_minutes = Column(Integer, default=60)
    google_maps_embed = Column(String, nullable=True)
    meta_title = Column(String, default="Світ Валют - Обмін валют за вигідним курсом")
    meta_description = Column(String, default="Найкращий обмін валют у вашому місті")

class FAQItem(Base):
    __tablename__ = "faq_items"
    id = Column(Integer, primary_key=True, index=True)
    question = Column(String, nullable=False)
    answer = Column(Text, nullable=False)
    link_text = Column(String, nullable=True)
    link_url = Column(String, nullable=True)
    order = Column(Integer, default=0)

class ServiceItem(Base):
    __tablename__ = "service_items"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    image_url = Column(String, nullable=False)
    link_url = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    order = Column(Integer, default=0)

class ArticleItem(Base):
    __tablename__ = "article_items"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    excerpt = Column(Text, nullable=False)
    content = Column(Text, nullable=False)
    image_url = Column(String, nullable=True)
    is_published = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Branch(Base):
    __tablename__ = "branches"
    id = Column(Integer, primary_key=True, index=True)
    address = Column(String, nullable=False)
    hours = Column(String, nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    is_open = Column(Boolean, default=True)
    phone = Column(String, nullable=True)
    telegram_chat = Column(String, nullable=True)
    cashier = Column(String, nullable=True)
    
    reservations = relationship("Reservation", back_populates="branch")
    rates = relationship("BranchRate", back_populates="branch")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.OPERATOR)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    name = Column(String, nullable=False)

class Reservation(Base):
    __tablename__ = "reservations"
    id = Column(Integer, primary_key=True, index=True)
    give_amount = Column(Float, nullable=False)
    give_currency = Column(String, nullable=False)
    get_amount = Column(Float, nullable=False)
    get_currency = Column(String, nullable=False)
    rate = Column(Float, nullable=False)
    phone = Column(String, nullable=False)
    customer_name = Column(String, nullable=True)
    status = Column(SQLEnum(ReservationStatus), default=ReservationStatus.PENDING)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    operator_note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    
    branch = relationship("Branch", back_populates="reservations")

class BranchRate(Base):
    __tablename__ = "branch_rates"
    id = Column(Integer, primary_key=True, index=True)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False)
    currency_code = Column(String, nullable=False)
    buy_rate = Column(Float, nullable=False)
    sell_rate = Column(Float, nullable=False)
    wholesale_buy_rate = Column(Float, default=0.0)
    wholesale_sell_rate = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)
    

    branch = relationship("Branch", back_populates="rates")

class Currency(Base):
    __tablename__ = "currencies"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    name_uk = Column(String, nullable=False)
    buy_rate = Column(Float, default=0.0)
    sell_rate = Column(Float, default=0.0)
    wholesale_buy_rate = Column(Float, default=0.0)
    wholesale_sell_rate = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)
    is_popular = Column(Boolean, default=False)
    flag = Column(String, default="🏳️")
    order = Column(Integer, default=0)
    # SEO / Info fields
    buy_url = Column(String, nullable=True)
    sell_url = Column(String, nullable=True)
    seo_h1 = Column(String, nullable=True) # Keeping for backward compatibility or migration reference? Or deprecating?
    seo_h2 = Column(String, nullable=True)
    seo_image = Column(String, nullable=True)
    seo_text = Column(Text, nullable=True)
    
    # Split SEO Fields
    seo_buy_h1 = Column(String, nullable=True)
    seo_buy_h2 = Column(String, nullable=True)
    seo_buy_title = Column(String, nullable=True)
    seo_buy_desc = Column(String, nullable=True)
    seo_buy_text = Column(Text, nullable=True)
    seo_buy_image = Column(String, nullable=True)

    seo_sell_h1 = Column(String, nullable=True)
    seo_sell_h2 = Column(String, nullable=True)
    seo_sell_title = Column(String, nullable=True)
    seo_sell_desc = Column(String, nullable=True)
    seo_sell_text = Column(Text, nullable=True)
    seo_sell_image = Column(String, nullable=True)

    wholesale_threshold = Column(Integer, default=1000)
