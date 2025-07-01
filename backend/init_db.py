#!/usr/bin/env python3
"""
Database initialization script for Pecha Annotation Tool
Creates sample data for testing with Auth0 authentication
"""

import sys
from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models import User, Text, Annotation
from models.user import UserRole
from models.text import TextStatus
from database import Base


def create_sample_users(db: Session):
    """Create sample users for different roles (Auth0 users)."""
    users_data = [
        {
            "auth0_user_id": "auth0|admin_user_id",
            "username": "admin",
            "email": "admin@example.com",
            "full_name": "System Administrator",
            "role": UserRole.ADMIN
        },
        {
            "auth0_user_id": "auth0|annotator_user_id",
            "username": "annotator1",
            "email": "annotator1@example.com", 
            "full_name": "Jane Annotator",
            "role": UserRole.ANNOTATOR
        },
        {
            "auth0_user_id": "auth0|reviewer_user_id",
            "username": "reviewer1",
            "email": "reviewer1@example.com",
            "full_name": "John Reviewer",
            "role": UserRole.REVIEWER
        },
        {
            "auth0_user_id": "auth0|regular_user_id",
            "username": "user1",
            "email": "user1@example.com",
            "full_name": "Regular User",
            "role": UserRole.USER
        }
    ]
    
    created_users = []
    for user_data in users_data:
        existing_user = db.query(User).filter(User.auth0_user_id == user_data["auth0_user_id"]).first()
        if not existing_user:
            user = User(
                auth0_user_id=user_data["auth0_user_id"],
                username=user_data["username"],
                email=user_data["email"],
                full_name=user_data["full_name"],
                role=user_data["role"],
                is_active=True
            )
            db.add(user)
            created_users.append(user)
            print(f"✅ Created {user_data['role'].value} user: {user_data['username']}")
        else:
            created_users.append(existing_user)
            print(f"ℹ️  User {user_data['username']} already exists")
    
    return created_users


def create_sample_texts(db: Session):
    """Create sample texts for annotation."""
    texts_data = [
        {
            "title": "Sample Tibetan Text 1",
            "content": "ཨོཾ་མ་ཎི་པདྨེ་ཧཱུྃ། སེམས་ཅན་ཐམས་ཅད་བདེ་བ་དང་བདེ་བའི་རྒྱུ་དང་ལྡན་པར་གྱུར་ཅིག། སེམས་ཅན་ཐམས་ཅད་སྡུག་བསྔལ་དང་སྡུག་བསྔལ་གྱི་རྒྱུ་དང་བྲལ་བར་གྱུར་ཅིག།",
            "source": "Buddhist Prayer",
            "language": "bo"
        },
        {
            "title": "English Text Sample",
            "content": "This is a sample English text for annotation testing. It contains multiple sentences that can be annotated with different types of labels. Annotators can mark entities, sentiments, or other linguistic features in this text.",
            "source": "Test Document",
            "language": "en"
        },
        {
            "title": "Mixed Language Text",
            "content": "This text contains both English and Tibetan: ཐུགས་རྗེ་ཆེ། means 'thank you' in Tibetan. Such mixed texts are common in modern Tibetan literature and require careful annotation to distinguish between languages and their respective linguistic features.",
            "source": "Multilingual Document",
            "language": "mixed"
        }
    ]
    
    created_texts = []
    for text_data in texts_data:
        existing_text = db.query(Text).filter(Text.title == text_data["title"]).first()
        if not existing_text:
            text = Text(
                title=text_data["title"],
                content=text_data["content"],
                source=text_data["source"],
                language=text_data["language"],
                status=TextStatus.INITIALIZED
            )
            db.add(text)
            created_texts.append(text)
            print(f"✅ Created text: {text_data['title']}")
        else:
            created_texts.append(existing_text)
            print(f"ℹ️  Text '{text_data['title']}' already exists")
    
    return created_texts


def create_sample_annotations(db: Session, users: list, texts: list):
    """Create sample annotations."""
    # Find annotator user
    annotator = next((u for u in users if u.role == UserRole.ANNOTATOR), None)
    if not annotator or not texts:
        print("⚠️  Skipping annotations - no annotator user or texts available")
        return []
    
    annotations_data = [
        {
            "text_id": texts[0].id,
            "annotation_type": "entity",
            "start_position": 0,
            "end_position": 13,
            "label": "mantra",
            "meta": {"entity_type": "religious_text", "confidence": 95}
        },
        {
            "text_id": texts[1].id,
            "annotation_type": "sentiment",
            "start_position": 45,
            "end_position": 71,
            "label": "positive",
            "meta": {"sentiment_score": 0.8, "confidence": 90}
        }
    ]
    
    created_annotations = []
    for ann_data in annotations_data:
        text = db.query(Text).filter(Text.id == ann_data["text_id"]).first()
        if text:
            # Extract selected text
            selected_text = text.content[ann_data["start_position"]:ann_data["end_position"]]
            
            annotation = Annotation(
                text_id=ann_data["text_id"],
                annotator_id=annotator.id,
                annotation_type=ann_data["annotation_type"],
                start_position=ann_data["start_position"],
                end_position=ann_data["end_position"],
                selected_text=selected_text,
                label=ann_data["label"],
                meta=ann_data["meta"]
            )
            db.add(annotation)
            created_annotations.append(annotation)
            
            # Update text status to annotated
            text.status = TextStatus.ANNOTATED
            db.add(text)
            
            print(f"✅ Created {ann_data['annotation_type']} annotation for text {ann_data['text_id']}")
    
    return created_annotations


def init_database():
    """Initialize database with sample data."""
    print("🚀 Initializing Pecha Annotation Tool Database (Auth0 Version)...")
    
    # Create all tables
    print("📊 Creating database tables...")
    Base.metadata.create_all(bind=engine)
    
    # Create database session
    db = SessionLocal()
    
    try:
        # Create users
        print("\n👥 Creating sample users...")
        users = create_sample_users(db)
        
        # Create texts
        print("\n📝 Creating sample texts...")
        texts = create_sample_texts(db)
        
        # Create annotations
        print("\n🏷️  Creating sample annotations...")
        annotations = create_sample_annotations(db, users, texts)
        
        # Commit all changes
        db.commit()
        
        print("\n✅ Database initialization completed successfully!")
        print("\n📋 Summary:")
        print(f"   - Users created: {len(users)}")
        print(f"   - Texts created: {len(texts)}")
        print(f"   - Annotations created: {len(annotations)}")
        
        print("\n🔐 Auth0 Integration Notes:")
        print("   - Users are created with sample Auth0 user IDs")
        print("   - Authentication will be handled by Auth0")
        print("   - Update user Auth0 IDs after setting up Auth0")
        print("   - Sample Auth0 user IDs:")
        for user in users:
            print(f"     {user.username}: {user.auth0_user_id}")
        
    except Exception as e:
        print(f"❌ Error during initialization: {e}")
        db.rollback()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    init_database() 