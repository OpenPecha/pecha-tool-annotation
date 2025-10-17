from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from deps import get_db
from auth import get_current_active_user, require_annotator, require_admin
from crud.annotation import annotation_crud
from crud.text import text_crud
from schemas.annotation import AnnotationCreate, AnnotationUpdate, AnnotationResponse
from models.user import User

router = APIRouter(prefix="/annotations", tags=["Annotations"])


@router.get("/", response_model=List[AnnotationResponse])
def read_annotations(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    text_id: Optional[int] = Query(None),
    annotator_id: Optional[int] = Query(None),
    annotation_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get annotations list with optional filtering."""
    annotations = annotation_crud.get_multi(
        db=db,
        skip=skip,
        limit=limit,
        text_id=text_id,
        annotator_id=annotator_id,
        annotation_type=annotation_type
    )
    return annotations


@router.post("/", response_model=AnnotationResponse, status_code=status.HTTP_201_CREATED)
def create_annotation(
    annotation_in: AnnotationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create new annotation - Annotator role or user who uploaded the text."""
    # Check if user has permission to annotate this text
    if current_user.role.value not in ["admin", "annotator"]:
        # For USER role, check if they uploaded this text
        if current_user.role.value == "user":
            text = text_crud.get(db=db, text_id=annotation_in.text_id)
            if not text:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Text not found"
                )
            
            if text.uploaded_by != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only annotate texts you uploaded"
                )
        else:
            # Other roles (like reviewer) are not allowed to create annotations
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{current_user.role.value}' is not allowed to create annotations"
            )
    
    # Validate annotation positions
    validation_result = annotation_crud.validate_annotation_positions(
        db=db,
        text_id=annotation_in.text_id,
        start_pos=annotation_in.start_position,
        end_pos=annotation_in.end_position
    )
    
    if not validation_result["valid"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=validation_result["error"]
        )
    
    # Auto-fill selected_text if not provided
    if not annotation_in.selected_text:
        annotation_in.selected_text = validation_result["selected_text"]
    
    return annotation_crud.create(
        db=db, 
        obj_in=annotation_in, 
        annotator_id=current_user.id
    )


@router.get("/my-annotations", response_model=List[AnnotationResponse])
def read_my_annotations(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get current user's annotations."""
    return annotation_crud.get_by_annotator(
        db=db, 
        annotator_id=current_user.id, 
        skip=skip, 
        limit=limit
    )


@router.get("/text/{text_id}", response_model=List[AnnotationResponse])
def read_annotations_by_text(
    text_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all annotations for a specific text."""
    return annotation_crud.get_by_text(db=db, text_id=text_id)


@router.get("/type/{annotation_type}", response_model=List[AnnotationResponse])
def read_annotations_by_type(
    annotation_type: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get annotations by type."""
    return annotation_crud.get_by_type(
        db=db, 
        annotation_type=annotation_type, 
        skip=skip, 
        limit=limit
    )


@router.get("/stats")
def get_annotation_stats(
    text_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get annotation statistics."""
    return annotation_crud.get_annotation_stats(db=db, text_id=text_id)


@router.get("/{annotation_id}", response_model=AnnotationResponse)
def read_annotation(
    annotation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get annotation by ID."""
    annotation = annotation_crud.get(db=db, annotation_id=annotation_id)
    if not annotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Annotation not found"
        )
    return annotation


@router.put("/{annotation_id}", response_model=AnnotationResponse)
def update_annotation(
    annotation_id: int,
    annotation_in: AnnotationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update annotation."""
    annotation = annotation_crud.get(db=db, annotation_id=annotation_id)
    if not annotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Annotation not found"
        )
    
    # Check if user is the annotator or admin
    if annotation.annotator_id != current_user.id and current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    # Check if annotation has been agreed upon by any reviewer
    if annotation_crud.is_annotation_agreed(db=db, annotation_id=annotation_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify annotation that has been agreed upon by a reviewer"
        )
    
    # Validate positions if they are being updated
    if annotation_in.start_position is not None or annotation_in.end_position is not None:
        start_pos = annotation_in.start_position or annotation.start_position
        end_pos = annotation_in.end_position or annotation.end_position
        
        validation_result = annotation_crud.validate_annotation_positions(
            db=db,
            text_id=annotation.text_id,
            start_pos=start_pos,
            end_pos=end_pos,
            exclude_annotation_id=annotation_id
        )
        
        if not validation_result["valid"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=validation_result["error"]
            )
        
        # Auto-update selected_text if positions changed
        if not annotation_in.selected_text:
            annotation_in.selected_text = validation_result["selected_text"]
    
    return annotation_crud.update(db=db, db_obj=annotation, obj_in=annotation_in)


@router.delete("/{annotation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_annotation(
    annotation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete annotation."""
    annotation = annotation_crud.get(db=db, annotation_id=annotation_id)
    if not annotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Annotation not found"
        )
    
    # Check if user is the annotator or admin
    if annotation.annotator_id:
        if annotation.annotator_id != current_user.id and current_user.role.value != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
    
    # Check if annotation has been agreed upon by any reviewer
    if annotation_crud.is_annotation_agreed(db=db, annotation_id=annotation_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete annotation that has been agreed upon by a reviewer"
        )
        
    annotation_crud.delete(db=db, annotation_id=annotation_id)


@router.delete("/text/{text_id}/my-annotations", status_code=status.HTTP_200_OK)
def delete_my_annotations_for_text(
    text_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete all of the current user's annotations for a specific text."""
    # Check if text exists
    text = text_crud.get(db=db, text_id=text_id)
    if not text:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Text not found"
        )
    
    # Delete all user's annotations for this text
    deleted_count = annotation_crud.delete_user_annotations(
        db=db,
        text_id=text_id,
        annotator_id=current_user.id
    )
    
    return {
        "message": f"Successfully deleted {deleted_count} annotation(s)",
        "deleted_count": deleted_count
    }


@router.post("/validate-positions")
def validate_annotation_positions(
    text_id: int,
    start_position: int,
    end_position: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Validate annotation positions before creating/updating."""
    return annotation_crud.validate_annotation_positions(
        db=db,
        text_id=text_id,
        start_pos=start_position,
        end_pos=end_position
    ) 