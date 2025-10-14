from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from database import Base


class AnnotationList(Base):
    __tablename__ = "annotation_list"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    type_id = Column(String, ForeignKey("annotation_type.id", ondelete="CASCADE"), nullable=True, index=True)
    title = Column(String, nullable=False) 
    level = Column(String, nullable=True) 
    parent_id = Column(String, ForeignKey("annotation_list.id", ondelete="CASCADE"), nullable=True, index=True)
    description = Column(Text, nullable=True) 
    created_by = Column(String, ForeignKey("users.auth0_user_id"), nullable=True, index=True)
    meta = Column(JSON, nullable=True) 
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    annotation_type = relationship("AnnotationType", back_populates="annotation_lists")
    creator = relationship("User", foreign_keys=[created_by])
    parent = relationship("AnnotationList", remote_side=[id], backref="children")