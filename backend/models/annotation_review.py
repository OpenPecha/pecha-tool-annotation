from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base


class AnnotationReview(Base):
    __tablename__ = "annotation_reviews"

    id = Column(Integer, primary_key=True, index=True)
    annotation_id = Column(Integer, ForeignKey("annotations.id", ondelete="CASCADE"), nullable=False, index=True)
    reviewer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    decision = Column(String, nullable=False)  # "agree", "disagree"
    comment = Column(String, nullable=True)  # Optional comment from reviewer
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    annotation = relationship("Annotation", back_populates="reviews")
    reviewer = relationship("User", back_populates="annotation_reviews")

    # Ensure a reviewer can only review an annotation once
    __table_args__ = (
        UniqueConstraint('annotation_id', 'reviewer_id', name='unique_annotation_reviewer'),
    ) 