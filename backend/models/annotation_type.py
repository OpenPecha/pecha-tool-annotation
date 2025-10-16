from sqlalchemy import Column, String, DateTime, Text, JSON, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from database import Base


class AnnotationType(Base):
    __tablename__ = "annotation_type"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    name = Column(String, nullable=False, unique=True, index=True)
    uploader_id = Column(String, ForeignKey("users.auth0_user_id"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    annotation_lists = relationship("AnnotationList", back_populates="annotation_type", cascade="all, delete-orphan")

