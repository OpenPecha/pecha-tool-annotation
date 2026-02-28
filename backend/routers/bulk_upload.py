"""Bulk upload API routes. Thin layer: dependencies and controller delegation."""

from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from deps import get_db
from auth import require_admin
from models.user import User
from schemas.bulk_upload import BulkUploadResponse

from controllers import bulk_upload as bulk_upload_controller

router = APIRouter(prefix="/bulk-upload", tags=["Bulk Upload"])


@router.post("/upload-files", response_model=BulkUploadResponse)
async def upload_multiple_files(
    files: List[UploadFile] = File(...),
    annotation_type_id: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Upload multiple JSON files for bulk text and annotation creation. Admin only."""
    return await bulk_upload_controller.upload_multiple_files(
        db, current_user, files, annotation_type_id=annotation_type_id
    )


@router.post("/validate-files")
async def validate_multiple_files(
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Validate multiple JSON files without creating database records. Admin only."""
    return await bulk_upload_controller.validate_multiple_files(
        db, current_user, files
    )
