from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import json
import traceback
from deps import get_db
from auth import require_admin
from models.user import User
from models.text import Text
from models.annotation import Annotation
from schemas.bulk_upload import (
    BulkUploadFileData, 
    BulkUploadResponse, 
    BulkUploadResult,
    BulkAnnotationData,
    BulkTextData
)
from schemas.text import TextCreate
from schemas.annotation import AnnotationCreate
from crud.text import text_crud
from crud.annotation import annotation_crud

router = APIRouter(prefix="/bulk-upload", tags=["Bulk Upload"])


def validate_json_file(file_content: str, filename: str) -> tuple[bool, BulkUploadFileData, List[str]]:
    """Validate a single JSON file and return parsed data or errors"""
    try:
        # Parse JSON
        data = json.loads(file_content)
        
        # Validate against schema
        file_data = BulkUploadFileData(**data)
        
        return True, file_data, []
    
    except json.JSONDecodeError as e:
        return False, None, [f"Invalid JSON format: {str(e)}"]
    
    except Exception as e:
        # Extract validation errors from Pydantic
        if hasattr(e, 'errors'):
            errors = []
            for error in e.errors():
                loc = " -> ".join(str(x) for x in error['loc'])
                errors.append(f"{loc}: {error['msg']}")
            return False, None, errors
        else:
            return False, None, [f"Validation error: {str(e)}"]


def create_text_from_data(db: Session, text_data: BulkTextData, uploaded_by: Optional[int] = None, annotation_type_id: Optional[str] = None) -> Text:
    """Create a text record from BulkTextData"""
    # Always set status to "initialized" for uploaded texts
    text_create = TextCreate(
        title=text_data.title,
        content=text_data.content,
        translation=text_data.translation,
        source=text_data.source,
        language=text_data.language,
        uploaded_by=uploaded_by,  # None for admin bulk uploads (system texts)
        annotation_type_id=annotation_type_id  # Optional annotation type
        # status will default to "initialized" in the schema
    )
    
    return text_crud.create(db=db, obj_in=text_create)


def create_annotations_from_data(
    db: Session, 
    text_id: int, 
    annotations_data: List[BulkAnnotationData], 
    annotator_id: Optional[int]
) -> List[Annotation]:
    """Create annotation records from BulkAnnotationData list (bulk upload - doesn't change text status)"""
    created_annotations = []
    
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
            confidence=annotation_data.confidence
        )
        
        annotation = annotation_crud.create_bulk(
            db=db, 
            obj_in=annotation_create, 
            annotator_id=annotator_id  # This can now be None for system annotations
        )
        created_annotations.append(annotation)
    
    return created_annotations


def check_title_uniqueness(db: Session, title: str, existing_titles: set) -> Optional[str]:
    """Check if title is unique both in database and within the upload batch"""
    # Check if title is already in this batch
    if title in existing_titles:
        return f"Duplicate title '{title}' found within upload batch"
    
    # Check if title exists in database
    existing_text = text_crud.get_by_title(db, title=title)
    if existing_text:
        return f"Text title '{title}' already exists in database"
    
    return None


def validate_annotation_bounds(annotation: BulkAnnotationData, text_length: int) -> Optional[str]:
    """Validate that annotation positions are within text bounds"""
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


def process_single_file(
    db: Session, 
    file_data: BulkUploadFileData, 
    filename: str, 
    annotator_id: int
) -> BulkUploadResult:
    """Process a single validated file and create database records (text status remains 'initialized')"""
    try:
        # Create text record with uploaded_by=None for admin bulk uploads (system texts)
        text = create_text_from_data(
            db, 
            file_data.text, 
            uploaded_by=None, 
            annotation_type_id=file_data.text.annotation_type_id
        )
        
        # Create annotation records with None as annotator_id (system annotations)
        annotations = create_annotations_from_data(
            db, 
            text.id, 
            file_data.annotations, 
            annotator_id=None  # Bulk uploaded annotations are system annotations
        )
        
        # Commit the transaction
        db.commit()
        
        return BulkUploadResult(
            filename=filename,
            success=True,
            text_id=text.id,
            created_annotations=len(annotations),
            error=None,
            validation_errors=None
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
            validation_errors=None
        )
    
    except Exception as e:
        db.rollback()
        return BulkUploadResult(
            filename=filename,
            success=False,
            text_id=None,
            created_annotations=0,
            error=f"Database error: {str(e)}",
            validation_errors=None
        )


