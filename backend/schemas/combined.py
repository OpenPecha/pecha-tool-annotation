from pydantic import BaseModel, ConfigDict
from typing import List
from .text import TextResponse
from .annotation import AnnotationResponse


class TextWithAnnotations(TextResponse):
    """Text response with included annotations."""
    annotations: List[AnnotationResponse] = [] 