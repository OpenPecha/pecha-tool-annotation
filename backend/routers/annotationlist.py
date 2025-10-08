from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
import json
from deps import get_db
from auth import get_current_active_user
from crud.annotationlist import annotation_list_crud
from schemas.annotationlist import (
    AnnotationListResponse,
    AnnotationListBulkCreateRequest,
    AnnotationListBulkCreateResponse,
    HierarchicalJSONOutput
)
from models.user import User

router = APIRouter(prefix="/annotation-lists", tags=["Annotation Lists"])


@router.post("/upload", response_model=AnnotationListBulkCreateResponse, status_code=status.HTTP_201_CREATED)
async def upload_annotation_list_file(
    file: UploadFile = File(..., description="JSON file with hierarchical annotation list"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Upload a JSON file with hierarchical annotation list.
    
    Accepts a JSON file and recursively creates database records
    while maintaining parent-child relationships. The creator is automatically
    set to the authenticated user.
    
    - **file**: JSON file with hierarchical structure (categories/subcategories)
    """

    if current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can upload annotation lists"
        )
    try:
        # Read and parse JSON file
        contents = await file.read()
        json_data = json.loads(contents)
        
        # Validate and parse using Pydantic
        from schemas.annotationlist import HierarchicalJSONInput
        hierarchical_data = HierarchicalJSONInput(**json_data)
        
        # Use the root title as the type for all records
        root_type = hierarchical_data.title
        
        # Prepare root metadata
        root_metadata = {}
        if hierarchical_data.version:
            root_metadata['version'] = hierarchical_data.version
        if hierarchical_data.copyright:
            root_metadata['copyright'] = hierarchical_data.copyright
        if hierarchical_data.description:
            root_metadata['root_description'] = hierarchical_data.description
        
        # Recursively create all records using authenticated user's auth0_user_id
        created_ids = annotation_list_crud.create_hierarchical(
            db=db,
            categories=hierarchical_data.categories,
            root_type=root_type,
            created_by=current_user.auth0_user_id,
            root_metadata=root_metadata if root_metadata else None
        )
        
        # Commit all changes
        db.commit()
        
        return AnnotationListBulkCreateResponse(
            success=True,
            message=f"Successfully created {len(created_ids)} annotation list records from file '{file.filename}'",
            total_records_created=len(created_ids),
            record_ids=created_ids,
            root_type=root_type
        )
    
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid JSON file: {str(e)}"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create annotation list: {str(e)}"
        )


@router.get("/type/{type_value}/flat", response_model=List[AnnotationListResponse])
def get_annotation_lists_by_type_flat(
    type_value: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all annotation lists by type as flat list (all records)."""
    items = annotation_list_crud.get_by_type(db=db, type_value=type_value)
    if not items:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No annotation lists found with type '{type_value}'"
        )
    return items

@router.get("/", response_model=List[AnnotationListResponse])
def get_all_annotation_lists(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all annotation lists."""
    return annotation_list_crud.get_all(db=db)

@router.get("/types", response_model=List[str])
def get_annotation_list_types(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all unique annotation list types."""
    return annotation_list_crud.get_unique_types(db=db)

@router.get("/type/{type_value}", response_model=HierarchicalJSONOutput)
def get_annotation_lists_by_type_hierarchical(
    type_value: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get annotation lists by type in original hierarchical format.
    
    Returns the data reconstructed as a hierarchical JSON structure,
    matching the format that was originally uploaded.
    """
    items = annotation_list_crud.get_by_type(db=db, type_value=type_value)
    if not items:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No annotation lists found with type '{type_value}'"
        )
    
    # Reconstruct hierarchical structure
    hierarchical_data = annotation_list_crud.reconstruct_hierarchy(items)
    
    return hierarchical_data


@router.delete("/type/{type_value}", status_code=status.HTTP_200_OK)
def delete_annotation_lists_by_type(
    type_value: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete all annotation lists of a specific type."""
    # Check if user is admin
    if current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can delete annotation lists"
        )
    
    deleted_count = annotation_list_crud.delete_by_type(db=db, type_value=type_value)
    return {
        "success": True,
        "message": f"Deleted {deleted_count} annotation list records",
        "deleted_count": deleted_count
    }

