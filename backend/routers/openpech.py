"""OpenPecha API routes. Thin layer: dependencies and controller delegation."""

from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from models.user import User

from auth import get_current_active_user

from controllers import openpech as openpech_controller

router = APIRouter(prefix="/openpecha", tags=["OpenPecha"])


@router.get("/texts")
async def get_all_texts(
    type: Optional[str] = Query(
        None, description="Filter type: root, commentary, or translations"
    ),
    current_user: User = Depends(get_current_active_user),
):
    """Get a list of OpenPecha metadata filtered by type."""
    return await openpech_controller.get_all_texts(current_user, type_filter=type)


@router.get("/texts/{id}/instances")
async def get_instances_for_text(
    id: str,
    current_user: User = Depends(get_current_active_user),
):
    """Get manifestations for a specific OpenPecha text ID."""
    return await openpech_controller.get_instances_for_text(current_user, id)


@router.get("/instances/{id}")
async def get_instance_text(
    id: str,
    current_user: User = Depends(get_current_active_user),
):
    """Get serialized text content using OpenPecha instance ID."""
    return await openpech_controller.get_instance_text(current_user, id)
