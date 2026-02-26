from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
import json
from deps import get_db
from auth import get_current_active_user
from crud.annotation_list import annotation_list_crud
from schemas.annotation_list import (
    AnnotationListResponse,
    AnnotationListBulkCreateRequest,
    AnnotationListBulkCreateResponse,
    HierarchicalJSONOutput,
    AnnotationListCreate,
    AnnotationListUpdate
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
        from schemas.annotation_list import HierarchicalJSONInput
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

@router.get("/type/{type_id}", response_model=HierarchicalJSONOutput)
def get_annotation_lists_by_type_hierarchical(
    type_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get annotation lists by type in original hierarchical format.
    """
    items = annotation_list_crud.get_by_type_id(db=db, type_id=type_id)
    if not items:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No annotation lists found with type '{type_id}'"
        )
    
    # Reconstruct hierarchical structure
    hierarchical_data = annotation_list_crud.reconstruct_hierarchy(items)
    
    return hierarchical_data


@router.delete("/type/{type_id}", status_code=status.HTTP_200_OK)
def delete_annotation_lists_by_type(
    type_id: str,
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
    
    deleted_count = annotation_list_crud.delete_by_type(db=db, type_id=type_id)
    return {
        "success": True,
        "message": f"Deleted {deleted_count} annotation list records",
        "deleted_count": deleted_count
    }


@router.post("/", response_model=AnnotationListResponse, status_code=status.HTTP_201_CREATED)
def create_annotation_list_item(
    item_in: AnnotationListCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new annotation list item."""
    if current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can create annotation list items"
        )
    
    # If type_id is provided, use it; otherwise use type name to get/create type
    if item_in.type_id:
        # Verify type exists
        from crud.annotation_type import annotation_type_crud
        annotation_type = annotation_type_crud.get(db=db, type_id=item_in.type_id)
        if not annotation_type:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Annotation type with id '{item_in.type_id}' not found"
            )
    elif item_in.type:
        # Get or create annotation type by name
        from crud.annotation_type import annotation_type_crud
        annotation_type = annotation_type_crud.get_or_create(
            db=db, 
            name=item_in.type, 
            uploader_id=current_user.auth0_user_id
        )
        item_in.type_id = annotation_type.id
    
    # Create the item
    created_item = annotation_list_crud.create(
        db=db,
        obj_in=item_in,
        created_by=current_user.auth0_user_id
    )
    
    return created_item


@router.put("/{item_id}", response_model=AnnotationListResponse)
def update_annotation_list_item(
    item_id: str,
    item_in: AnnotationListUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update an annotation list item."""
    if current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can update annotation list items"
        )
    
    item = annotation_list_crud.get(db=db, list_id=item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Annotation list item with id '{item_id}' not found"
        )
    
    try:
        updated_item = annotation_list_crud.update(db=db, db_obj=item, obj_in=item_in)
        return updated_item
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/{item_id}", status_code=status.HTTP_200_OK)
def delete_annotation_list_item(
    item_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete an annotation list item."""
    if current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can delete annotation list items"
        )
    
    item = annotation_list_crud.get(db=db, list_id=item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Annotation list item with id '{item_id}' not found"
        )
    
    # Check if item has children
    children = annotation_list_crud.get_children(db=db, parent_id=item_id)
    if children:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete item with {len(children)} child item(s). Delete children first."
        )
    
    success = annotation_list_crud.delete(db=db, list_id=item_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete annotation list item"
        )
    
    return {
        "success": True,
        "message": f"Deleted annotation list item '{item_id}'"
    }


@router.get("/{item_id}", response_model=AnnotationListResponse)
def get_annotation_list_item(
    item_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get an annotation list item by ID."""
    item = annotation_list_crud.get(db=db, list_id=item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Annotation list item with id '{item_id}' not found"
        )
    return item

