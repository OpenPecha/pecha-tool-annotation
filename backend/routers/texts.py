from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from deps import get_db
from auth import get_current_active_user, require_admin, require_reviewer
from crud.text import text_crud
from schemas.text import TextCreate, TextUpdate, TextResponse
from schemas.combined import TextWithAnnotations
from models.user import User
from models.text import TextStatus

router = APIRouter(prefix="/texts", tags=["Texts"])


@router.get("/", response_model=List[TextResponse])
def read_texts(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[TextStatus] = Query(None),
    language: Optional[str] = Query(None),
    reviewer_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get texts list with optional filtering."""
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
    new_status: TextStatus,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reviewer)
):
    """Update text status - Reviewer only."""
    text = text_crud.get(db=db, text_id=text_id)
    if not text:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Text not found"
        )
    
    reviewer_id = current_user.id if new_status == TextStatus.REVIEWED else None
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