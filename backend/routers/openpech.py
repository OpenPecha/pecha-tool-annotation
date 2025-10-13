"""
OpenPecha API Router

This module provides FastAPI routes for interacting with the OpenPecha API.
It handles request validation, response transformation, and error handling.

Equivalent to the original JavaScript: routes/pecha.js
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query, status, Depends
from auth import get_current_active_user
from models.user import User
# Import API client functions
from apis.openpecha import (
    get_expressions,
    get_expression_texts,
    get_text,
)

router = APIRouter(prefix="/openpecha", tags=["OpenPecha"])


# ============================================================================
# API Routes
# ============================================================================

@router.get("/texts")
async def get_all_texts(
    type: Optional[str] = Query(None, description="Filter type: root, commentary, or translations"),
    current_user: User = Depends(get_current_active_user)
) -> List[Dict[str, Any]]:
    """
    Get a list of metadata filtered by type (root, commentary, translations).

    """
    # Validate type parameter
    allowed_types = ["root", "commentary", "translations"]
    if type and type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "Invalid type parameter",
                "allowedTypes": allowed_types,
                "provided": type,
            }
        )
    
    try:
        # Fetch metadata from OpenPecha API
        metadata = await get_expressions(type)
        
        # Transform response to match expected format
        return_data = [
            {
                "id": item.get("id"),
                "title": item.get("title"),
                "language": item.get("language"),
            }
            for item in metadata
        ]
        
        return return_data
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Failed to fetch metadata",
                "type": type,
                "details": str(e),
            }
        )


@router.get("/texts/{id}/instances")
async def get_instances_for_text(id: str, current_user: User = Depends(get_current_active_user)) -> List[Dict[str, Any]]:
    """
    Get manifestations for a specific text ID.
    
    """
    if not id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Expression ID is required"}
        )
    
    try:
        manifestations = await get_expression_texts(id)
        
        if not manifestations:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error": "Expression not found",
                    "expression_id": id,
                }
            )
        
        # Transform response to match expected format
        return_data = [
            {
                "id": item.get("id"),
                "expression_id": item.get("expression"),
                "annotation": item.get("annotations"),
                "type": item.get("type"),
            }
            for item in manifestations
        ]
        
        return return_data
    
    except HTTPException as e:
        # Handle specific error cases
        if e.status_code == status.HTTP_404_NOT_FOUND or "404" in str(e.detail) or "not found" in str(e.detail).lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error": "Expression not found",
                    "expression_id": id,
                    "details": str(e.detail),
                }
            )
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Failed to fetch manifestations",
                "expression_id": id,
                "details": str(e),
            }
        )


@router.get("/instances/{id}")
async def get_instance_text(id: str, current_user: User = Depends(get_current_active_user)) -> Dict[str, Any]:
    """
    Get serialized text content using instance ID.
    
    """
    if not id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Instance ID is required"}
        )
    try:
        text_content = await get_text(id)
        
        if not text_content:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error": "Instance not found",
                    "id": id,
                }
            )
        
        return text_content
    
    except HTTPException as e:
        # Handle specific error cases
        if e.status_code == status.HTTP_404_NOT_FOUND or "404" in str(e.detail) or "not found" in str(e.detail).lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error": "Text not found",
                    "id": id,
                    "details": str(e.detail),
                }
            )
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Failed to fetch text content",
                "id": id,
                "details": str(e),
            }
        )

