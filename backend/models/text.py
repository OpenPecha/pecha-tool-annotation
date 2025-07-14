from sqlalchemy import Column, Integer, String, Text as SQLText, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base


# Text status constants
INITIALIZED = "initialized"
ANNOTATED = "annotated"
REVIEWED = "reviewed"
REVIEWED_NEEDS_REVISION = "reviewed_needs_revision"
SKIPPED = "skipped"
PROGRESS = "progress"

# List of all valid statuses for validation
VALID_STATUSES = [INITIALIZED, ANNOTATED, REVIEWED, REVIEWED_NEEDS_REVISION, SKIPPED, PROGRESS]


class Text(Base):
    __tablename__ = "texts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, unique=True,  nullable=False, index=True) 
    content = Column(SQLText, nullable=False)
    source = Column(String, nullable=True)  # Source document/file
    language = Column(String, default="en")
    status = Column(String, default=INITIALIZED, nullable=False)
    annotator_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    annotations = relationship("Annotation", back_populates="text", cascade="all, delete-orphan")
    reviewer = relationship("User", back_populates="reviewed_texts", foreign_keys=[reviewer_id]) 
    annotator = relationship("User", back_populates="annotated_texts", foreign_keys=[annotator_id])
    rejected_by_users = relationship("UserRejectedText", back_populates="text", cascade="all, delete-orphan")