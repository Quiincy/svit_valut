import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

# Use SQLite for now as per plan
# In production, this can be changed to PostgreSQL via environment variable
SQLITE_DB_PATH = os.path.join(os.path.dirname(__file__), "svit_valut.db")
SQLALCHEMY_DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{SQLITE_DB_PATH}")

# check_same_thread=False is needed for SQLite
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in SQLALCHEMY_DATABASE_URL else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
