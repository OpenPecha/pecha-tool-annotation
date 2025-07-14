from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from models.annotation_review import AnnotationReview
from models.annotation import Annotation
from models.text import Text
from models.user import User
from schemas.annotation_review import AnnotationReviewCreate, AnnotationReviewUpdate, ReviewDecision


class AnnotationReviewCRUD:
    def create(self, db: Session, obj_in: AnnotationReviewCreate, reviewer_id: int) -> AnnotationReview:
        """Create a new annotation review."""
        db_obj = AnnotationReview(
            annotation_id=obj_in.annotation_id,
            reviewer_id=reviewer_id,
            decision=obj_in.decision,
            comment=obj_in.comment
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get(self, db: Session, review_id: int) -> Optional[AnnotationReview]:
        """Get annotation review by ID."""
        return db.query(AnnotationReview).filter(AnnotationReview.id == review_id).first()

    def get_by_annotation_and_reviewer(
        self, db: Session, annotation_id: int, reviewer_id: int
    ) -> Optional[AnnotationReview]:
        """Get annotation review by annotation ID and reviewer ID."""
        return db.query(AnnotationReview).filter(
            and_(
                AnnotationReview.annotation_id == annotation_id,
                AnnotationReview.reviewer_id == reviewer_id
            )
        ).first()

    def get_reviews_by_text(self, db: Session, text_id: int, reviewer_id: int) -> List[AnnotationReview]:
        """Get all reviews for a text by a specific reviewer."""
        return db.query(AnnotationReview).join(Annotation).filter(
            and_(
                Annotation.text_id == text_id,
                AnnotationReview.reviewer_id == reviewer_id
            )
        ).all()

    def get_reviews_by_annotation(self, db: Session, annotation_id: int) -> List[AnnotationReview]:
        """Get all reviews for a specific annotation."""
        return db.query(AnnotationReview).filter(
            AnnotationReview.annotation_id == annotation_id
        ).all()

    def update(
        self, db: Session, db_obj: AnnotationReview, obj_in: AnnotationReviewUpdate
    ) -> AnnotationReview:
        """Update annotation review."""
        obj_data = obj_in.model_dump(exclude_unset=True)
        
        for field, value in obj_data.items():
            setattr(db_obj, field, value)
        
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def delete(self, db: Session, review_id: int) -> Optional[AnnotationReview]:
        """Delete annotation review."""
        obj = db.query(AnnotationReview).filter(AnnotationReview.id == review_id).first()
        if obj:
            db.delete(obj)
            db.commit()
        return obj

    def create_or_update_review(
        self, db: Session, annotation_id: int, reviewer_id: int, decision: str, comment: Optional[str] = None
    ) -> AnnotationReview:
        """Create or update an annotation review."""
        existing_review = self.get_by_annotation_and_reviewer(db, annotation_id, reviewer_id)
        
        if existing_review:
            # Update existing review
            update_data = AnnotationReviewUpdate(decision=decision, comment=comment)
            return self.update(db, existing_review, update_data)
        else:
            # Create new review
            create_data = AnnotationReviewCreate(
                annotation_id=annotation_id,
                decision=decision,
                comment=comment
            )
            return self.create(db, create_data, reviewer_id)

    def submit_reviews(
        self, db: Session, text_id: int, reviewer_id: int, decisions: List[ReviewDecision]
    ) -> List[AnnotationReview]:
        """Submit multiple reviews for a text."""
        reviews = []
        
        for decision in decisions:
            review = self.create_or_update_review(
                db=db,
                annotation_id=decision.annotation_id,
                reviewer_id=reviewer_id,
                decision=decision.decision,
                comment=decision.comment
            )
            reviews.append(review)
        
        return reviews

    def get_review_status(self, db: Session, text_id: int, reviewer_id: int) -> Dict[str, Any]:
        """Get review status for a text."""
        # Get all annotations for the text
        annotations = db.query(Annotation).filter(Annotation.text_id == text_id).all()
        total_annotations = len(annotations)
        
        # Get reviews by this reviewer for this text
        reviews = self.get_reviews_by_text(db, text_id, reviewer_id)
        reviewed_annotations = len(reviews)
        
        pending_annotations = total_annotations - reviewed_annotations
        is_complete = pending_annotations == 0
        
        return {
            "text_id": text_id,
            "total_annotations": total_annotations,
            "reviewed_annotations": reviewed_annotations,
            "pending_annotations": pending_annotations,
            "is_complete": is_complete
        }

    def get_review_session_data(self, db: Session, text_id: int, reviewer_id: int) -> Dict[str, Any]:
        """Get comprehensive review session data."""
        # Get text with annotations
        text = db.query(Text).filter(Text.id == text_id).first()
        if not text:
            return None
        
        # Get all annotations for the text
        annotations = db.query(Annotation).filter(Annotation.text_id == text_id).all()
        
        # Get existing reviews by this reviewer
        existing_reviews = self.get_reviews_by_text(db, text_id, reviewer_id)
        
        # Create review mapping
        review_map = {review.annotation_id: review for review in existing_reviews}
        
        # Format annotations with review status
        formatted_annotations = []
        for annotation in annotations:
            review = review_map.get(annotation.id)
            annotation_data = {
                "id": annotation.id,
                "annotation_type": annotation.annotation_type,
                "start_position": annotation.start_position,
                "end_position": annotation.end_position,
                "selected_text": annotation.selected_text,
                "label": annotation.label,
                "name": annotation.name,
                "meta": annotation.meta,
                "confidence": annotation.confidence,
                "annotator_id": annotation.annotator_id,
                "review_status": {
                    "reviewed": review is not None,
                    "decision": review.decision if review else None,
                    "comment": review.comment if review else None
                }
            }
            formatted_annotations.append(annotation_data)
        
        # Get review status
        review_status = self.get_review_status(db, text_id, reviewer_id)
        
        return {
            "text_id": text.id,
            "title": text.title,
            "content": text.content,
            "annotations": formatted_annotations,
            "review_status": review_status,
            "existing_reviews": existing_reviews
        }

    def get_reviewer_stats(self, db: Session, reviewer_id: int) -> Dict[str, Any]:
        """Get statistics for a reviewer."""
        total_reviews = db.query(AnnotationReview).filter(
            AnnotationReview.reviewer_id == reviewer_id
        ).count()
        
        agreed_reviews = db.query(AnnotationReview).filter(
            and_(
                AnnotationReview.reviewer_id == reviewer_id,
                AnnotationReview.decision == "agree"
            )
        ).count()
        
        disagreed_reviews = db.query(AnnotationReview).filter(
            and_(
                AnnotationReview.reviewer_id == reviewer_id,
                AnnotationReview.decision == "disagree"
            )
        ).count()
        
        # Get number of texts reviewed
        texts_reviewed = db.query(Text).filter(
            and_(
                Text.reviewer_id == reviewer_id,
                Text.status == "reviewed"
            )
        ).count()
        
        return {
            "total_reviews": total_reviews,
            "agreed_reviews": agreed_reviews,
            "disagreed_reviews": disagreed_reviews,
            "texts_reviewed": texts_reviewed,
            "agreement_rate": round((agreed_reviews / total_reviews * 100), 2) if total_reviews > 0 else 0
        }

    def get_reviews_for_text_with_comments(
        self, db: Session, text_id: int
    ) -> List[AnnotationReview]:
        """Get all reviews for annotations of a specific text."""
        return db.query(AnnotationReview).join(Annotation).filter(
            Annotation.text_id == text_id
        ).all()


# Create a global instance
annotation_review_crud = AnnotationReviewCRUD() 