# main.py
import os
import uvicorn
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from database import Base, engine
from deps import get_db
from models import User, Text, Annotation, AnnotationType, AnnotationList
from routers import users, texts, annotations, bulk_upload, reviews, export, annotationlist, annotation_types, openpech

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="Pecha Annotation Tool API",
    description="A comprehensive API for text annotation with user management and role-based access control",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration
allowed_origins = os.getenv(
    "ALLOWED_ORIGINS", 
    "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173"
)
origins = [origin.strip() for origin in allowed_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create database tables
Base.metadata.create_all(bind=engine)

# Include routers
app.include_router(users.router, prefix="/v1")
app.include_router(texts.router, prefix="/v1")
app.include_router(annotations.router, prefix="/v1")
app.include_router(bulk_upload.router, prefix="/v1")
app.include_router(reviews.router, prefix="/v1")
app.include_router(export.router, prefix="/v1/export", tags=["export"])
app.include_router(annotation_types.router, prefix="/v1")
app.include_router(annotationlist.router, prefix="/v1")
app.include_router(openpech.router, prefix="/v1")


@app.get("/")
def read_root():
    """Root endpoint with API information."""
    return {
        "message": "Pecha Annotation Tool API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "redoc": "/redoc"
    }


@app.get("/api/v1/health")
def health_check(db: Session = Depends(get_db)):
    """Health check endpoint with Auth0 configuration status."""
    # Check database connection
    try:
        db.execute("SELECT 1")
        db_status = "✅ Connected"
    except Exception as e:
        db_status = f"❌ Error: {str(e)}"
    
    # Check Auth0 configuration
    auth0_domain = os.getenv("AUTH0_DOMAIN")
    auth0_audience = os.getenv("AUTH0_AUDIENCE")
    
    auth0_config = {
        "domain_configured": "✅ Yes" if auth0_domain else "❌ Missing",
        "audience_configured": "✅ Yes" if auth0_audience else "❌ Missing",
        "domain": auth0_domain if auth0_domain else "Not configured",
        "userinfo_endpoint": f"https://{auth0_domain}/userinfo" if auth0_domain else "Not available"
    }
    
    return {
        "status": "healthy" if db_status.startswith("✅") and auth0_domain and auth0_audience else "degraded",
        "message": "Pecha Annotation Tool API with Auth0 Integration",
        "version": "2.0.0",
        "database": db_status,
        "auth0_configuration": auth0_config,
        "debug_mode": os.getenv("DEBUG", "false").lower() == "true",
        "endpoints": {
            "docs": "/docs",
            "redoc": "/redoc",
            "users": "/api/v1/users",
            "texts": "/api/v1/texts",
            "annotations": "/api/v1/annotations",
            "debug_auth0": "/api/v1/users/debug/auth0 (dev only)" if os.getenv("DEBUG", "false").lower() == "true" else None
        }
    }


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )