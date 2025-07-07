from pydantic import BaseModel, ConfigDict, Field, validator
from typing import Optional
from datetime import datetime
from models.text import VALID_STATUSES


class TextBase(BaseModel):
    title: str
    content: str
    source: Optional[str] = None
    language: str = "en"


class TextCreate(TextBase):
    status: str = Field(default="initialized", description="Text status")
    
    @validator('status')
    def validate_status(cls, v):
        if v not in VALID_STATUSES:
            raise ValueError(f'Status must be one of: {", ".join(VALID_STATUSES)}')
        return v


class TextUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    source: Optional[str] = None
    language: Optional[str] = None
    status: Optional[str] = None
    reviewer_id: Optional[int] = None
    
    @validator('status')
    def validate_status(cls, v):
        if v is not None and v not in VALID_STATUSES:
            raise ValueError(f'Status must be one of: {", ".join(VALID_STATUSES)}')
        return v


class TextResponse(TextBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    status: str
    reviewer_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Optional: Include annotations count
    annotations_count: Optional[int] = None
    
    @validator('status')
    def validate_status(cls, v):
        if v not in VALID_STATUSES:
            raise ValueError(f'Status must be one of: {", ".join(VALID_STATUSES)}')
        return v


class TaskSubmissionResponse(BaseModel):
    """Response for task submission - includes submitted task and next task if available"""
    submitted_task: TextResponse
    next_task: Optional[TextResponse] = None
    message: str 