@router.post("/upload-files", response_model=BulkUploadResponse)
async def upload_multiple_files(
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Upload multiple JSON files for bulk text and annotation creation.
    Admin only endpoint.
    """
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No files provided"
        )
    
    results = []
    total_files = len(files)
    successful_files = 0
    total_texts_created = 0
    total_annotations_created = 0
    
    # Keep track of titles in current batch to check for duplicates
    titles_in_batch = set()
    
    # Process each file
    for file in files:
        filename = file.filename or "unknown"
        
        # Check file type
        if not filename.endswith('.json'):
            results.append(BulkUploadResult(
                filename=filename,
                success=False,
                text_id=None,
                created_annotations=0,
                error="Only JSON files are supported",
                validation_errors=None
            ))
            continue
        
        try:
            # Read file content
            content = await file.read()
            file_content = content.decode('utf-8')
            
            # Validate JSON structure
            is_valid, file_data, validation_errors = validate_json_file(file_content, filename)
            
            if not is_valid:
                results.append(BulkUploadResult(
                    filename=filename,
                    success=False,
                    text_id=None,
                    created_annotations=0,
                    error="Schema validation failed",
                    validation_errors=validation_errors
                ))
                continue
            
            # Check title uniqueness before processing
            title_error = check_title_uniqueness(db, file_data.text.title, titles_in_batch)
            if title_error:
                results.append(BulkUploadResult(
                    filename=filename,
                    success=False,
                    text_id=None,
                    created_annotations=0,
                    error=title_error,
                    validation_errors=None
                ))
                continue
            
            # Add title to batch tracking
            titles_in_batch.add(file_data.text.title)
            
            # Process the file (create text and annotations)
            result = process_single_file(db, file_data, filename, current_user.id)
            results.append(result)
            
            if result.success:
                successful_files += 1
                total_texts_created += 1
                total_annotations_created += result.created_annotations
        
        except Exception as e:
            results.append(BulkUploadResult(
                filename=filename,
                success=False,
                text_id=None,
                created_annotations=0,
                error=f"File processing error: {str(e)}",
                validation_errors=None
            ))
    
    # Calculate summary
    failed_files = total_files - successful_files
    overall_success = successful_files > 0
    
    summary = {
        "total_texts_created": total_texts_created,
        "total_annotations_created": total_annotations_created,
        "success_rate": round((successful_files / total_files * 100), 2) if total_files > 0 else 0,
        "processing_details": {
            "files_processed": total_files,
            "successful": successful_files,
            "failed": failed_files
        }
    }
    
    return BulkUploadResponse(
        success=overall_success,
        total_files=total_files,
        successful_files=successful_files,
        failed_files=failed_files,
        results=results,
        summary=summary
    )


@router.post("/validate-files", response_model=Dict[str, Any])
async def validate_multiple_files(
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Validate multiple JSON files without creating database records.
    Admin only endpoint for dry-run validation.
    """
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No files provided"
        )
    
    validation_results = []
    total_files = len(files)
    valid_files = 0
    
    # Keep track of titles in current batch to check for duplicates
    titles_in_batch = set()
    
    # Validate each file
    for file in files:
        filename = file.filename or "unknown"
        
        # Check file type
        if not filename.endswith('.json'):
            validation_results.append({
                "filename": filename,
                "valid": False,
                "errors": ["Only JSON files are supported"],
                "text_title": None,
                "annotations_count": 0
            })
            continue
        
        try:
            # Read file content
            content = await file.read()
            file_content = content.decode('utf-8')
            
            # Validate JSON structure
            is_valid, file_data, validation_errors = validate_json_file(file_content, filename)
            
            if is_valid:
                # Additional validations for successful schema validation
                additional_errors = []
                
                # Check title uniqueness
                title_error = check_title_uniqueness(db, file_data.text.title, titles_in_batch)
                if title_error:
                    additional_errors.append(title_error)
                else:
                    titles_in_batch.add(file_data.text.title)
                
                # Check annotation bounds
                text_length = len(file_data.text.content)
                for i, annotation in enumerate(file_data.annotations):
                    bounds_error = validate_annotation_bounds(annotation, text_length)
                    if bounds_error:
                        additional_errors.append(f"Annotation {i+1}: {bounds_error}")
                
                if additional_errors:
                    validation_results.append({
                        "filename": filename,
                        "valid": False,
                        "errors": additional_errors,
                        "text_title": file_data.text.title,
                        "annotations_count": len(file_data.annotations)
                    })
                else:
                    valid_files += 1
                    validation_results.append({
                        "filename": filename,
                        "valid": True,
                        "errors": [],
                        "text_title": file_data.text.title,
                        "annotations_count": len(file_data.annotations)
                    })
            else:
                validation_results.append({
                    "filename": filename,
                    "valid": False,
                    "errors": validation_errors,
                    "text_title": None,
                    "annotations_count": 0
                })
        
        except Exception as e:
            validation_results.append({
                "filename": filename,
                "valid": False,
                "errors": [f"File processing error: {str(e)}"],
                "text_title": None,
                "annotations_count": 0
            })
    
    return {
        "total_files": total_files,
        "valid_files": valid_files,
        "invalid_files": total_files - valid_files,
        "validation_rate": round((valid_files / total_files * 100), 2) if total_files > 0 else 0,
        "results": validation_results
    } 