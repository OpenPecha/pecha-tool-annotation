from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from deps import get_db
from auth import get_current_active_user, require_admin, require_reviewer
from crud.text import text_crud
from schemas.text import TextCreate, TextUpdate, TextResponse, TaskSubmissionResponse
from schemas.combined import TextWithAnnotations
from models.user import User
from models.text import VALID_STATUSES, INITIALIZED, ANNOTATED, REVIEWED, SKIPPED, PROGRESS

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
        reviewer_id=reviewer_id
    )
    return texts


@router.post("/", response_model=TextResponse, status_code=status.HTTP_201_CREATED)
def create_text(
    text_in: TextCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create new text."""
    return text_crud.create(db=db, obj_in=text_in)


@router.get("/for-annotation", response_model=List[TextResponse])
def get_texts_for_annotation(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get texts available for annotation (initialized status)."""
    return text_crud.get_texts_for_annotation(db=db, skip=skip, limit=limit)


@router.post("/start-work", response_model=TextResponse)
def start_work(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Start work for current user - find work in progress or assign new text."""
    text = text_crud.start_work(db=db, user_id=current_user.id)
    
    if not text:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No texts available for annotation at this time"
        )
    
    return text


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
    next_task = text_crud.start_work(db=db, user_id=current_user.id)
    
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
    return text_crud.get_texts_for_review(db=db, skip=skip, limit=limit)


@router.get("/stats")
def get_text_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get text statistics."""
    return text_crud.get_stats(db=db)


@router.get("/recent-activity", response_model=List[TextResponse])
def get_recent_activity(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get recent texts annotated or reviewed by the current user."""
    return text_crud.get_recent_activity(db=db, user_id=current_user.id, limit=limit)


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