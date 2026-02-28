"""Annotation types API routes. Thin layer: dependencies and controller delegation."""

from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from deps import get_db
from auth import get_current_active_user
from models.user import User
from schemas.annotation_type import (
    AnnotationTypeResponse,
    AnnotationTypeCreate,
    AnnotationTypeUpdate,
)

from controllers import annotation_types as annotation_types_controller

router = APIRouter(prefix="/annotation-types", tags=["Annotation Types"])


@router.post("/", response_model=AnnotationTypeResponse, status_code=201)
def create_annotation_type(
    annotation_type_in: AnnotationTypeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new annotation type. Only admins can create."""
    return annotation_types_controller.create_annotation_type(
        db, current_user, annotation_type_in
    )


@router.get("/", response_model=List[AnnotationTypeResponse])
def get_all_annotation_types(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get all annotation types with pagination."""
    return annotation_types_controller.get_all_annotation_types(
        db, current_user, skip=skip, limit=limit
    )


@router.get("/{type_id}", response_model=AnnotationTypeResponse)
def get_annotation_type(
    type_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get a specific annotation type by ID."""
    return annotation_types_controller.get_annotation_type(
        db, current_user, type_id
    )


@router.get("/name/{name}", response_model=AnnotationTypeResponse)
def get_annotation_type_by_name(
    name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get a specific annotation type by name."""
    return annotation_types_controller.get_annotation_type_by_name(
        db, current_user, name
    )


@router.put("/{type_id}", response_model=AnnotationTypeResponse)
def update_annotation_type(
    type_id: str,
    annotation_type_in: AnnotationTypeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update an annotation type. Only admins can update."""
    return annotation_types_controller.update_annotation_type(
        db, current_user, type_id, annotation_type_in
    )


@router.delete("/{type_id}")
def delete_annotation_type(
    type_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete an annotation type. Only admins can delete. Cascades to annotation lists."""
    return annotation_types_controller.delete_annotation_type(
        db, current_user, type_id
    )
