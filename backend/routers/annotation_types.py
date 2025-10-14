from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from deps import get_db
from auth import get_current_active_user
from crud.annotation_type import annotation_type_crud
from schemas.annotation_type import (
    AnnotationTypeResponse,
    AnnotationTypeCreate,
    AnnotationTypeUpdate
)
from models.user import User

router = APIRouter(prefix="/annotation-types", tags=["Annotation Types"])


@router.post("/", response_model=AnnotationTypeResponse, status_code=status.HTTP_201_CREATED)
def create_annotation_type(
    annotation_type_in: AnnotationTypeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new annotation type.
    
    Only admins can create annotation types.
    """
    if current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can create annotation types"
        )
    
    # Check if type with this name already exists
    existing_type = annotation_type_crud.get_by_name(db=db, name=annotation_type_in.name)
    if existing_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Annotation type with name '{annotation_type_in.name}' already exists"
        )
    
    return annotation_type_crud.create(db=db, obj_in=annotation_type_in)


@router.get("/", response_model=List[AnnotationTypeResponse])
def get_all_annotation_types(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all annotation types.
    
    Returns a list of all annotation types with pagination support.
    """
    return annotation_type_crud.get_all(db=db, skip=skip, limit=limit)


@router.get("/{type_id}", response_model=AnnotationTypeResponse)
def get_annotation_type(
    type_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get a specific annotation type by ID.
    """
    annotation_type = annotation_type_crud.get(db=db, type_id=type_id)
    if not annotation_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Annotation type with id '{type_id}' not found"
        )
    return annotation_type


@router.get("/name/{name}", response_model=AnnotationTypeResponse)
def get_annotation_type_by_name(
    name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get a specific annotation type by name.
    """
    annotation_type = annotation_type_crud.get_by_name(db=db, name=name)
    if not annotation_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Annotation type with name '{name}' not found"
        )
    return annotation_type


@router.put("/{type_id}", response_model=AnnotationTypeResponse)
def update_annotation_type(
    type_id: str,
    annotation_type_in: AnnotationTypeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update an annotation type.
    
    Only admins can update annotation types.
    """
    if current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can update annotation types"
        )
    
    # Check if updating name to a name that already exists
    if annotation_type_in.name:
        existing_type = annotation_type_crud.get_by_name(db=db, name=annotation_type_in.name)
        if existing_type and existing_type.id != type_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Annotation type with name '{annotation_type_in.name}' already exists"
            )
    
    updated_type = annotation_type_crud.update(db=db, type_id=type_id, obj_in=annotation_type_in)
    if not updated_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Annotation type with id '{type_id}' not found"
        )
    return updated_type


@router.delete("/{type_id}", status_code=status.HTTP_200_OK)
def delete_annotation_type(
    type_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete an annotation type.
    
    Only admins can delete annotation types.
    Note: This will cascade delete all associated annotation lists.
    """
    if current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can delete annotation types"
        )
    
    success = annotation_type_crud.delete(db=db, type_id=type_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Annotation type with id '{type_id}' not found"
        )
    
    return {
        "success": True,
        "message": f"Annotation type deleted successfully"
    }

