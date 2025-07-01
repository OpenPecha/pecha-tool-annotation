from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from deps import get_db
from auth import get_current_active_user, require_admin, get_auth0_debug_info
from crud.user import user_crud
from schemas.user import UserCreate, UserUpdate, UserResponse
from models.user import User, UserRole
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os

router = APIRouter(prefix="/users", tags=["Users"])
security = HTTPBearer()


@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_active_user)):
    """Get current user info."""
    return current_user


@router.put("/me", response_model=UserResponse)
def update_users_me(
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update current user info."""
    # Users can't change their own role or active status
    if user_in.role is not None:
        user_in.role = None
    if user_in.is_active is not None:
        user_in.is_active = None
    
    # Check if username/email is already taken by another user
    if user_in.username and user_crud.is_username_taken(db, user_in.username, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    if user_in.email and user_crud.is_email_taken(db, user_in.email, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already taken"
        )
    
    return user_crud.update(db=db, db_obj=current_user, obj_in=user_in)


@router.get("/debug/auth0", include_in_schema=False)
def debug_auth0_integration(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Debug Auth0 integration (Development only)."""
    # Only allow in development mode
    if not os.getenv("DEBUG", "false").lower() == "true":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Endpoint not available in production"
        )
    
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing"
        )
    
    access_token = credentials.credentials
    debug_info = get_auth0_debug_info(access_token)
    
    return {
        "message": "Auth0 Debug Information",
        "debug_info": debug_info,
        "note": "This endpoint is only available in development mode"
    }


@router.get("/", response_model=List[UserResponse])
def read_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    is_active: Optional[bool] = Query(None),
    role: Optional[UserRole] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get users list (Admin only)."""
    users = user_crud.get_multi(
        db=db, 
        skip=skip, 
        limit=limit, 
        is_active=is_active, 
        role=role
    )
    return users


@router.get("/{user_id}", response_model=UserResponse)
def read_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get user by ID (Admin only)."""
    user = user_crud.get(db=db, user_id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Update user (Admin only)."""
    user = user_crud.get(db=db, user_id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if username/email is already taken by another user
    if user_in.username and user_crud.is_username_taken(db, user_in.username, user_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    if user_in.email and user_crud.is_email_taken(db, user_in.email, user_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already taken"
        )
    
    return user_crud.update(db=db, db_obj=user, obj_in=user_in)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Delete user (Admin only)."""
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete yourself"
        )
    
    user = user_crud.get(db=db, user_id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user_crud.delete(db=db, user_id=user_id)


@router.get("/search/", response_model=List[UserResponse])
def search_users(
    q: str = Query(..., min_length=1),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Search users (Admin only)."""
    users = user_crud.search(db=db, query=q, skip=skip, limit=limit)
    return users 