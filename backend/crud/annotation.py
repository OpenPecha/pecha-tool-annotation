from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from models.annotation import Annotation
from models.text import Text, INITIALIZED, ANNOTATED, PROGRESS
from schemas.annotation import AnnotationCreate, AnnotationUpdate


class AnnotationCRUD:
    def create(self, db: Session, obj_in: AnnotationCreate, annotator_id: int) -> Annotation:
        """Create a new annotation."""
        db_obj = Annotation(
            text_id=obj_in.text_id,
            annotator_id=annotator_id,
            annotation_type=obj_in.annotation_type,
            start_position=obj_in.start_position,
            end_position=obj_in.end_position,
            selected_text=obj_in.selected_text,
            label=obj_in.label,
            meta=obj_in.meta,
            confidence=obj_in.confidence,
        )
        db.add(db_obj)
        
        # Update text status to progress if it was initialized  
        text = db.query(Text).filter(Text.id == obj_in.text_id).first()
        if text and text.status == INITIALIZED:
            text.status = PROGRESS
            db.add(text)
        
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get(self, db: Session, annotation_id: int) -> Optional[Annotation]:
        """Get annotation by ID."""
        return db.query(Annotation).filter(Annotation.id == annotation_id).first()

    def get_multi(
        self, 
        db: Session, 
        skip: int = 0, 
        limit: int = 100,
        text_id: Optional[int] = None,
        annotator_id: Optional[int] = None,
        annotation_type: Optional[str] = None
    ) -> List[Annotation]:
        """Get multiple annotations with optional filtering."""
        query = db.query(Annotation)
        
        if text_id:
            query = query.filter(Annotation.text_id == text_id)
        
        if annotator_id:
            query = query.filter(Annotation.annotator_id == annotator_id)
            
        if annotation_type:
            query = query.filter(Annotation.annotation_type == annotation_type)
        
        return query.offset(skip).limit(limit).all()

    def get_by_text(self, db: Session, text_id: int) -> List[Annotation]:
        """Get all annotations for a specific text."""
        return db.query(Annotation).filter(Annotation.text_id == text_id).all()

    def get_by_annotator(self, db: Session, annotator_id: int, skip: int = 0, limit: int = 100) -> List[Annotation]:
        """Get annotations by a specific annotator."""
        return db.query(Annotation).filter(
            Annotation.annotator_id == annotator_id
        ).offset(skip).limit(limit).all()

    def get_by_type(self, db: Session, annotation_type: str, skip: int = 0, limit: int = 100) -> List[Annotation]:
        """Get annotations by type."""
        return db.query(Annotation).filter(
            Annotation.annotation_type == annotation_type
        ).offset(skip).limit(limit).all()

    def update(self, db: Session, db_obj: Annotation, obj_in: AnnotationUpdate) -> Annotation:
        """Update annotation."""
        obj_data = obj_in.model_dump(exclude_unset=True)
        
        for field, value in obj_data.items():
            setattr(db_obj, field, value)
        
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def delete(self, db: Session, annotation_id: int) -> Optional[Annotation]:
        """Delete annotation."""
        obj = db.query(Annotation).filter(Annotation.id == annotation_id).first()
        if obj:
            text_id = obj.text_id
            db.delete(obj)
            
            # Check if text should be reverted to initialized status
            remaining_annotations = db.query(Annotation).filter(
                Annotation.text_id == text_id
            ).count()
            
            if remaining_annotations == 0:
                text = db.query(Text).filter(Text.id == text_id).first()
                if text and text.status == ANNOTATED:
                    text.status = INITIALIZED
                    db.add(text)
            
            db.commit()
        return obj

    def get_overlapping_annotations(
        self, 
        db: Session, 
        text_id: int, 
        start_pos: int, 
        end_pos: int,
        exclude_annotation_id: Optional[int] = None
    ) -> List[Annotation]:
        """Get annotations that overlap with given position range."""
        query = db.query(Annotation).filter(
            Annotation.text_id == text_id,
            Annotation.start_position < end_pos,
            Annotation.end_position > start_pos
        )
        
        if exclude_annotation_id:
            query = query.filter(Annotation.id != exclude_annotation_id)
        
        return query.all()

    def validate_annotation_positions(
        self, 
        db: Session, 
        text_id: int, 
        start_pos: int, 
        end_pos: int,
        exclude_annotation_id: Optional[int] = None
    ) -> dict:
        """Validate annotation positions against text content."""
        text = db.query(Text).filter(Text.id == text_id).first()
        if not text:
            return {"valid": False, "error": "Text not found"}
        
        if start_pos < 0 or end_pos > len(text.content):
            return {"valid": False, "error": "Positions out of text bounds"}
        
        if start_pos >= end_pos:
            return {"valid": False, "error": "Start position must be less than end position"}
        
        # Check for overlapping annotations (optional - depends on requirements)
        overlapping = self.get_overlapping_annotations(
            db, text_id, start_pos, end_pos, exclude_annotation_id
        )
        
        return {
            "valid": True,
            "selected_text": text.content[start_pos:end_pos],
            "overlapping_annotations": len(overlapping) > 0
        }

    def get_annotation_stats(self, db: Session, text_id: Optional[int] = None) -> dict:
        """Get annotation statistics."""
        query = db.query(Annotation)
        if text_id:
            query = query.filter(Annotation.text_id == text_id)
        
        total = query.count()
        
        # Get stats by type
        type_stats = db.query(
            Annotation.annotation_type, 
            func.count(Annotation.id)
        ).group_by(Annotation.annotation_type)
        
        if text_id:
            type_stats = type_stats.filter(Annotation.text_id == text_id)
        
        type_counts = {type_name: count for type_name, count in type_stats.all()}
        
        # Get stats by annotator
        annotator_stats = db.query(
            Annotation.annotator_id, 
            func.count(Annotation.id)
        ).group_by(Annotation.annotator_id)
        
        if text_id:
            annotator_stats = annotator_stats.filter(Annotation.text_id == text_id)
        
        annotator_counts = {annotator_id: count for annotator_id, count in annotator_stats.all()}
        
        return {
            "total": total,
            "by_type": type_counts,
            "by_annotator": annotator_counts
        }


annotation_crud = AnnotationCRUD() 