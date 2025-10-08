from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, Dict, Any, List
from datetime import datetime


class AnnotationListBase(BaseModel):
    """Base schema for annotation list."""
    title: str
    type: Optional[str] = None
    level: Optional[str] = None
    description: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None


class AnnotationListCreate(AnnotationListBase):
    """Schema for creating an annotation list item."""
    parent_id: Optional[str] = None


class AnnotationListResponse(AnnotationListBase):
    """Schema for annotation list response."""
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    parent_id: Optional[str] = None
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


class CategoryInput(BaseModel):
    """Schema for category in hierarchical JSON input."""
    id: Optional[str] = None
    name: str
    description: Optional[str] = None
    level: Optional[int] = None
    parent: Optional[str] = None
    mnemonic: Optional[str] = None
    examples: Optional[List[Any]] = None
    notes: Optional[str] = None
    subcategories: Optional[List['CategoryInput']] = None
    
    model_config = ConfigDict(extra='allow')  # Allow extra fields


class HierarchicalJSONInput(BaseModel):
    """Schema for hierarchical JSON input."""
    version: Optional[str] = None
    title: str
    description: Optional[str] = None
    copyright: Optional[str] = None
    categories: List[CategoryInput]
    
    model_config = ConfigDict(extra='allow')  # Allow extra fields


class AnnotationListBulkCreateRequest(BaseModel):
    """Schema for bulk create request."""
    data: HierarchicalJSONInput = Field(..., description="Hierarchical JSON data")


class AnnotationListBulkCreateResponse(BaseModel):
    """Schema for bulk create response."""
    success: bool
    message: str
    total_records_created: int
    record_ids: List[str]
    root_type: str


class CategoryOutput(BaseModel):
    """Schema for category in hierarchical JSON output."""
    id: Optional[str] = None
    name: str
    description: Optional[str] = None
    level: Optional[int] = None
    parent: Optional[str] = None
    mnemonic: Optional[str] = None
    examples: Optional[List[Any]] = None
    notes: Optional[str] = None
    subcategories: Optional[List['CategoryOutput']] = None
    
    model_config = ConfigDict(extra='allow')  # Allow extra fields


class HierarchicalJSONOutput(BaseModel):
    """Schema for hierarchical JSON output."""
    version: Optional[str] = None
    title: str
    description: Optional[str] = None
    copyright: Optional[str] = None
    categories: List[CategoryOutput]
    
    model_config = ConfigDict(extra='allow')  # Allow extra fields


# Update forward references for recursive models
CategoryInput.model_rebuild()
CategoryOutput.model_rebuild()

