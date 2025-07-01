from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from models.text import Text, TextStatus
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

    def get_multi(
        self, 
        db: Session, 
        skip: int = 0, 
        limit: int = 100,
        status: Optional[TextStatus] = None,
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
        status: Optional[TextStatus] = None
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
            setattr(db_obj, field, value)
        
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update_status(self, db: Session, text_id: int, status: TextStatus, reviewer_id: Optional[int] = None) -> Optional[Text]:
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

    def get_by_status(self, db: Session, status: TextStatus, skip: int = 0, limit: int = 100) -> List[Text]:
        """Get texts by status."""
        return db.query(Text).filter(Text.status == status).offset(skip).limit(limit).all()

    def get_texts_for_annotation(self, db: Session, skip: int = 0, limit: int = 100) -> List[Text]:
        """Get texts available for annotation (initialized status)."""
        return db.query(Text).filter(Text.status == TextStatus.INITIALIZED).offset(skip).limit(limit).all()

    def get_texts_for_review(self, db: Session, skip: int = 0, limit: int = 100) -> List[Text]:
        """Get texts ready for review (annotated status)."""
        return db.query(Text).filter(Text.status == TextStatus.ANNOTATED).offset(skip).limit(limit).all()

    def get_stats(self, db: Session) -> dict:
        """Get text statistics."""
        total = db.query(Text).count()
        initialized = db.query(Text).filter(Text.status == TextStatus.INITIALIZED).count()
        annotated = db.query(Text).filter(Text.status == TextStatus.ANNOTATED).count()
        reviewed = db.query(Text).filter(Text.status == TextStatus.REVIEWED).count()
        
        return {
            "total": total,
            "initialized": initialized,
            "annotated": annotated,
            "reviewed": reviewed
        }


text_crud = TextCRUD() 