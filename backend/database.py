# database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv

load_dotenv()

# Database configuration with fallback
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://postgres:123@localhost:5432/pecha_annotation_db"
)

# Connection pool sizing. Every request holds a connection for its whole
# lifetime (authentication included), and the UI opens a fan of parallel
# requests per page load, so the old 5+10 ceiling was reached routinely and
# callers queued until pool_timeout expired.
#
# Budget: DB_POOL_SIZE + DB_MAX_OVERFLOW connections *per worker process*.
# Keep (workers x that total) comfortably under the server's max_connections.
POOL_SIZE = int(os.getenv("DB_POOL_SIZE", "10"))
MAX_OVERFLOW = int(os.getenv("DB_MAX_OVERFLOW", "10"))
# Fail fast instead of parking a worker thread for 30s: a saturated pool under
# a request burst is not something waiting politely resolves.
POOL_TIMEOUT = int(os.getenv("DB_POOL_TIMEOUT", "10"))

# SQLite uses a pool that takes none of these options, so only send them to a
# real server-backed database.
POOL_OPTIONS = (
    {}
    if DATABASE_URL.startswith("sqlite")
    else {
        "pool_size": POOL_SIZE,
        "max_overflow": MAX_OVERFLOW,
        "pool_timeout": POOL_TIMEOUT,
        "pool_recycle": 300,
    }
)

# Create engine with connection pooling
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    echo=os.getenv("DEBUG", "false").lower() == "true",
    **POOL_OPTIONS,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
