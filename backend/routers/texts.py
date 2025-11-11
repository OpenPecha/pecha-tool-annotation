from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from deps import get_db
from auth import get_current_active_user, require_admin, require_reviewer
from crud.text import text_crud
from schemas.text import TextCreate, TextUpdate, TextResponse, TaskSubmissionResponse, RecentActivityWithReviewCounts
from schemas.combined import TextWithAnnotations
from schemas.user_rejected_text import RejectedTextWithDetails
from models.user import User
from models.text import VALID_STATUSES, INITIALIZED, ANNOTATED, REVIEWED, SKIPPED, PROGRESS
from sqlalchemy import func
from models.user_rejected_text import UserRejectedText

router = APIRouter(prefix="/texts", tags=["Texts"])


@router.get("/status-options")
def get_status_options(
    current_user: User = Depends(get_current_active_user)
):
    """Get available text status options."""
    return {
        "status_options": VALID_STATUSES,
        "status_constants": {
            "INITIALIZED": INITIALIZED,
            "ANNOTATED": ANNOTATED,
            "REVIEWED": REVIEWED,
            "SKIPPED": SKIPPED,
            "PROGRESS": PROGRESS
        }
    }


@router.get("/", response_model=List[TextResponse])
def read_texts(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[str] = Query(None),
    language: Optional[str] = Query(None),
    reviewer_id: Optional[int] = Query(None),
    uploaded_by: Optional[str] = Query(None, regex="^(system|user)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get texts list with optional filtering."""
    # Validate status if provided
    if status is not None and status not in VALID_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {', '.join(VALID_STATUSES)}"
        )
    
    texts = text_crud.get_multi(
        db=db,
        skip=skip,
        limit=limit,
        status=status,
        language=language,
        reviewer_id=reviewer_id,
        uploaded_by=uploaded_by
    )
    return texts


@router.post("/", response_model=TextResponse, status_code=status.HTTP_201_CREATED)
def create_text(
    text_in: TextCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create new text."""
    # Check for duplicate title
    existing_text = text_crud.get_by_title(db=db, title=text_in.title)
    if existing_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Text with title '{text_in.title}' already exists"
        )
    
    # Set the uploaded_by field to the current user
    text_in.uploaded_by = current_user.id
    created_text = text_crud.create(db=db, obj_in=text_in)
    # For USER role, automatically assign them as annotator and set status to PROGRESS
    if current_user.role.value == "user":
        created_text = text_crud.assign_text_to_user(db=db, text_id=created_text.id, user_id=current_user.id)
    
    return created_text


@router.post("/upload-file", response_model=TextResponse, status_code=status.HTTP_201_CREATED)
def upload_text_file(
    annotation_type_id: str = Form(...),
    language: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Upload a text file and create a new text record."""
    # Check if file is a text file
    if not file.content_type or not file.content_type.startswith('text/'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only text files are allowed"
        )
    
    # Check for duplicate filename
    existing_text = text_crud.get_by_title(db=db, title=file.filename.rsplit('.', 1)[0])
    if existing_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A text with the filename '{file.filename}' has already been uploaded"
        )
    try:
        # Read the file content
        content = file.file.read().decode('utf-8')
        
        # Get filename without extension for title
        from datetime import datetime
        base_title = file.filename.rsplit('.', 1)[0] if file.filename else "Uploaded Text"
        current_time = datetime.now().strftime("%Y%m%d_%H%M%S")
        title = f"{base_title}_{current_time}"
        
        # Create TextCreate object
        text_create = TextCreate(
            title=title,
            content=content,
            source=file.filename,
            language=language, 
            annotation_type_id=annotation_type_id,
            uploaded_by=current_user.id
        )
        
        # Create the text record
        created_text = text_crud.create(db=db, obj_in=text_create)
        
        # For USER role, automatically assign them as annotator and set status to PROGRESS
        if current_user.role.value == "user":
            created_text = text_crud.assign_text_to_user(db=db, text_id=created_text.id, user_id=current_user.id)
        
        return created_text
        
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be valid UTF-8 encoded text"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing file: {str(e)}"
        )


@router.get("/for-annotation", response_model=List[TextResponse])
def get_texts_for_annotation(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get texts available for annotation (initialized status)."""
    return text_crud.get_texts_for_annotation(
        db=db, 
        skip=skip, 
        limit=limit, 
        user_id=current_user.id, 
        user_role=current_user.role.value
    )


@router.post("/start-work", response_model=TextResponse)
def start_work(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Start work for current user - find work in progress or assign new text."""
    text = text_crud.start_work(db=db, user_id=current_user.id, user_role=current_user.role.value)
    
    if not text:
        if current_user.role.value == "user":
            detail = "No texts available for annotation. Please upload a text file first."
        elif current_user.role.value == "annotator":
            detail = "No system texts available for annotation at this time. Contact your administrator."
        else:
            detail = "No texts available for annotation at this time"
        
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail
        )
    
    return text


