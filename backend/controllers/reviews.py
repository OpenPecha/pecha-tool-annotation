"""Review route actions. All functions take db, current_user, and request data; return result or raise HTTPException."""

from typing import List

from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload

from crud.annotation_review import annotation_review_crud
from crud.text import text_crud
from models.user import User
from models.text import Text, ANNOTATED, REVIEWED, REVIEWED_NEEDS_REVISION
from schemas.annotation_review import (
    AnnotationReviewCreate,
    ReviewSubmission,
    ReviewSessionResponse,
    ReviewStatus,
    ReviewSubmissionResponse,
    AnnotationReviewResponse,
)


def get_texts_for_review(
    db: Session, current_user: User, skip: int = 0, limit: int = 100
) -> List[dict]:
    """Get texts ready for review with annotation count (reviewer only)."""
    texts = text_crud.get_texts_for_review(
        db=db, skip=skip, limit=limit, reviewer_id=current_user.id
    )
    result = []
    for text in texts:
        annotation_count = len(text.annotations)
        text_data = {
            "id": text.id,
            "title": text.title,
            "content": text.content[:200] + "..." if len(text.content) > 200 else text.content,
            "language": text.language,
            "status": text.status,
            "annotator_id": text.annotator_id,
            "created_at": text.created_at,
            "updated_at": text.updated_at,
            "annotation_count": annotation_count,
        }
        result.append(text_data)
    return result


def get_my_review_progress(
    db: Session, current_user: User, skip: int = 0, limit: int = 100
) -> List[dict]:
    """Get texts currently assigned to the reviewer for review (in progress)."""
    texts = (
        db.query(Text)
        .options(
            joinedload(Text.annotator),
            joinedload(Text.reviewer),
            joinedload(Text.uploader),
        )
        .filter(
            Text.status == ANNOTATED,
            Text.reviewer_id == current_user.id,
            Text.uploaded_by.is_(None),
        )
        .offset(skip)
        .limit(limit)
        .all()
    )
    result = []
    for text in texts:
        annotation_count = len(text.annotations)
        existing_reviews = annotation_review_crud.get_reviews_by_text(
            db=db, text_id=text.id, reviewer_id=current_user.id
        )
        reviewed_count = len(existing_reviews)
        progress_percentage = (
            (reviewed_count / annotation_count * 100) if annotation_count > 0 else 0
        )
        text_data = {
            "id": text.id,
            "title": text.title,
            "content": text.content[:200] + "..." if len(text.content) > 200 else text.content,
            "language": text.language,
            "status": text.status,
            "annotator_id": text.annotator_id,
            "reviewer_id": text.reviewer_id,
            "created_at": text.created_at,
            "updated_at": text.updated_at,
            "annotation_count": annotation_count,
            "reviewed_count": reviewed_count,
            "progress_percentage": round(progress_percentage, 1),
            "is_complete": reviewed_count == annotation_count,
        }
        result.append(text_data)
    return result


def start_review_session(
    db: Session, current_user: User, text_id: int
) -> ReviewSessionResponse:
    """Start a review session for a specific text."""
    text = text_crud.get(db=db, text_id=text_id)
    if not text:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Text not found",
        )
    if text.status != ANNOTATED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Text must be in annotated status for review. Current status: {text.status}",
        )
    if not text.reviewer_id:
        text_crud.update_status(
            db=db,
            text_id=text_id,
            status=ANNOTATED,
            reviewer_id=current_user.id,
        )
    session_data = annotation_review_crud.get_review_session_data(
        db=db, text_id=text_id, reviewer_id=current_user.id
    )
    if not session_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Failed to load review session data",
        )
    return ReviewSessionResponse(**session_data)


def get_review_status(
    db: Session, current_user: User, text_id: int
) -> ReviewStatus:
    """Get review status for a specific text."""
    text = text_crud.get(db=db, text_id=text_id)
    if not text:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Text not found",
        )
    status_data = annotation_review_crud.get_review_status(
        db=db, text_id=text_id, reviewer_id=current_user.id
    )
    return ReviewStatus(**status_data)


def submit_review(
    db: Session, current_user: User, review_data: ReviewSubmission
) -> ReviewSubmissionResponse:
    """Submit review decisions for a text."""
    text = text_crud.get(db=db, text_id=review_data.text_id)
    if not text:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Text not found",
        )
    if text.status != ANNOTATED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Text must be in annotated status for review. Current status: {text.status}",
        )
    review_status = annotation_review_crud.get_review_status(
        db=db, text_id=review_data.text_id, reviewer_id=current_user.id
    )
    if len(review_data.decisions) != review_status["total_annotations"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Must review all annotations. Expected {review_status['total_annotations']}, got {len(review_data.decisions)}",
        )

    reviews = annotation_review_crud.submit_reviews(
        db=db,
        text_id=review_data.text_id,
        reviewer_id=current_user.id,
        decisions=review_data.decisions,
    )
    disagreed_count = sum(
        1 for d in review_data.decisions if d.decision == "disagree"
    )
    if disagreed_count > 0:
        updated_text = text_crud.update_status(
            db=db,
            text_id=review_data.text_id,
            status=REVIEWED_NEEDS_REVISION,
            reviewer_id=current_user.id,
        )
    else:
        updated_text = text_crud.update_status(
            db=db,
            text_id=review_data.text_id,
            status=REVIEWED,
            reviewer_id=current_user.id,
        )

    next_texts = text_crud.get_texts_for_review(
        db=db, skip=0, limit=1, reviewer_id=current_user.id
    )
    next_text = next_texts[0] if next_texts else None
    next_text_data = None
    if next_text:
        next_text_data = {
            "id": next_text.id,
            "title": next_text.title,
            "annotation_count": len(next_text.annotations),
        }

    return ReviewSubmissionResponse(
        message=f"Review submitted successfully for text '{text.title}'",
        text_id=review_data.text_id,
        total_reviews=len(reviews),
        status=updated_text.status,
        next_review_text=next_text_data,
    )


