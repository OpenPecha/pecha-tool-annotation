from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
import uuid
from models.annotation_list import AnnotationList
from models.annotation_type import AnnotationType
from schemas.annotation_list import AnnotationListCreate, CategoryInput, CategoryOutput, HierarchicalJSONOutput
from crud.annotation_type import annotation_type_crud


class AnnotationListCRUD:
    """CRUD operations for AnnotationList."""
    
    def create(self, db: Session, obj_in: AnnotationListCreate, created_by: str) -> AnnotationList:
        """Create a new annotation list item."""
        # Get or create annotation type if provided
        type_id = None
        if obj_in.type:
            annotation_type = annotation_type_crud.get_or_create(db=db, name=obj_in.type, uploader_id=created_by)
            type_id = annotation_type.id
        
        db_obj = AnnotationList(
            id=str(uuid.uuid4()),
            type_id=type_id,
            title=obj_in.title,
            level=obj_in.level,
            parent_id=obj_in.parent_id,
            description=obj_in.description,
            created_by=created_by,
            meta=obj_in.meta
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def get(self, db: Session, list_id: str) -> Optional[AnnotationList]:
        """Get annotation list by ID."""
        return db.query(AnnotationList).filter(AnnotationList.id == list_id).first()
    
    def get_multi(
        self, 
        db: Session, 
        skip: int = 0, 
        limit: int = 100,
        type_filter: Optional[str] = None,
        created_by: Optional[str] = None
    ) -> List[AnnotationList]:
        """Get multiple annotation lists with optional filtering."""
        query = db.query(AnnotationList)
        
        if type_filter:
            # Support filtering by type name (convert to type_id)
            annotation_type = annotation_type_crud.get_by_name(db=db, name=type_filter)
            if annotation_type:
                query = query.filter(AnnotationList.type_id == annotation_type.id)
            else:
                # If type doesn't exist, return empty list
                return []
        
        if created_by:
            query = query.filter(AnnotationList.created_by == created_by)
        
        return query.offset(skip).limit(limit).all()
    
    def get_by_type_id(self, db: Session, type_id: str) -> List[AnnotationList]:
        """Get all annotation lists by type ID."""
        return db.query(AnnotationList).filter(AnnotationList.type_id == type_id).all()
    
    def get_children(self, db: Session, parent_id: str) -> List[AnnotationList]:
        """Get all children of a parent annotation list."""
        return db.query(AnnotationList).filter(AnnotationList.parent_id == parent_id).all()
    
    def delete(self, db: Session, list_id: str) -> bool:
        """Delete annotation list by ID (CASCADE will handle children)."""
        obj = db.query(AnnotationList).filter(AnnotationList.id == list_id).first()
        if obj:
            db.delete(obj)
            db.commit()
            return True
        return False
    
    def delete_by_type(self, db: Session, type_id: str) -> int:
        """Delete all annotation lists by type and the type itself."""
        items = db.query(AnnotationList).filter(AnnotationList.type_id == type_id).all()
        count = len(items)
        for item in items:
            db.delete(item)
        
        # Also delete the annotation type
        annotation_type_crud.delete(db=db, type_id=type_id)
        
        db.commit()
        return count
    
    def create_hierarchical(
        self, 
        db: Session, 
        categories: List[CategoryInput], 
        root_type: str,
        created_by: str,
        parent_id: Optional[str] = None,
        root_metadata: Optional[Dict[str, Any]] = None
    ) -> List[str]:
        """
        Recursively create annotation list records from hierarchical categories.
        
        Args:
            db: Database session
            categories: List of category items (could be nested)
            root_type: The type name (from root title) to apply to all records
            created_by: User ID of the creator
            parent_id: Parent record ID (None for root level)
            root_metadata: Metadata from root (version, copyright, etc.) for first item
        
        Returns:
            List of created record IDs
        """
        created_ids = []
        
        # Get or create the annotation type
        annotation_type = annotation_type_crud.get_or_create(db=db, name=root_type, uploader_id=created_by)
        type_id = annotation_type.id
        
        for idx, category in enumerate(categories):
            # Extract fields for meta
            meta_fields = {}
            
            # Store original ID if exists
            if category.id:
                meta_fields['original_id'] = category.id
            
            # Store mnemonic if exists
            if category.mnemonic:
                meta_fields['mnemonic'] = category.mnemonic
            
            # Store examples if exists
            if category.examples:
                meta_fields['examples'] = category.examples
            
            # Store notes if exists
            if category.notes:
                meta_fields['notes'] = category.notes
            
            # Store parent reference from original JSON if exists
            if category.parent:
                meta_fields['original_parent'] = category.parent
            
            # Add any extra fields that weren't explicitly handled
            category_dict = category.model_dump()
            excluded_fields = {'name', 'description', 'level', 'subcategories', 
                             'id', 'mnemonic', 'examples', 'notes', 'parent'}
            for key, value in category_dict.items():
                if key not in excluded_fields and value is not None:
                    meta_fields[key] = value
            
            # Add root metadata to first root item only
            if parent_id is None and idx == 0 and root_metadata:
                meta_fields.update(root_metadata)
            
            # Create the record
            record_id = category.id or str(uuid.uuid4())
            db_obj = AnnotationList(
                id=record_id,
                type_id=type_id,
                title=category.name,
                level=str(category.level) if category.level is not None else None,
                parent_id=parent_id,
                description=category.description,
                created_by=created_by,
                meta=meta_fields if meta_fields else None
            )
            db.add(db_obj)
            created_ids.append(record_id)
            
            # Recursively process subcategories if they exist
            if category.subcategories:
                child_ids = self.create_hierarchical(
                    db=db,
                    categories=category.subcategories,
                    root_type=root_type,
                    created_by=created_by,
                    parent_id=record_id,
                    root_metadata=None  # Only pass to first root
                )
                created_ids.extend(child_ids)
        
        return created_ids
    
    def reconstruct_hierarchy(self, items: List[AnnotationList]) -> HierarchicalJSONOutput:
        """
        Reconstruct hierarchical JSON structure from flat database records.
        
        Args:
            items: List of AnnotationList records (all from same type)
        
        Returns:
            HierarchicalJSONOutput with reconstructed hierarchy
        """
        if not items:
            raise ValueError("Cannot reconstruct hierarchy from empty list")
        
        # Extract root-level metadata from first item or items' meta
        # Get the type name from the annotation_type relationship
        root_type = items[0].annotation_type.name if items[0].annotation_type else "Unknown"
        
        # Build a lookup dictionary for quick parent-child relationships
        items_by_id = {item.id: item for item in items}
        
        # Separate root items (no parent) from children
        root_items = [item for item in items if item.parent_id is None]
        
        # Extract version, description, copyright from meta if available
        # Look for items that might have root-level metadata
        version = None
        description = None
        copyright = None
        
        # Try to get root metadata from the first root item's meta
        if root_items and root_items[0].meta:
            meta = root_items[0].meta
            version = meta.get('version')
            copyright = meta.get('copyright')
            root_description = meta.get('root_description')
        else:
            root_description = None
        
        def build_category(item: AnnotationList) -> CategoryOutput:
            """Recursively build category with subcategories."""
            # Extract fields from meta
            meta = item.meta or {}
            
            # Get children of this item
            children = [child for child in items if child.parent_id == item.id]
            
            # Build subcategories recursively
            subcategories = None
            if children:
                # Sort by level to maintain order
                children.sort(key=lambda x: (x.level or "0", x.created_at))
                subcategories = [build_category(child) for child in children]
            
            # Build category output
            id = meta.get('original_id') or item.id
            category_data = {
                'id': id,
                'name': item.title,
                'description': item.description,
                'level': int(item.level) if item.level and item.level.isdigit() else None,
                'parent': meta.get('original_parent'),
                'mnemonic': meta.get('mnemonic'),
                'examples': meta.get('examples'),
                'notes': meta.get('notes'),
                'subcategories': subcategories
            }
            
            # Add any extra fields from meta
            for key, value in meta.items():
                if key not in ['original_id', 'original_parent', 'mnemonic', 'examples', 'notes', 'version', 'copyright', 'root_description']:
                    category_data[key] = value
            
            # Remove None values for cleaner output
            category_data = {k: v for k, v in category_data.items() if v is not None}
            
            return CategoryOutput(**category_data)
        
        # Build categories from root items
        root_items.sort(key=lambda x: (x.level or "0", x.created_at))
        categories = [build_category(item) for item in root_items]
        
        # Build final output
        output_data = {
            'title': root_type,
            'categories': categories
        }
        
        # Add optional fields if available
        if version:
            output_data['version'] = version
        if root_description:
            output_data['description'] = root_description
        if copyright:
            output_data['copyright'] = copyright
        
        return HierarchicalJSONOutput(**output_data)


annotation_list_crud = AnnotationListCRUD()

