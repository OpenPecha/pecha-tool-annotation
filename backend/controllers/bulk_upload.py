"""Bulk upload route actions. All functions take db, current_user, and request data; return result or raise HTTPException."""

import json
from typing import Any, Dict, List, Optional

from fastapi import HTTPException, status, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from crud.text import text_crud
from crud.annotation import annotation_crud
from models.text import Text
from models.annotation import Annotation
from schemas.bulk_upload import (
    BulkUploadFileData,
    BulkUploadResponse,
    BulkUploadResult,
    BulkAnnotationData,
    BulkTextData,
)
from schemas.text import TextCreate
from schemas.annotation import AnnotationCreate


def _validate_json_file(
    file_content: str,
) -> tuple[bool, Optional[BulkUploadFileData], List[str]]:
    """Validate a single JSON file and return parsed data or errors."""
    try:
        data = json.loads(file_content)
        file_data = BulkUploadFileData(**data)
        return True, file_data, []
    except json.JSONDecodeError as e:
        return False, None, [f"Invalid JSON format: {str(e)}"]
    except Exception as e:
        if hasattr(e, "errors"):
            errors = []
            for error in e.errors():
                loc = " -> ".join(str(x) for x in error["loc"])
                errors.append(f"{loc}: {error['msg']}")
            return False, None, errors
        return False, None, [f"Validation error: {str(e)}"]


def _create_text_from_data(
    db: Session,
    text_data: BulkTextData,
    uploaded_by: Optional[int] = None,
    annotation_type_id: Optional[str] = None,
) -> Text:
    """Create a text record from BulkTextData."""
    text_create = TextCreate(
        title=text_data.title,
        content=text_data.content,
        translation=text_data.translation,
        source="Bulk Upload",
        language=text_data.language,
        uploaded_by=uploaded_by,
        annotation_type_id=annotation_type_id,
    )
    return text_crud.create(db=db, obj_in=text_create)


def _create_annotations_from_data(
    db: Session,
    text_id: int,
    annotations_data: List[BulkAnnotationData],
    annotator_id: Optional[int],
) -> List[Annotation]:
    """Create annotation records from BulkAnnotationData list."""
    created = []
    for annotation_data in annotations_data:
        annotation_create = AnnotationCreate(
            text_id=text_id,
            annotation_type=annotation_data.annotation_type,
            start_position=annotation_data.start_position,
            end_position=annotation_data.end_position,
            selected_text=annotation_data.selected_text,
            label=annotation_data.label,
            name=annotation_data.name,
            meta=annotation_data.meta,
            confidence=annotation_data.confidence,
        )
        ann = annotation_crud.create_bulk(
            db=db, obj_in=annotation_create, annotator_id=annotator_id
        )
        created.append(ann)
    return created


def _check_title_uniqueness(
    db: Session, title: str, existing_titles: set
) -> Optional[str]:
    """Check if title is unique in DB and within batch."""
    if title in existing_titles:
        return f"Duplicate title '{title}' found within upload batch"
    if text_crud.get_by_title(db, title=title):
        return f"Text title '{title}' already exists in database"
    return None


def _validate_annotation_bounds(
    annotation: BulkAnnotationData, text_length: int
) -> Optional[str]:
    """Validate that annotation positions are within text bounds."""
    if annotation.start_position < 0:
        return "start_position cannot be negative"
    if annotation.end_position < 0:
        return "end_position cannot be negative"
    if annotation.start_position >= text_length:
        return f"start_position ({annotation.start_position}) must be less than text length ({text_length})"
    if annotation.end_position > text_length:
        return f"end_position ({annotation.end_position}) must be less than or equal to text length ({text_length})"
    if annotation.start_position >= annotation.end_position:
        return "start_position must be less than end_position"
    return None


def _process_single_file(
    db: Session,
    file_data: BulkUploadFileData,
    filename: str,
    annotator_id: int,
    annotation_type_id: Optional[str] = None,
) -> BulkUploadResult:
    """Process a single validated file and create database records."""
    try:
        final_annotation_type_id = (
            annotation_type_id or file_data.text.annotation_type_id
        )
        text = _create_text_from_data(
            db,
            file_data.text,
            uploaded_by=None,
            annotation_type_id=final_annotation_type_id,
        )
        annotations = _create_annotations_from_data(
            db, text.id, file_data.annotations, annotator_id=None
        )
        db.commit()
        return BulkUploadResult(
            filename=filename,
            success=True,
            text_id=text.id,
            created_annotations=len(annotations),
            error=None,
            validation_errors=None,
        )
    except IntegrityError as e:
        db.rollback()
        error_msg = "Database integrity error"
        if "duplicate key" in str(e).lower() or "unique constraint" in str(e).lower():
            error_msg = f"Text title '{file_data.text.title}' already exists. Each text must have a unique title."
        return BulkUploadResult(
            filename=filename,
            success=False,
            text_id=None,
            created_annotations=0,
            error=error_msg,
            validation_errors=None,
        )
    except Exception as e:
        db.rollback()
        return BulkUploadResult(
            filename=filename,
            success=False,
            text_id=None,
            created_annotations=0,
            error=f"Database error: {str(e)}",
            validation_errors=None,
        )


