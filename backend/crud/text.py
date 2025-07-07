from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from models.text import Text, INITIALIZED, ANNOTATED, REVIEWED, SKIPPED, PROGRESS, VALID_STATUSES
from models.annotation import Annotation
from schemas.text import TextCreate, TextUpdate


class TextCRUD:
    def create(self, db: Session, obj_in: TextCreate) -> Text:
        """Create a new text."""
        db_obj = Text(
            title=obj_in.title,
            content=obj_in.content,
            source=obj_in.source,
            language=obj_in.language,
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get(self, db: Session, text_id: int) -> Optional[Text]:
        """Get text by ID."""
        return db.query(Text).filter(Text.id == text_id).first()

    def get_with_annotations(self, db: Session, text_id: int) -> Optional[Text]:
        """Get text with its annotations."""
        return db.query(Text).filter(Text.id == text_id).first()

    def get_by_title(self, db: Session, title: str) -> Optional[Text]:
        """Get text by title."""
        return db.query(Text).filter(Text.title == title).first()

    def get_multi(
        self, 
        db: Session, 
        skip: int = 0, 
        limit: int = 100,
        status: Optional[str] = None,
        language: Optional[str] = None,
        reviewer_id: Optional[int] = None
    ) -> List[Text]:
        """Get multiple texts with optional filtering."""
        query = db.query(Text)
        
        if status:
            query = query.filter(Text.status == status)
        
        if language:
            query = query.filter(Text.language == language)
            
        if reviewer_id:
            query = query.filter(Text.reviewer_id == reviewer_id)
        
        return query.offset(skip).limit(limit).all()

    def get_texts_with_annotation_count(
        self, 
        db: Session, 
        skip: int = 0, 
        limit: int = 100,
        status: Optional[str] = None
    ) -> List[dict]:
        """Get texts with annotation count."""
        query = db.query(
            Text,
            func.count(Annotation.id).label('annotations_count')
        ).outerjoin(Annotation).group_by(Text.id)
        
        if status:
            query = query.filter(Text.status == status)
        
        results = query.offset(skip).limit(limit).all()
        
        return [
            {
                "text": text,
                "annotations_count": count
            }
            for text, count in results
        ]

    def update(self, db: Session, db_obj: Text, obj_in: TextUpdate) -> Text:
        """Update text."""
        obj_data = obj_in.model_dump(exclude_unset=True)
        
        for field, value in obj_data.items():
            # Validate status if being updated
            if field == 'status' and value is not None:
                if value not in VALID_STATUSES:
                    raise ValueError(f'Status must be one of: {", ".join(VALID_STATUSES)}')
            setattr(db_obj, field, value)
        
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update_status(self, db: Session, text_id: int, status: str, reviewer_id: Optional[int] = None) -> Optional[Text]:
        """Update text status."""
        db_obj = db.query(Text).filter(Text.id == text_id).first()
        if db_obj:
            db_obj.status = status
            if reviewer_id:
                db_obj.reviewer_id = reviewer_id
            db.add(db_obj)
            db.commit()
            db.refresh(db_obj)
        return db_obj

    def delete(self, db: Session, text_id: int) -> Optional[Text]:
        """Delete text."""
        obj = db.query(Text).filter(Text.id == text_id).first()
        if obj:
            db.delete(obj)
            db.commit()
        return obj

    def search(self, db: Session, query: str, skip: int = 0, limit: int = 100) -> List[Text]:
        """Search texts by title or content."""
        search_filter = Text.title.contains(query) | Text.content.contains(query)
        return db.query(Text).filter(search_filter).offset(skip).limit(limit).all()

    def get_by_status(self, db: Session, status: str, skip: int = 0, limit: int = 100) -> List[Text]:
        """Get texts by status."""
        return db.query(Text).filter(Text.status == status).offset(skip).limit(limit).all()

    def get_texts_for_annotation(self, db: Session, skip: int = 0, limit: int = 100) -> List[Text]:
        """Get texts available for annotation (initialized status)."""
        return db.query(Text).filter(Text.status == INITIALIZED).offset(skip).limit(limit).all()

    def get_texts_for_review(self, db: Session, skip: int = 0, limit: int = 100) -> List[Text]:
        """Get texts ready for review (annotated status)."""
        return db.query(Text).filter(Text.status == ANNOTATED).offset(skip).limit(limit).all()

    def get_stats(self, db: Session) -> dict:
        """Get text statistics."""
        total = db.query(Text).count()
        initialized = db.query(Text).filter(Text.status == INITIALIZED).count()
        annotated = db.query(Text).filter(Text.status == ANNOTATED).count()
        reviewed = db.query(Text).filter(Text.status == REVIEWED).count()
        skipped = db.query(Text).filter(Text.status == SKIPPED).count()
        progress = db.query(Text).filter(Text.status == PROGRESS).count()
        
        return {
            "total": total,
            "initialized": initialized,
            "annotated": annotated,
            "reviewed": reviewed,
            "skipped": skipped,
            "progress": progress
        }

    def get_work_in_progress(self, db: Session, user_id: int) -> Optional[Text]:
        """Get text that user is currently working on (progress status)."""
        return db.query(Text).filter(
            Text.annotator_id == user_id,
            Text.status == PROGRESS
        ).first()

    def get_unassigned_text(self, db: Session) -> Optional[Text]:
        """Get an unassigned text with initialized status."""
        return db.query(Text).filter(
            Text.status == INITIALIZED,
            Text.annotator_id.is_(None)
        ).first()

    def get_unassigned_text_for_user(self, db: Session, user_id: int) -> Optional[Text]:
        """Get an unassigned text with initialized status that user hasn't rejected."""
        from models.user_rejected_text import UserRejectedText
        
        # Get text IDs that user has rejected
        rejected_text_ids = db.query(UserRejectedText.text_id).filter(
            UserRejectedText.user_id == user_id
        ).subquery()
        
        # Find available text not in rejected list
        return db.query(Text).filter(
            Text.status == INITIALIZED,
            Text.annotator_id.is_(None),
            ~Text.id.in_(rejected_text_ids)
        ).first()

    def assign_text_to_user(self, db: Session, text_id: int, user_id: int) -> Optional[Text]:
        """Assign a text to a user and set status to progress."""
        text = db.query(Text).filter(Text.id == text_id).first()
        if text:
            text.annotator_id = user_id
            text.status = PROGRESS
            db.add(text)
            db.commit()
            db.refresh(text)
        return text

    def start_work(self, db: Session, user_id: int) -> Optional[Text]:
        """Start work for a user - find work in progress or assign new text."""
        # First, check if user has work in progress
        work_in_progress = self.get_work_in_progress(db, user_id)
        if work_in_progress:
            return work_in_progress
        
        # If no work in progress, find an unassigned text (excluding rejected ones)
        unassigned_text = self.get_unassigned_text_for_user(db, user_id)
        if unassigned_text:
            return self.assign_text_to_user(db, unassigned_text.id, user_id)
        
        # No texts available
        return None

    def get_recent_activity(self, db: Session, user_id: int, limit: int = 10) -> List[Text]:
        """Get recent texts annotated or reviewed by the user."""
        # Get texts where user was annotator or reviewer, ordered by updated_at desc
        recent_texts = db.query(Text).filter(
            (Text.annotator_id == user_id) | (Text.reviewer_id == user_id)
        ).filter(
            Text.status.in_([ANNOTATED, REVIEWED])  # Only completed work
        ).order_by(
            Text.updated_at.desc()
        ).limit(limit).all()
        
        return recent_texts

    def get_user_stats(self, db: Session, user_id: int) -> dict:
        """Get statistics for a specific user."""
        # Count texts annotated by user (where user is annotator and status is annotated/reviewed)
        texts_annotated = db.query(Text).filter(
            Text.annotator_id == user_id,
            Text.status.in_([ANNOTATED, REVIEWED])
        ).count()
        
        # Count texts reviewed by user (where user is reviewer and status is reviewed)
        reviews_completed = db.query(Text).filter(
            Text.reviewer_id == user_id,
            Text.status == REVIEWED
        ).count()
        
        # Count total annotations created by user
        from models.annotation import Annotation
        total_annotations = db.query(Annotation).filter(
            Annotation.annotator_id == user_id
        ).count()
        
        # Calculate accuracy rate (for now, simple calculation based on reviewed texts)
        # This could be enhanced with more sophisticated metrics
        total_user_texts = db.query(Text).filter(
            Text.annotator_id == user_id,
            Text.status.in_([ANNOTATED, REVIEWED])
        ).count()
        
        if total_user_texts > 0:
            reviewed_by_others = db.query(Text).filter(
                Text.annotator_id == user_id,
                Text.status == REVIEWED,
                Text.reviewer_id.isnot(None),
                Text.reviewer_id != user_id
            ).count()
            accuracy_rate = (reviewed_by_others / total_user_texts) * 100
        else:
            accuracy_rate = 0
        
        return {
            "texts_annotated": texts_annotated,
            "reviews_completed": reviews_completed,
            "total_annotations": total_annotations,
            "accuracy_rate": round(accuracy_rate, 1)
        }

    def skip_text(self, db: Session, user_id: int) -> Optional[Text]:
        """Skip current text by adding it to rejected list and get next available text."""
        from crud.user_rejected_text import user_rejected_text_crud
        
        # Find the current text in progress for the user
        current_text = self.get_work_in_progress(db, user_id)
        if not current_text:
            return None
        
        # Add current text to user's rejected list
        user_rejected_text_crud.create(db, user_id, current_text.id)
        
        # Reset the current text to make it available for others
        current_text.annotator_id = None
        current_text.status = INITIALIZED
        db.add(current_text)
        db.commit()
        
        # Find and assign the next available text (excluding rejected ones)
        next_text = self.get_unassigned_text_for_user(db, user_id)
        if next_text:
            return self.assign_text_to_user(db, next_text.id, user_id)
        
        return None

    def cancel_work(self, db: Session, user_id: int, text_id: int) -> bool:
        """Cancel current work on a text - make it available for others."""
        text = db.query(Text).filter(
            Text.id == text_id,
            Text.annotator_id == user_id,
            Text.status == PROGRESS
        ).first()
        
        if not text:
            return False
        
        # Reset text to make it available for others
        text.annotator_id = None
        text.status = INITIALIZED
        db.add(text)
        db.commit()
        
        return True

    def get_user_work_in_progress(self, db: Session, user_id: int) -> List[Text]:
        """Get all texts that user is currently working on (progress status)."""
        return db.query(Text).filter(
            Text.annotator_id == user_id,
            Text.status == PROGRESS
        ).all()


text_crud = TextCRUD() 