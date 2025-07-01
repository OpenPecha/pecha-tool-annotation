from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base


class Annotation(Base):
    __tablename__ = "annotations"

    id = Column(Integer, primary_key=True, index=True)
    text_id = Column(Integer, ForeignKey("texts.id"), nullable=False, index=True)
    annotator_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    annotation_type = Column(String, nullable=False, index=True)  # e.g., "entity", "sentiment", "category"
    start_position = Column(Integer, nullable=False)  # Start character position in text
    end_position = Column(Integer, nullable=False)    # End character position in text
    selected_text = Column(String, nullable=True)     # The actual text that was annotated
    label = Column(String, nullable=True)             # The annotation label/value
    meta = Column(JSON, nullable=True)                # Additional metadata as JSON
    confidence = Column(Integer, default=100)         # Confidence score (0-100)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    text = relationship("Text", back_populates="annotations")
    annotator = relationship("User", back_populates="annotations") 