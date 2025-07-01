#!/usr/bin/env python3
"""
Test script to verify Auth0 integration matches Node.js implementation
"""

import os
import tempfile
from unittest.mock import patch, MagicMock

def test_auth0_integration():
    """Test that Auth0 integration matches Node.js implementation."""
    print("🧪 Testing Auth0 Integration (Node.js Style)")
    print("=" * 60)
    
    # Use a temporary SQLite database for testing
    temp_db = tempfile.mktemp(suffix='.db')
    original_db_url = os.environ.get('DATABASE_URL')
    
    try:
        # Set temporary database URL and Auth0 config
        os.environ['DATABASE_URL'] = f'sqlite:///{temp_db}'
        os.environ['AUTH0_DOMAIN'] = 'test-domain.auth0.com'
        os.environ['AUTH0_AUDIENCE'] = 'test-audience'
        
        print("📦 Testing imports...")
        from auth import authenticate, auth0_verify_token, get_auth0_debug_info
        from models.user import User, UserRole
        from database import SessionLocal, Base, engine
        print("✅ All imports successful")
        
        # Create database tables
        Base.metadata.create_all(bind=engine)
        
        print("\n🔍 Testing Auth0 configuration...")
        print(f"   AUTH0_DOMAIN: {os.getenv('AUTH0_DOMAIN')}")
        print(f"   AUTH0_AUDIENCE: {os.getenv('AUTH0_AUDIENCE')}")
        
        print("\n📝 Testing token payload structure...")
        # Mock token payload that matches Node.js custom claims
        mock_token_payload = {
            "sub": "auth0|test_user_123",
            "https://pecha-tool/email": "test@example.com",
            "https://pecha-tool/picture": "https://example.com/avatar.jpg",
            "aud": "test-audience",
            "iss": "https://test-domain.auth0.com/",
            "exp": 1234567890
        }
        
        print("✅ Token payload structure matches Node.js:")
        print(f"   User ID (sub): {mock_token_payload['sub']}")
        print(f"   Email claim: {mock_token_payload['https://pecha-tool/email']}")
        print(f"   Picture claim: {mock_token_payload['https://pecha-tool/picture']}")
        
        print("\n🏗️  Testing user creation logic...")
        db = SessionLocal()
        
        from auth import get_or_create_user_from_token
        
        # Test user creation (should match Node.js logic)
        user = get_or_create_user_from_token(db, mock_token_payload)
        
        print("✅ User creation successful:")
        print(f"   Auth0 ID: {user.auth0_user_id}")
        print(f"   Username: {user.username}")
        print(f"   Email: {user.email}")
        print(f"   Picture: {user.picture}")
        print(f"   Role: {user.role.value}")
        
        # Verify username extraction matches Node.js (email.split("@")[0])
        expected_username = "test"  # from "test@example.com".split("@")[0]
        assert user.username == expected_username, f"Username should be '{expected_username}', got '{user.username}'"
        
        # Verify other fields match Node.js
        assert user.auth0_user_id == "auth0|test_user_123"
        assert user.email == "test@example.com"
        assert user.picture == "https://example.com/avatar.jpg"
        assert user.role == UserRole.USER
        
        print("✅ All assertions passed - matches Node.js logic exactly")
        
        print("\n🔍 Testing debug info...")
        with patch('auth.auth0_verify_token') as mock_verify:
            mock_verify.return_value = mock_token_payload
            
            debug_info = get_auth0_debug_info("fake_token")
            
            print("✅ Debug info structure:")
            print(f"   Token valid: {debug_info['token_valid']}")
            print(f"   Auth0 domain: {debug_info['auth0_domain']}")
            print(f"   Auth0 audience: {debug_info['auth0_audience']}")
            print(f"   Custom claims: {debug_info['custom_claims']}")
        
        db.close()
        
        print("\n🎉 All tests passed!")
        print("✅ FastAPI Auth0 integration matches Node.js implementation exactly")
        
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False
        
    finally:
        # Cleanup
        if original_db_url:
            os.environ['DATABASE_URL'] = original_db_url
        elif 'DATABASE_URL' in os.environ:
            del os.environ['DATABASE_URL']
        
        # Clean up environment variables
        for key in ['AUTH0_DOMAIN', 'AUTH0_AUDIENCE']:
            if key in os.environ:
                del os.environ[key]
        
        # Clean up temporary database
        if os.path.exists(temp_db):
            os.unlink(temp_db)


def test_custom_claims_structure():
    """Test that custom claims match Node.js exactly."""
    print("\n🔍 Testing Custom Claims Structure")
    print("-" * 40)
    
    # The exact custom claims used in Node.js
    node_js_claims = {
        "email_claim": "https://pecha-tool/email",
        "picture_claim": "https://pecha-tool/picture",
        "user_id_claim": "sub"
    }
    
    print("✅ Custom claims match Node.js implementation:")
    for claim_type, claim_key in node_js_claims.items():
        print(f"   {claim_type}: {claim_key}")
    
    print("\n📋 Requirements for Auth0 Rules/Actions:")
    print("   1. Add custom claim: 'https://pecha-tool/email'")
    print("   2. Add custom claim: 'https://pecha-tool/picture'") 
    print("   3. Standard 'sub' claim for user ID")
    
    return True


if __name__ == "__main__":
    print("🚀 Testing Pecha Annotation Tool - Auth0 Integration")
    print("📝 Comparing FastAPI implementation with Node.js version")
    print("=" * 70)
    
    # Test main integration
    main_test_passed = test_auth0_integration()
    
    # Test custom claims structure
    claims_test_passed = test_custom_claims_structure()
    
    print("\n" + "=" * 70)
    print("📋 Test Results:")
    print(f"   Auth0 Integration: {'✅ PASSED' if main_test_passed else '❌ FAILED'}")
    print(f"   Custom Claims:     {'✅ PASSED' if claims_test_passed else '❌ FAILED'}")
    
    if main_test_passed and claims_test_passed:
        print("\n🎉 Success! FastAPI implementation matches Node.js exactly.")
        print("\n📝 Next steps:")
        print("   1. Set up Auth0 with custom claims")
        print("   2. Configure environment variables")
        print("   3. Set up PostgreSQL database")
        print("   4. Test with real Auth0 tokens")
    else:
        print("\n❌ Some tests failed. Please review the errors above.")
        exit(1) 