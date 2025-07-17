from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from deps import get_db
from auth import get_current_active_user, require_reviewer
from crud.annotation_review import annotation_review_crud
from crud.text import text_crud
from schemas.annotation_review import (
    AnnotationReviewCreate,
    AnnotationReviewUpdate,
    AnnotationReviewResponse,
    ReviewSubmission,
    ReviewSubmissionResponse,
    ReviewSessionResponse,
    ReviewStatus
)
from models.user import User
from models.text import Text, REVIEWED, ANNOTATED, REVIEWED_NEEDS_REVISION

router = APIRouter(prefix="/reviews", tags=["Reviews"])


@router.get("/texts-for-review", response_model=List[dict])
def get_texts_for_review(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reviewer)
):
    """Get texts ready for review (annotated status) - Reviewer only."""
    texts = text_crud.get_texts_for_review(db=db, skip=skip, limit=limit, reviewer_id=current_user.id)
    
    # Add annotation count for each text
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
            "annotation_count": annotation_count
        }
        result.append(text_data)
    
    return result


@router.get("/my-review-progress", response_model=List[dict])
def get_my_review_progress(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reviewer)
):
    """Get texts currently assigned to the reviewer for review (in progress)."""
    # Get texts where reviewer_id is current user and status is still annotated (not yet reviewed)
    # Only include system texts (exclude user-uploaded texts)
    from sqlalchemy.orm import joinedload
    texts = db.query(Text).options(
        joinedload(Text.annotator),
        joinedload(Text.reviewer),
        joinedload(Text.uploader)
    ).filter(
        Text.status == ANNOTATED,
        Text.reviewer_id == current_user.id,
        Text.uploaded_by.is_(None)  # Only system texts
    ).offset(skip).limit(limit).all()
    
    # Add annotation count and review progress for each text
    result = []
    for text in texts:
        annotation_count = len(text.annotations)
        
        # Get existing reviews for this text by current reviewer
        existing_reviews = annotation_review_crud.get_reviews_by_text(
            db=db, text_id=text.id, reviewer_id=current_user.id
        )
        
        reviewed_count = len(existing_reviews)
        progress_percentage = (reviewed_count / annotation_count * 100) if annotation_count > 0 else 0
        
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
            "is_complete": reviewed_count == annotation_count
        }
        result.append(text_data)
    
    return result


@router.get("/session/{text_id}", response_model=ReviewSessionResponse)
def start_review_session(
    text_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reviewer)
):
    """Start a review session for a specific text."""
    # Check if text exists and is ready for review
    text = text_crud.get(db=db, text_id=text_id)
    if not text:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Text not found"
        )
    
    if text.status != ANNOTATED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Text must be in annotated status for review. Current status: {text.status}"
        )
    
    # Assign reviewer to the text when they start reviewing
    if not text.reviewer_id:
        text_crud.update_status(
            db=db, 
            text_id=text_id, 
            status=ANNOTATED,  # Keep current status
            reviewer_id=current_user.id
        )
    
    # Get comprehensive review session data
    session_data = annotation_review_crud.get_review_session_data(
        db=db, text_id=text_id, reviewer_id=current_user.id
    )
    
    if not session_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Failed to load review session data"
        )
    
    return ReviewSessionResponse(**session_data)


@router.get("/status/{text_id}", response_model=ReviewStatus)
def get_review_status(
    text_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reviewer)
):
    """Get review status for a specific text."""
    # Check if text exists
    text = text_crud.get(db=db, text_id=text_id)
    if not text:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Text not found"
        )
    
    status_data = annotation_review_crud.get_review_status(
        db=db, text_id=text_id, reviewer_id=current_user.id
    )
    
    return ReviewStatus(**status_data)


@router.post("/submit", response_model=ReviewSubmissionResponse)
def submit_review(
    review_data: ReviewSubmission,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reviewer)
):
    """Submit review decisions for a text."""
    # Check if text exists and is ready for review
    text = text_crud.get(db=db, text_id=review_data.text_id)
    if not text:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Text not found"
        )
    
    if text.status != ANNOTATED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Text must be in annotated status for review. Current status: {text.status}"
        )
    
    # Validate that all annotations are being reviewed
    review_status = annotation_review_crud.get_review_status(
        db=db, text_id=review_data.text_id, reviewer_id=current_user.id
    )
    
    if len(review_data.decisions) != review_status["total_annotations"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Must review all annotations. Expected {review_status['total_annotations']}, got {len(review_data.decisions)}"
        )
    
    # Submit reviews
    reviews = annotation_review_crud.submit_reviews(
        db=db,
        text_id=review_data.text_id,
        reviewer_id=current_user.id,
        decisions=review_data.decisions
    )
    
    # Check if there are any disagreed annotations
    disagreed_count = sum(1 for decision in review_data.decisions if decision.decision == "disagree")
    
    # Set status based on review results
    if disagreed_count > 0:
        # If there are disagreements, set status to reviewed_needs_revision
        updated_text = text_crud.update_status(
            db=db,
            text_id=review_data.text_id,
            status=REVIEWED_NEEDS_REVISION,
            reviewer_id=current_user.id
        )
    else:
        # If all annotations are agreed, set status to reviewed
        updated_text = text_crud.update_status(
            db=db,
            text_id=review_data.text_id,
            status=REVIEWED,
            reviewer_id=current_user.id
        )
    
    # Find next text for review (excluding texts annotated by current reviewer)
    next_texts = text_crud.get_texts_for_review(db=db, skip=0, limit=1, reviewer_id=current_user.id)
    next_text = next_texts[0] if next_texts else None
    
    next_text_data = None
    if next_text:
        next_text_data = {
            "id": next_text.id,
            "title": next_text.title,
            "annotation_count": len(next_text.annotations)
        }
    
    return ReviewSubmissionResponse(
        message=f"Review submitted successfully for text '{text.title}'",
        text_id=review_data.text_id,
        total_reviews=len(reviews),
        status=updated_text.status,
        next_review_text=next_text_data
    )


