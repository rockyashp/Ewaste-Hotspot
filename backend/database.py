import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Primary: PostgreSQL from environment or local fallback
raw_db_url = os.getenv("DATABASE_URL", "postgresql+psycopg2://postgres:root@localhost:5431/ewaste_db")
if raw_db_url.startswith("postgres://"):
    POSTGRES_URL = raw_db_url.replace("postgres://", "postgresql+psycopg2://", 1)
elif raw_db_url.startswith("postgresql://") and not raw_db_url.startswith("postgresql+"):
    POSTGRES_URL = raw_db_url.replace("postgresql://", "postgresql+psycopg2://", 1)
else:
    POSTGRES_URL = raw_db_url

SQLITE_FALLBACK = "sqlite:///./ewaste_fallback.db"

try:
    engine = create_engine(POSTGRES_URL, pool_pre_ping=True)
    with engine.connect() as test_conn:
        pass
    print("[DATABASE] Successfully connected to PostgreSQL.")
except Exception as e:
    print(f"[DATABASE] PostgreSQL connection failed: {e}. Falling back to SQLite.")
    engine = create_engine(SQLITE_FALLBACK, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
