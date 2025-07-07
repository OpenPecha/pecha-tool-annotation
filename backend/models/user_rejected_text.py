from sqlalchemy import Column, Integer, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base


class UserRejectedText(Base):
    __tablename__ = "user_rejected_texts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    text_id = Column(Integer, ForeignKey("texts.id", ondelete="CASCADE"), nullable=False)
    rejected_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="rejected_texts")
    text = relationship("Text", back_populates="rejected_by_users")

    # Ensure a user can only reject a text once
    __table_args__ = (
        UniqueConstraint('user_id', 'text_id', name='unique_user_text_rejection'),
    ) 