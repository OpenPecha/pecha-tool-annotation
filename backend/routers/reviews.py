"""Reviews API routes. Thin layer: dependencies and controller delegation."""

from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from deps import get_db
from auth import get_current_active_user, require_reviewer
from models.user import User
from schemas.annotation_review import (
    AnnotationReviewCreate,
    AnnotationReviewResponse,
    ReviewSubmission,
    ReviewSessionResponse,
    ReviewStatus,
    ReviewSubmissionResponse,
)

from controllers import reviews as reviews_controller

router = APIRouter(prefix="/reviews", tags=["Reviews"])


@router.get("/texts-for-review", response_model=List[dict])
def get_texts_for_review(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reviewer),
):
    """Get texts ready for review (annotated status) - Reviewer only."""
    return reviews_controller.get_texts_for_review(
        db, current_user, skip=skip, limit=limit
    )


@router.get("/my-review-progress", response_model=List[dict])
def get_my_review_progress(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reviewer),
):
    """Get texts currently assigned to the reviewer for review (in progress)."""
    return reviews_controller.get_my_review_progress(
        db, current_user, skip=skip, limit=limit
    )


@router.get("/session/{text_id}", response_model=ReviewSessionResponse)
def start_review_session(
    text_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reviewer),
):
    """Start a review session for a specific text."""
    return reviews_controller.start_review_session(db, current_user, text_id)


@router.get("/status/{text_id}", response_model=ReviewStatus)
def get_review_status(
    text_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reviewer),
):
    """Get review status for a specific text."""
    return reviews_controller.get_review_status(db, current_user, text_id)


@router.post("/submit", response_model=ReviewSubmissionResponse)
def submit_review(
    review_data: ReviewSubmission,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reviewer),
):
    """Submit review decisions for a text."""
    return reviews_controller.submit_review(db, current_user, review_data)


@router.post("/annotation/{annotation_id}", response_model=AnnotationReviewResponse)
def review_annotation(
    annotation_id: int,
    review_data: AnnotationReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reviewer),
):
    """Create or update review for a specific annotation."""
    return reviews_controller.review_annotation(
        db, current_user, annotation_id, review_data
    )


@router.get("/annotation/{annotation_id}", response_model=List[AnnotationReviewResponse])
def get_annotation_reviews(
    annotation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get all reviews for a specific annotation."""
    return reviews_controller.get_annotation_reviews(
        db, current_user, annotation_id
    )


@router.get("/my-reviews", response_model=List[AnnotationReviewResponse])
def get_my_reviews(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reviewer),
):
    """Get all reviews by the current reviewer."""
    return reviews_controller.get_my_reviews(
        db, current_user, skip=skip, limit=limit
    )


@router.get("/stats", response_model=dict)
def get_reviewer_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reviewer),
):
    """Get statistics for the current reviewer."""
    return reviews_controller.get_reviewer_stats(db, current_user)


@router.delete("/{review_id}")
def delete_review(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reviewer),
):
    """Delete a review. Only the reviewer who created it can delete it."""
    return reviews_controller.delete_review(db, current_user, review_id)


@router.get("/annotator/reviewed-work", response_model=List[dict])
def get_annotator_reviewed_work(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get texts that have been reviewed with comments for the current annotator."""
    return reviews_controller.get_annotator_reviewed_work(
        db, current_user, skip=skip, limit=limit
    )


@router.get("/annotator/texts-need-revision", response_model=List[dict])
def get_texts_needing_revision(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get texts that need revision by the current annotator."""
    return reviews_controller.get_texts_needing_revision(
        db, current_user, skip=skip, limit=limit
    )
