from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from models.text import TextStatus


class TextBase(BaseModel):
    title: str
    content: str
    source: Optional[str] = None
    language: str = "en"


class TextCreate(TextBase):
    pass


class TextUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    source: Optional[str] = None
    language: Optional[str] = None
    status: Optional[TextStatus] = None
    reviewer_id: Optional[int] = None


class TextResponse(TextBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    status: TextStatus
    reviewer_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Optional: Include annotations count
    annotations_count: Optional[int] = None 