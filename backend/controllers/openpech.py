"""OpenPecha route actions. All functions take current_user and request data; return result or raise HTTPException."""

from typing import Any, Dict, List, Optional

from fastapi import HTTPException, status

from apis.openpecha import get_expressions, get_expression_texts, get_text


async def get_all_texts(
    current_user: Any, type_filter: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Get list of OpenPecha metadata filtered by type (root, commentary, translations)."""
    allowed_types = ["root", "commentary", "translations"]
    if type_filter and type_filter not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "Invalid type parameter",
                "allowedTypes": allowed_types,
                "provided": type_filter,
            },
        )

    try:
        metadata = await get_expressions(type_filter)
        return [
            {
                "id": item.get("id"),
                "title": item.get("title"),
                "language": item.get("language"),
            }
            for item in metadata
        ]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Failed to fetch metadata",
                "type": type_filter,
                "details": str(e),
            },
        )


async def get_instances_for_text(
    current_user: Any, text_id: str
) -> List[Dict[str, Any]]:
    """Get manifestations for a specific OpenPecha text ID."""
    if not text_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Expression ID is required"},
        )

    try:
        manifestations = await get_expression_texts(text_id)
        if not manifestations:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "Expression not found", "expression_id": text_id},
            )
        return [
            {
                "id": item.get("id"),
                "expression_id": item.get("expression"),
                "annotation": item.get("annotations"),
                "type": item.get("type"),
            }
            for item in manifestations
        ]
    except HTTPException as e:
        if (
            e.status_code == status.HTTP_404_NOT_FOUND
            or "404" in str(e.detail)
            or "not found" in str(e.detail).lower()
        ):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error": "Expression not found",
                    "expression_id": text_id,
                    "details": str(e.detail),
                },
            )
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Failed to fetch manifestations",
                "expression_id": text_id,
                "details": str(e),
            },
        )


async def get_instance_text(
    current_user: Any, instance_id: str
) -> Dict[str, Any]:
    """Get serialized text content using OpenPecha instance ID."""
    if not instance_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Instance ID is required"},
        )
    try:
        text_content = await get_text(instance_id)
        if not text_content:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "Instance not found", "id": instance_id},
            )
        return text_content
    except HTTPException as e:
        if (
            e.status_code == status.HTTP_404_NOT_FOUND
            or "404" in str(e.detail)
            or "not found" in str(e.detail).lower()
        ):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error": "Text not found",
                    "id": instance_id,
                    "details": str(e.detail),
                },
            )
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Failed to fetch text content",
                "id": instance_id,
                "details": str(e),
            },
        )
