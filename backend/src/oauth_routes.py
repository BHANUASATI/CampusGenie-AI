"""
OAuth Routes for Microsoft Azure AD Integration
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from datetime import timedelta
import secrets
from typing import Optional

from models import User, Student, Faculty, Admin, UserRole
from database import get_db
from schemas import Token, UserResponse
from auth import create_access_token
from dependencies import get_current_active_user
from config import settings
from oauth_service import oauth_service

router = APIRouter(prefix="/api/oauth", tags=["oauth"])

# Store OAuth state tokens temporarily (in production, use Redis)
oauth_states = {}

@router.get("/microsoft/login")
def microsoft_login():
    """Generate Microsoft OAuth login URL"""
    if not settings.AZURE_CLIENT_ID or not settings.AZURE_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Microsoft OAuth not configured. Please set AZURE_CLIENT_ID and AZURE_CLIENT_SECRET environment variables."
        )
    
    # Generate state parameter for CSRF protection
    state = secrets.token_urlsafe(32)
    oauth_states[state] = True
    
    auth_url = oauth_service.get_auth_url(state=state)
    
    return {
        "auth_url": auth_url,
        "state": state
    }

@router.get("/microsoft/callback")
async def microsoft_callback(code: str, state: Optional[str] = None, db: Session = Depends(get_db)):
    """Handle Microsoft OAuth callback"""
    # Verify state parameter
    if state and state not in oauth_states:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid state parameter"
        )
    
    # Clean up state
    if state in oauth_states:
        del oauth_states[state]
    
    # Exchange code for token
    token_result = oauth_service.get_token_from_code(code)
    if not token_result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to acquire access token"
        )
    
    access_token = token_result.get("access_token")
    
    # Get user information
    user_info = oauth_service.get_user_info(access_token)
    if not user_info:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to fetch user information"
        )
    
    # Extract user details
    email = user_info.get("mail") or user_info.get("userPrincipalName")
    first_name = user_info.get("givenName", "")
    last_name = user_info.get("surname", "")
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not retrieve email from Microsoft account"
        )
    
    # Check if user exists
    existing_user = db.query(User).filter(User.email == email).first()
    
    if existing_user:
        # User exists, update last login and create token
        from sqlalchemy import func
        existing_user.last_login = func.now()
        db.commit()
        
        # Create access token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        jwt_token = create_access_token(
            data={"sub": existing_user.email}, expires_delta=access_token_expires
        )
        
        return {
            "access_token": jwt_token,
            "token_type": "bearer",
            "user": UserResponse.from_orm(existing_user),
            "is_new_user": False
        }
    else:
        # New user - create account
        # Validate university email domain
        if not email.endswith(f"@{settings.UNIVERSITY_EMAIL_DOMAIN}"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Email must be from {settings.UNIVERSITY_EMAIL_DOMAIN} domain. Your email: {email}"
            )
        
        # Create new user with temporary password (OAuth users don't need it)
        import uuid
        temp_password = str(uuid.uuid4())
        from auth import get_password_hash
        hashed_password = get_password_hash(temp_password)
        
        new_user = User(
            email=email,
            password_hash=hashed_password,
            first_name=first_name,
            last_name=last_name,
            role=UserRole.STUDENT,  # Default role, can be changed by admin
            is_active=True,
            email_verified=True
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        # Create access token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        jwt_token = create_access_token(
            data={"sub": new_user.email}, expires_delta=access_token_expires
        )
        
        return {
            "access_token": jwt_token,
            "token_type": "bearer",
            "user": UserResponse.from_orm(new_user),
            "is_new_user": True,
            "message": "Account created successfully. Please complete your profile."
        }

@router.get("/microsoft/user-info")
def get_microsoft_user_info(access_token: str):
    """Get Microsoft user information (for profile completion)"""
    user_info = oauth_service.get_user_info(access_token)
    if user_info:
        return {
            "email": user_info.get("mail") or user_info.get("userPrincipalName"),
            "first_name": user_info.get("givenName", ""),
            "last_name": user_info.get("surname", ""),
            "display_name": user_info.get("displayName", ""),
            "job_title": user_info.get("jobTitle", ""),
            "office_location": user_info.get("officeLocation", "")
        }
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to fetch user information"
        )