async def upload_multiple_files(
    db: Session,
    current_user: Any,
    files: List[UploadFile],
    annotation_type_id: Optional[str] = None,
) -> BulkUploadResponse:
    """Upload multiple JSON files for bulk text and annotation creation (admin only)."""
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No files provided",
        )

    results = []
    total_files = len(files)
    successful_files = 0
    total_texts_created = 0
    total_annotations_created = 0
    titles_in_batch = set()

    for file in files:
        filename = file.filename or "unknown"
        if not filename.endswith(".json"):
            results.append(
                BulkUploadResult(
                    filename=filename,
                    success=False,
                    text_id=None,
                    created_annotations=0,
                    error="Only JSON files are supported",
                    validation_errors=None,
                )
            )
            continue

        try:
            content = await file.read()
            file_content = content.decode("utf-8")
            is_valid, file_data, validation_errors = _validate_json_file(
                file_content
            )

            if not is_valid:
                results.append(
                    BulkUploadResult(
                        filename=filename,
                        success=False,
                        text_id=None,
                        created_annotations=0,
                        error="Schema validation failed",
                        validation_errors=validation_errors,
                    )
                )
                continue

            title_error = _check_title_uniqueness(
                db, file_data.text.title, titles_in_batch
            )
            if title_error:
                results.append(
                    BulkUploadResult(
                        filename=filename,
                        success=False,
                        text_id=None,
                        created_annotations=0,
                        error=title_error,
                        validation_errors=None,
                    )
                )
                continue

            titles_in_batch.add(file_data.text.title)
            result = _process_single_file(
                db, file_data, filename, current_user.id, annotation_type_id
            )
            results.append(result)

            if result.success:
                successful_files += 1
                total_texts_created += 1
                total_annotations_created += result.created_annotations

        except Exception as e:
            results.append(
                BulkUploadResult(
                    filename=filename,
                    success=False,
                    text_id=None,
                    created_annotations=0,
                    error=f"File processing error: {str(e)}",
                    validation_errors=None,
                )
            )

    failed_files = total_files - successful_files
    overall_success = successful_files > 0
    summary = {
        "total_texts_created": total_texts_created,
        "total_annotations_created": total_annotations_created,
        "success_rate": round((successful_files / total_files * 100), 2)
        if total_files > 0
        else 0,
        "processing_details": {
            "files_processed": total_files,
            "successful": successful_files,
            "failed": failed_files,
        },
    }

    return BulkUploadResponse(
        success=overall_success,
        total_files=total_files,
        successful_files=successful_files,
        failed_files=failed_files,
        results=results,
        summary=summary,
    )


async def validate_multiple_files(
    db: Session, current_user: Any, files: List[UploadFile]
) -> Dict[str, Any]:
    """Validate multiple JSON files without creating records (admin only)."""
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No files provided",
        )

    validation_results = []
    total_files = len(files)
    valid_files = 0
    titles_in_batch = set()

    for file in files:
        filename = file.filename or "unknown"
        if not filename.endswith(".json"):
            validation_results.append({
                "filename": filename,
                "valid": False,
                "errors": ["Only JSON files are supported"],
                "text_title": None,
                "annotations_count": 0,
            })
            continue

        try:
            content = await file.read()
            file_content = content.decode("utf-8")
            is_valid, file_data, validation_errors = _validate_json_file(
                file_content
            )

            if is_valid:
                additional_errors = []
                title_error = _check_title_uniqueness(
                    db, file_data.text.title, titles_in_batch
                )
                if title_error:
                    additional_errors.append(title_error)
                else:
                    titles_in_batch.add(file_data.text.title)
                text_length = len(file_data.text.content)
                for i, annotation in enumerate(file_data.annotations):
                    bounds_error = _validate_annotation_bounds(
                        annotation, text_length
                    )
                    if bounds_error:
                        additional_errors.append(
                            f"Annotation {i+1}: {bounds_error}"
                        )
                if additional_errors:
                    validation_results.append({
                        "filename": filename,
                        "valid": False,
                        "errors": additional_errors,
                        "text_title": file_data.text.title,
                        "annotations_count": len(file_data.annotations),
                    })
                else:
                    valid_files += 1
                    validation_results.append({
                        "filename": filename,
                        "valid": True,
                        "errors": [],
                        "text_title": file_data.text.title,
                        "annotations_count": len(file_data.annotations),
                    })
            else:
                validation_results.append({
                    "filename": filename,
                    "valid": False,
                    "errors": validation_errors,
                    "text_title": None,
                    "annotations_count": 0,
                })

        except Exception as e:
            validation_results.append({
                "filename": filename,
                "valid": False,
                "errors": [f"File processing error: {str(e)}"],
                "text_title": None,
                "annotations_count": 0,
            })

    return {
        "total_files": total_files,
        "valid_files": valid_files,
        "invalid_files": total_files - valid_files,
        "validation_rate": round((valid_files / total_files * 100), 2)
        if total_files > 0
        else 0,
        "results": validation_results,
    }
