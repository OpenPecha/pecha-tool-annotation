#!/usr/bin/env python3
"""
Test script to verify that the FastAPI application is working correctly
"""

import os
import tempfile
from pathlib import Path

def test_application():
    """Test that the FastAPI application can be initialized successfully."""
    print("🧪 Testing FastAPI Application...")
    
    # Use a temporary SQLite database for testing
    temp_db = tempfile.mktemp(suffix='.db')
    original_db_url = os.environ.get('DATABASE_URL')
    
    try:
        # Set temporary database URL
        os.environ['DATABASE_URL'] = f'sqlite:///{temp_db}'
        
        print("📦 Testing schema imports...")
        from schemas import (
            UserCreate, UserUpdate, UserResponse, UserInfo,
            TextCreate, TextUpdate, TextResponse, TextWithAnnotations,
            AnnotationCreate, AnnotationUpdate, AnnotationResponse
        )
        print("✅ All schemas imported successfully")
        
        print("📦 Testing model imports...")
        from models import User, Text, Annotation
        print("✅ All models imported successfully")
        
        print("📦 Testing CRUD imports...")
        from crud import user_crud
        from crud.text import text_crud
        from crud.annotation import annotation_crud
        print("✅ All CRUD modules imported successfully")
        
        print("📦 Testing router imports...")
        from routers import users, texts, annotations
        print("✅ All routers imported successfully")
        
        print("📦 Testing auth imports...")
        from auth import get_current_user, require_admin
        print("✅ Auth module imported successfully")
        
        print("🚀 Testing FastAPI app initialization...")
        from main import app
        print("✅ FastAPI app initialized successfully")
        
        print("📝 Testing schema relationships...")
        # Test that TextWithAnnotations can be instantiated
        test_text = TextWithAnnotations(
            id=1,
            title="Test Text",
            content="Test content",
            language="en",
            status="initialized",
            created_at="2024-01-01T00:00:00",
            annotations=[]
        )
        print("✅ TextWithAnnotations schema works correctly")
        
        print("\n🎉 All tests passed!")
        print("✅ The Pydantic schema errors have been resolved")
        print("✅ FastAPI application is ready to run")
        
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False
        
    finally:
        # Restore original database URL
        if original_db_url:
            os.environ['DATABASE_URL'] = original_db_url
        elif 'DATABASE_URL' in os.environ:
            del os.environ['DATABASE_URL']
        
        # Clean up temporary database
        if os.path.exists(temp_db):
            os.unlink(temp_db)


def test_openapi_schema():
    """Test that OpenAPI schema can be generated without errors."""
    print("\n🔍 Testing OpenAPI schema generation...")
    
    temp_db = tempfile.mktemp(suffix='.db')
    original_db_url = os.environ.get('DATABASE_URL')
    
    try:
        os.environ['DATABASE_URL'] = f'sqlite:///{temp_db}'
        
        from main import app
        
        # Try to generate OpenAPI schema
        openapi_schema = app.openapi()
        
        if openapi_schema and 'paths' in openapi_schema:
            print("✅ OpenAPI schema generated successfully")
            print(f"📊 Found {len(openapi_schema['paths'])} API endpoints")
            return True
        else:
            print("❌ OpenAPI schema generation failed")
            return False
            
    except Exception as e:
        print(f"❌ OpenAPI schema test failed: {e}")
        return False
        
    finally:
        # Restore original database URL
        if original_db_url:
            os.environ['DATABASE_URL'] = original_db_url
        elif 'DATABASE_URL' in os.environ:
            del os.environ['DATABASE_URL']
        
        # Clean up temporary database
        if os.path.exists(temp_db):
            os.unlink(temp_db)


if __name__ == "__main__":
    print("🚀 Testing Pecha Annotation Tool Backend")
    print("=" * 50)
    
    # Test basic application functionality
    app_test_passed = test_application()
    
    # Test OpenAPI schema generation (this was failing before)
    openapi_test_passed = test_openapi_schema()
    
    print("\n" + "=" * 50)
    print("📋 Test Results:")
    print(f"   Application Tests: {'✅ PASSED' if app_test_passed else '❌ FAILED'}")
    print(f"   OpenAPI Schema:    {'✅ PASSED' if openapi_test_passed else '❌ FAILED'}")
    
    if app_test_passed and openapi_test_passed:
        print("\n🎉 All tests passed! Your backend is ready for Auth0 integration.")
        print("\n📝 Next steps:")
        print("   1. Set up PostgreSQL database")
        print("   2. Configure Auth0 credentials in .env")
        print("   3. Run: python init_db.py")
        print("   4. Run: python main.py")
        print("   5. Test Auth0 integration")
    else:
        print("\n❌ Some tests failed. Please review the errors above.")
        exit(1) 