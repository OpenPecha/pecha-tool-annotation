from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from models.user_rejected_text import UserRejectedText


class UserRejectedTextCRUD:
    def create(self, db: Session, user_id: int, text_id: int) -> Optional[UserRejectedText]:
        """Add a text to user's rejected list."""
        try:
            db_obj = UserRejectedText(
                user_id=user_id,
                text_id=text_id
            )
            db.add(db_obj)
            db.commit()
            db.refresh(db_obj)
            return db_obj
        except IntegrityError:
            # Text already rejected by this user
            db.rollback()
            return None

    def get_user_rejected_texts(self, db: Session, user_id: int) -> List[UserRejectedText]:
        """Get all texts rejected by a user."""
        return db.query(UserRejectedText).filter(
            UserRejectedText.user_id == user_id
        ).all()

    def get_user_rejected_text_ids(self, db: Session, user_id: int) -> List[int]:
        """Get list of text IDs rejected by a user."""
        return [
            rejection.text_id for rejection in 
            db.query(UserRejectedText).filter(
                UserRejectedText.user_id == user_id
            ).all()
        ]

    def is_text_rejected_by_user(self, db: Session, user_id: int, text_id: int) -> bool:
        """Check if a text is rejected by a user."""
        return db.query(UserRejectedText).filter(
            UserRejectedText.user_id == user_id,
            UserRejectedText.text_id == text_id
        ).first() is not None

    def get_rejection_count_for_text(self, db: Session, text_id: int) -> int:
        """Get count of users who rejected a specific text."""
        return db.query(UserRejectedText).filter(
            UserRejectedText.text_id == text_id
        ).count()


user_rejected_text_crud = UserRejectedTextCRUD() 