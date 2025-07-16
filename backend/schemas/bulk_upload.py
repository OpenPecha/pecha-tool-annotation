from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, validator
from .text import TextCreate
from .annotation import AnnotationCreate


class BulkAnnotationData(BaseModel):
    """Schema for individual annotation in bulk upload"""
    annotation_type: str = Field(..., description="Type of annotation")
    start_position: int = Field(..., ge=0, description="Start character position")
    end_position: int = Field(..., gt=0, description="End character position")
    selected_text: Optional[str] = Field(None, description="The annotated text span")
    label: Optional[str] = Field(None, description="Annotation label/category")
    name: Optional[str] = Field(None, description="Human-readable name")
    meta: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")
    confidence: Optional[int] = Field(100, ge=0, le=100, description="Confidence score")
    
    @validator('annotation_type')
    def validate_annotation_type(cls, v):
        """Validate that annotation_type is not empty"""
        if not v or not v.strip():
            raise ValueError('annotation_type cannot be empty')
        return v
    
    @validator('end_position')
    def validate_positions(cls, v, values):
        """Validate that end_position is greater than start_position"""
        if 'start_position' in values and v <= values['start_position']:
            raise ValueError('end_position must be greater than start_position')
        return v


class BulkTextData(BaseModel):
    """Schema for text data in bulk upload"""
    title: str = Field(..., description="Title of the text (must be unique)")
    content: str = Field(..., description="The actual text content")
    translation: Optional[str] = Field(None, description="Optional translation of the content")
    source: Optional[str] = Field(None, description="Source/origin of the text")
    language: Optional[str] = Field("en", description="Language code")
    # Note: status is not included in upload data - always set to "initialized"
    
    @validator('title')
    def validate_title(cls, v):
        """Validate that title is not empty and clean whitespace"""
        if not v or not v.strip():
            raise ValueError('title cannot be empty')
        return v.strip()  # Clean whitespace
    
    @validator('content')
    def validate_content(cls, v):
        """Validate that content is not empty"""
        if not v or not v.strip():
            raise ValueError('content cannot be empty')
        return v


class BulkUploadFileData(BaseModel):
    """Schema for a single JSON file in bulk upload"""
    text: BulkTextData = Field(..., description="Text data")
    annotations: List[BulkAnnotationData] = Field(default_factory=list, description="Annotations for the text")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")
    
    @validator('annotations')
    def validate_annotations(cls, v, values):
        """Validate annotations against text content"""
        if 'text' in values and v:
            text_content = values['text'].content
            text_length = len(text_content)
            
            for idx, annotation in enumerate(v):
                # Check if positions are within text bounds
                if annotation.start_position >= text_length:
                    raise ValueError(f'Annotation {idx}: start_position ({annotation.start_position}) exceeds text length ({text_length})')
                if annotation.end_position > text_length:
                    raise ValueError(f'Annotation {idx}: end_position ({annotation.end_position}) exceeds text length ({text_length})')
                
                # Extract selected text if not provided
                if not annotation.selected_text:
                    annotation.selected_text = text_content[annotation.start_position:annotation.end_position]
                
                # Validate selected text matches positions
                expected_text = text_content[annotation.start_position:annotation.end_position]
                if annotation.selected_text != expected_text:
                    raise ValueError(f'Annotation {idx}: selected_text does not match text at specified positions')
        
        return v


class BulkUploadRequest(BaseModel):
    """Schema for bulk upload request containing multiple files"""
    files: List[BulkUploadFileData] = Field(..., description="List of file data")
    
    @validator('files')
    def validate_files(cls, v):
        """Validate that files list is not empty"""
        if not v:
            raise ValueError('files list cannot be empty')
        return v


class BulkUploadResult(BaseModel):
    """Schema for individual file upload result"""
    filename: str = Field(..., description="Name of the processed file")
    success: bool = Field(..., description="Whether the upload was successful")
    text_id: Optional[int] = Field(None, description="ID of created text")
    created_annotations: int = Field(0, description="Number of annotations created")
    error: Optional[str] = Field(None, description="Error message if failed")
    validation_errors: Optional[List[str]] = Field(None, description="List of validation errors")


class BulkUploadResponse(BaseModel):
    """Schema for bulk upload response"""
    success: bool = Field(..., description="Overall success status")
    total_files: int = Field(..., description="Total number of files processed")
    successful_files: int = Field(..., description="Number of successfully processed files")
    failed_files: int = Field(..., description="Number of failed files")
    results: List[BulkUploadResult] = Field(..., description="Individual file results")
    summary: Dict[str, Any] = Field(..., description="Summary statistics") 