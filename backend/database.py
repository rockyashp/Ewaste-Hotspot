import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Primary: PostgreSQL on port 5431
POSTGRES_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://postgres:root@localhost:5431/ewaste_db")
SQLITE_FALLBACK = "sqlite:///./ewaste_fallback.db"

try:
    engine = create_engine(POSTGRES_URL, pool_pre_ping=True)
    with engine.connect() as test_conn:
        pass
    print("[DATABASE] Successfully connected to PostgreSQL (ewaste_db).")
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