@router.post("/annotation/{annotation_id}", response_model=AnnotationReviewResponse)
def review_annotation(
    annotation_id: int,
    review_data: AnnotationReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reviewer)
):
    """Create or update review for a specific annotation."""
    # Validate decision
    if review_data.decision not in ["agree", "disagree"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Decision must be 'agree' or 'disagree'"
        )
    
    # Create or update the review
    review = annotation_review_crud.create_or_update_review(
        db=db,
        annotation_id=annotation_id,
        reviewer_id=current_user.id,
        decision=review_data.decision,
        comment=review_data.comment
    )
    
    return AnnotationReviewResponse.model_validate(review)


@router.get("/annotation/{annotation_id}", response_model=List[AnnotationReviewResponse])
def get_annotation_reviews(
    annotation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all reviews for a specific annotation."""
    reviews = annotation_review_crud.get_reviews_by_annotation(db=db, annotation_id=annotation_id)
    return [AnnotationReviewResponse.model_validate(review) for review in reviews]


@router.get("/my-reviews", response_model=List[AnnotationReviewResponse])
def get_my_reviews(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reviewer)
):
    """Get all reviews by the current reviewer."""
    reviews = db.query(annotation_review_crud.model).filter(
        annotation_review_crud.model.reviewer_id == current_user.id
    ).offset(skip).limit(limit).all()
    
    return [AnnotationReviewResponse.model_validate(review) for review in reviews]


@router.get("/stats", response_model=dict)
def get_reviewer_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reviewer)
):
    """Get statistics for the current reviewer."""
    stats = annotation_review_crud.get_reviewer_stats(db=db, reviewer_id=current_user.id)
    return stats


@router.delete("/{review_id}")
def delete_review(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reviewer)
):
    """Delete a review - Only the reviewer who created it can delete it."""
    review = annotation_review_crud.get(db=db, review_id=review_id)
    
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )
    
    if review.reviewer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own reviews"
        )
    
    annotation_review_crud.delete(db=db, review_id=review_id)
    return {"message": "Review deleted successfully"} 


@router.get("/annotator/reviewed-work", response_model=List[dict])
def get_annotator_reviewed_work(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get texts that have been reviewed with comments for the current annotator."""
    # Get texts annotated by current user that have been reviewed
    texts = text_crud.get_texts_by_annotator_with_reviews(
        db=db, 
        annotator_id=current_user.id,
        skip=skip,
        limit=limit
    )
    
    result = []
    for text in texts:
        # Get review comments for this text
        reviews = annotation_review_crud.get_reviews_for_text_with_comments(
            db=db, 
            text_id=text.id
        )
        
        # Count agreements and disagreements
        agree_count = sum(1 for review in reviews if review.decision == "agree")
        disagree_count = sum(1 for review in reviews if review.decision == "disagree")
        
        # Get annotations with reviews
        annotations_with_reviews = []
        for annotation in text.annotations:
            annotation_reviews = [r for r in reviews if r.annotation_id == annotation.id]
            annotations_with_reviews.append({
                "id": annotation.id,
                "annotation_type": annotation.annotation_type,
                "selected_text": annotation.selected_text,
                "name": annotation.name,
                "reviews": [{
                    "id": review.id,
                    "decision": review.decision,
                    "comment": review.comment,
                    "reviewer_id": review.reviewer_id,
                    "created_at": review.created_at
                } for review in annotation_reviews]
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
            "reviewed_at": text.updated_at
        })
    
    return result


@router.get("/annotator/texts-need-revision", response_model=List[dict])
def get_texts_needing_revision(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get texts that need revision by the current annotator."""
    # Get texts annotated by current user that have reviewed_needs_revision status
    texts = text_crud.get_texts_by_annotator_and_status(
        db=db,
        annotator_id=current_user.id,
        status=REVIEWED_NEEDS_REVISION,
        skip=skip,
        limit=limit
    )
    
    result = []
    for text in texts:
        # Get review comments for this text
        reviews = annotation_review_crud.get_reviews_for_text_with_comments(
            db=db, 
            text_id=text.id
        )
        
        # Count disagreements
        disagree_count = sum(1 for review in reviews if review.decision == "disagree")
        disagree_comments = [review.comment for review in reviews if review.decision == "disagree" and review.comment]
        
        result.append({
            "id": text.id,
            "title": text.title,
            "status": text.status,
            "reviewer_id": text.reviewer_id,
            "total_annotations": len(text.annotations),
            "disagree_count": disagree_count,
            "disagree_comments": disagree_comments,
            "reviewed_at": text.updated_at
        })
    
    return result 