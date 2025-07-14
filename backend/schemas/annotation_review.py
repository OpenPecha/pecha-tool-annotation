from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class AnnotationReviewBase(BaseModel):
    decision: str = Field(..., description="Review decision: 'agree' or 'disagree'")
    comment: Optional[str] = Field(None, description="Optional comment from reviewer")


class AnnotationReviewCreate(AnnotationReviewBase):
    annotation_id: int = Field(..., description="ID of the annotation being reviewed")


class AnnotationReviewUpdate(BaseModel):
    decision: Optional[str] = Field(None, description="Review decision: 'agree' or 'disagree'")
    comment: Optional[str] = Field(None, description="Optional comment from reviewer")


class AnnotationReviewResponse(AnnotationReviewBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    annotation_id: int
    reviewer_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None


class ReviewDecision(BaseModel):
    annotation_id: int
    decision: str = Field(..., description="Review decision: 'agree' or 'disagree'")
    comment: Optional[str] = Field(None, description="Optional comment from reviewer")


class ReviewSubmission(BaseModel):
    text_id: int
    decisions: List[ReviewDecision] = Field(..., description="List of review decisions for annotations")


class ReviewStatus(BaseModel):
    text_id: int
    total_annotations: int
    reviewed_annotations: int
    pending_annotations: int
    is_complete: bool


class ReviewSessionResponse(BaseModel):
    text_id: int
    title: str
    content: str
    annotations: List[Dict[str, Any]]  # Full annotation objects with review status
    review_status: ReviewStatus
    existing_reviews: List[AnnotationReviewResponse] = Field(default_factory=list)


class ReviewSubmissionResponse(BaseModel):
    message: str
    text_id: int
    total_reviews: int
    status: str  # Text status after review
    next_review_text: Optional[Dict[str, Any]] = None 