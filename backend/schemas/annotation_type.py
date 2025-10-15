from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, Any
from datetime import datetime


class AnnotationTypeBase(BaseModel):
    """Base schema for annotation type."""
    name: str
    description: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None


class AnnotationTypeCreate(AnnotationTypeBase):
    """Schema for creating an annotation type."""
    pass


class AnnotationTypeUpdate(BaseModel):
    """Schema for updating an annotation type."""
    name: Optional[str] = None
    description: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None


class AnnotationTypeResponse(AnnotationTypeBase):
    """Schema for annotation type response."""
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