@router.post("/skip-text", response_model=TextResponse)
def skip_text(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Skip current text by adding it to your rejected list and get next available text."""
    next_text = text_crud.skip_text(db=db, user_id=current_user.id, user_role=current_user.role.value)
    if not next_text:
        if current_user.role.value == "user":
            detail = "No more texts available for annotation. Please upload more text files."
        elif current_user.role.value == "annotator":
            detail = "No more system texts available for annotation at this time. Contact your administrator."
        else:
            detail = "No more texts available for annotation at this time"
        
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail
        )
    
    return next_text


@router.get("/my-rejected-texts", response_model=List[RejectedTextWithDetails])
def get_my_rejected_texts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all texts that the current user has rejected/skipped."""
    from crud.user_rejected_text import user_rejected_text_crud
    from schemas.user_rejected_text import RejectedTextWithDetails
    
    rejected_texts = user_rejected_text_crud.get_user_rejected_texts(db=db, user_id=current_user.id)
    
    # Convert to response format with text details
    result = []
    for rejection in rejected_texts:
        text = text_crud.get(db=db, text_id=rejection.text_id)
        if text:
            result.append(RejectedTextWithDetails(
                id=rejection.id,
                text_id=text.id,
                text_title=text.title,
                text_language=text.language,
                rejected_at=rejection.rejected_at
            ))
    
    return result


@router.get("/admin/text-statistics")
def get_admin_text_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get comprehensive text statistics for admins."""
    from crud.user_rejected_text import user_rejected_text_crud
    
    # Get basic text statistics
    stats = text_crud.get_stats(db)
    
    # Get rejection statistics
    total_rejections = db.query(UserRejectedText).count()
    unique_rejected_texts = db.query(UserRejectedText.text_id).distinct().count()
    
    # Calculate texts truly available (initialized and not rejected by all users)
    total_users = db.query(User).filter(User.is_active == True).count()
    heavily_rejected_texts = db.query(UserRejectedText.text_id).group_by(UserRejectedText.text_id).having(
        func.count(UserRejectedText.user_id) >= max(1, total_users * 0.5)  # Rejected by 50% or more users
    ).count()
    
    return {
        **stats,
        "total_rejections": total_rejections,
        "unique_rejected_texts": unique_rejected_texts,
        "heavily_rejected_texts": heavily_rejected_texts,
        "total_active_users": total_users,
        "available_for_new_users": stats["initialized"] - heavily_rejected_texts if stats["initialized"] > heavily_rejected_texts else 0
    }


@router.post("/{text_id}/cancel-work", status_code=status.HTTP_200_OK)
def cancel_work(
    text_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Cancel work on a text - make it available for others to work on."""
    # Get the text
    text = text_crud.get(db=db, text_id=text_id)
    if not text:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Text not found"
        )
    
    # Update status and remove annotator assignment
    text_crud.cancel_work(db=db, text_id=text_id, user_id=current_user.id)
    
    return {"message": "Work cancelled successfully"}