def review_annotation(
    db: Session, current_user: User, annotation_id: int, review_data: AnnotationReviewCreate
):
    """Create or update review for a specific annotation."""
    if review_data.decision not in ("agree", "disagree"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Decision must be 'agree' or 'disagree'",
        )
    review = annotation_review_crud.create_or_update_review(
        db=db,
        annotation_id=annotation_id,
        reviewer_id=current_user.id,
        decision=review_data.decision,
        comment=review_data.comment,
    )
    return AnnotationReviewResponse.model_validate(review)


def get_annotation_reviews(
    db: Session, current_user: User, annotation_id: int
) -> List[AnnotationReviewResponse]:
    """Get all reviews for a specific annotation."""
    reviews = annotation_review_crud.get_reviews_by_annotation(
        db=db, annotation_id=annotation_id
    )
    return [AnnotationReviewResponse.model_validate(r) for r in reviews]


def get_my_reviews(
    db: Session, current_user: User, skip: int = 0, limit: int = 100
) -> List[AnnotationReviewResponse]:
    """Get all reviews by the current reviewer."""
    reviews = (
        db.query(annotation_review_crud.model)
        .filter(annotation_review_crud.model.reviewer_id == current_user.id)
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [AnnotationReviewResponse.model_validate(r) for r in reviews]


def get_reviewer_stats(db: Session, current_user: User) -> dict:
    """Get statistics for the current reviewer."""
    return annotation_review_crud.get_reviewer_stats(
        db=db, reviewer_id=current_user.id
    )


def delete_review(db: Session, current_user: User, review_id: int) -> dict:
    """Delete a review. Only the reviewer who created it can delete."""
    review = annotation_review_crud.get(db=db, review_id=review_id)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found",
        )
    if review.reviewer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own reviews",
        )
    annotation_review_crud.delete(db=db, review_id=review_id)
    return {"message": "Review deleted successfully"}


def get_annotator_reviewed_work(
    db: Session, current_user: User, skip: int = 0, limit: int = 100
) -> List[dict]:
    """Get texts that have been reviewed with comments for the current annotator."""
    texts = text_crud.get_texts_by_annotator_with_reviews(
        db=db,
        annotator_id=current_user.id,
        skip=skip,
        limit=limit,
    )
    result = []
    for text in texts:
        reviews = annotation_review_crud.get_reviews_for_text_with_comments(
            db=db, text_id=text.id
        )
        agree_count = sum(1 for r in reviews if r.decision == "agree")
        disagree_count = sum(1 for r in reviews if r.decision == "disagree")
        annotations_with_reviews = []
        for annotation in text.annotations:
            annotation_reviews = [r for r in reviews if r.annotation_id == annotation.id]
            annotations_with_reviews.append({
                "id": annotation.id,
                "annotation_type": annotation.annotation_type,
                "selected_text": annotation.selected_text,
                "name": annotation.name,
                "reviews": [
                    {
                        "id": r.id,
                        "decision": r.decision,
                        "comment": r.comment,
                        "reviewer_id": r.reviewer_id,
                        "created_at": r.created_at,
                    }
                    for r in annotation_reviews
                ],
            })
        result.append({
            "id": text.id,
            "title": text.title,
            "status": text.status,
            "reviewer_id": text.reviewer_id,
            "total_annotations": len(text.annotations),
            "agree_count": agree_count,
            "disagree_count": disagree_count,
            "annotations": annotations_with_reviews,
            "reviewed_at": text.updated_at,
        })
    return result


def get_texts_needing_revision(
    db: Session, current_user: User, skip: int = 0, limit: int = 100
) -> List[dict]:
    """Get texts that need revision by the current annotator."""
    texts = text_crud.get_texts_by_annotator_and_status(
        db=db,
        annotator_id=current_user.id,
        status=REVIEWED_NEEDS_REVISION,
        skip=skip,
        limit=limit,
    )
    result = []
    for text in texts:
        reviews = annotation_review_crud.get_reviews_for_text_with_comments(
            db=db, text_id=text.id
        )
        disagree_count = sum(1 for r in reviews if r.decision == "disagree")
        disagree_comments = [
            r.comment for r in reviews
            if r.decision == "disagree" and r.comment
        ]
        result.append({
            "id": text.id,
            "title": text.title,
            "status": text.status,
            "reviewer_id": text.reviewer_id,
            "total_annotations": len(text.annotations),
            "disagree_count": disagree_count,
            "disagree_comments": disagree_comments,
            "reviewed_at": text.updated_at,
        })
    return result
