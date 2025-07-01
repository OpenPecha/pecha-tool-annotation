# Database dependencies
from fastapi import Depends
from sqlalchemy.orm import Session
from database import SessionLocal

def get_db():
    """Database dependency injection."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