@router.post("/{text_id}/revert-work", status_code=status.HTTP_200_OK)
def revert_work(
    text_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Revert user work - remove all user annotations and make text available for others."""
    from crud.annotation import annotation_crud
    
    # Get the text
    text = text_crud.get(db=db, text_id=text_id)
    if not text:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Text not found"
        )
    
    # Check if the current user was the annotator of this text
    if text.annotator_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only revert work on texts you were assigned to"
        )
    
    # Check if text is in completed status (annotated or reviewed)
    if text.status not in [ANNOTATED, REVIEWED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Can only revert completed work. Current status: {text.status}"
        )
    
    # Delete all user annotations for this text
    deleted_count = annotation_crud.delete_user_annotations(
        db=db, 
        text_id=text_id, 
        annotator_id=current_user.id
    )
    
    return {
        "message": f"Work reverted successfully. Removed {deleted_count} annotations."
    }


@router.get("/my-work-in-progress", response_model=List[TextResponse])
def get_my_work_in_progress(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all texts that the current user is currently working on."""
    return text_crud.get_user_work_in_progress(
        db=db, 
        user_id=current_user.id, 
        user_role=current_user.role.value
    )


@router.post("/{text_id}/submit-task", response_model=TaskSubmissionResponse)
def submit_task(
    text_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Submit completed task - mark text as annotated and get next task if available."""
    # Get the text
    text = text_crud.get(db=db, text_id=text_id)
    if not text:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Text not found"
        )
    
    # Check if the current user is the annotator of this text
    if text.annotator_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only submit tasks you are assigned to"
        )
    
    # Check if text is in progress status
    if text.status != PROGRESS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Text must be in progress status to submit. Current status: {text.status}"
        )
    
    # Update status to annotated
    submitted_task = text_crud.update_status(
        db=db, 
        text_id=text_id, 
        status=ANNOTATED
    )
    
    # Find the next task for the user
    next_task = text_crud.start_work(db=db, user_id=current_user.id, user_role=current_user.role.value)
    
    if next_task:
        message = f"Task submitted successfully! Next task: '{next_task.title}'"
    else:
        message = "Task submitted successfully! No more tasks available at this time."
    
    return TaskSubmissionResponse(
        submitted_task=submitted_task,
        next_task=next_task,
        message=message
    )


@router.post("/{text_id}/update-task", response_model=TextResponse)
def update_task(
    text_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a completed task - allows editing previously submitted work."""
    # Get the text
    text = text_crud.get(db=db, text_id=text_id)
    if not text:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Text not found"
        )
    
    # Check if the current user was the annotator of this text
    if text.annotator_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update tasks you were assigned to"
        )
    
    # Check if text is in annotated or reviewed status (completed work)
    if text.status not in [ANNOTATED, REVIEWED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Can only update completed tasks. Current status: {text.status}"
        )
    
    # Update status back to annotated (marking as updated)
    updated_text = text_crud.update_status(
        db=db, 
        text_id=text_id, 
        status=ANNOTATED
    )
    
    return updated_text


@router.get("/for-review", response_model=List[TextResponse])
def get_texts_for_review(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reviewer)
):
    """Get texts ready for review (annotated status) - Reviewer only."""
    return text_crud.get_texts_for_review(db=db, skip=skip, limit=limit, reviewer_id=current_user.id)


@router.get("/stats")
def get_text_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get text statistics."""
    return text_crud.get_stats(db=db)


@router.get("/recent-activity", response_model=List[RecentActivityWithReviewCounts])
def get_recent_activity(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get recent texts annotated or reviewed by the current user with annotation review counts."""
    return text_crud.get_recent_activity_with_review_counts(db=db, user_id=current_user.id, limit=limit)


@router.get("/user-stats")
def get_user_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get statistics for the current user."""
    return text_crud.get_user_stats(db=db, user_id=current_user.id)


@router.get("/search/", response_model=List[TextResponse])
def search_texts(
    q: str = Query(..., min_length=1),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Search texts by title or content."""
    return text_crud.search(db=db, query=q, skip=skip, limit=limit)


@router.get("/{text_id}", response_model=TextResponse)
def read_text(
    text_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get text by ID."""
    text = text_crud.get(db=db, text_id=text_id)
    if not text:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Text not found"
        )
    return text


@router.get("/{text_id}/with-annotations", response_model=TextWithAnnotations)
def read_text_with_annotations(
    text_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get text with its annotations."""
    text = text_crud.get_with_annotations(db=db, text_id=text_id)
    if not text:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Text not found"
        )
    return text


@router.put("/{text_id}", response_model=TextResponse)
def update_text(
    text_id: int,
    text_in: TextUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update text."""
    text = text_crud.get(db=db, text_id=text_id)
    if not text:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Text not found"
        )
    
    return text_crud.update(db=db, db_obj=text, obj_in=text_in)


@router.put("/{text_id}/status", response_model=TextResponse)
def update_text_status(
    text_id: int,
    new_status: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reviewer)
):
    """Update text status - Reviewer only."""
    # Validate status
    if new_status not in VALID_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {', '.join(VALID_STATUSES)}"
        )
    
    text = text_crud.get(db=db, text_id=text_id)
    if not text:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Text not found"
        )
    
    reviewer_id = current_user.id if new_status == REVIEWED else None
    updated_text = text_crud.update_status(
        db=db, 
        text_id=text_id, 
        status=new_status, 
        reviewer_id=reviewer_id
    )
    
    return updated_text


@router.delete("/{text_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_text(
    text_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Delete text - Admin only."""
    text = text_crud.get(db=db, text_id=text_id)
    if not text:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Text not found"
        )
    
    text_crud.delete(db=db, text_id=text_id) 