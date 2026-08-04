from fastapi import APIRouter, Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.models.database import get_db
from app.models.user import User
from app.models.schemas import UserCreate, UserLogin, Token, UserResponse, MessageResponse
from app.core.security import (
    get_password_hash, 
    verify_password, 
    create_access_token,
    get_current_user,
    verify_token
)

router = APIRouter()


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user.
    
    Args:
        user_data: User registration data (email, username, password, full_name)
        db: Database session
        
    Returns:
        Token: JWT access token and user information
        
    Raises:
        HTTPException: If email or username already exists
    """
    # Check if user with email already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if username already exists
    existing_username = db.query(User).filter(User.username == user_data.username).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    # Create new user
    new_user = User(
        email=user_data.email,
        username=user_data.username,
        full_name=user_data.full_name,
        hashed_password=get_password_hash(user_data.password),
        is_active=True
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create access token
    access_token = create_access_token(
        data={"sub": str(new_user.id), "email": new_user.email}
    )
    
    return Token(
        access_token=access_token,
        user=UserResponse.from_orm(new_user)
    )


@router.post("/login", response_model=Token)
async def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """
    Authenticate user and return JWT token.
    
    Args:
        user_data: User login data (username, password)
        db: Database session
        
    Returns:
        Token: JWT access token and user information
        
    Raises:
        HTTPException: If credentials are invalid
    """
    # Find user by username
    user = db.query(User).filter(User.username == user_data.username).first()
    
    # Verify user exists and password is correct
    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )
    
    # Create access token
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email}
    )
    
    return Token(
        access_token=access_token,
        user=UserResponse.from_orm(user)
    )


@router.post("/login/oauth2", response_model=Token)
async def login_oauth2(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    OAuth2 compatible login endpoint for use with OAuth2PasswordBearer.
    
    Args:
        form_data: OAuth2 form data (username, password)
        db: Database session
        
    Returns:
        Token: JWT access token and user information
    """
    # Find user by username
    user = db.query(User).filter(User.username == form_data.username).first()
    
    # Verify user exists and password is correct
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )
    
    # Create access token
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email}
    )
    
    return Token(
        access_token=access_token,
        user=UserResponse.from_orm(user)
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    authorization: str = Header(...),
    db: Session = Depends(get_db)
):
    """
    Get current user information.
    
    Args:
        authorization: Authorization header with Bearer token
        db: Database session
        
    Returns:
        UserResponse: Current user information
    """
    # Extract token from Authorization header
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format"
        )
    
    token = authorization.split(" ")[1]
    payload = verify_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
    
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )
    
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse.from_orm(user)
