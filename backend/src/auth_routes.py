from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
from models import User, Student, Faculty, Admin, UserRole
from database import get_db
from schemas import UserLogin, Token, UserResponse, StudentCreate, FacultyCreate, AdminCreate, StudentProfileResponse, FacultyProfileResponse, AdminProfileResponse
from auth import authenticate_user, create_access_token, get_password_hash
from dependencies import get_current_active_user
from config import settings
from sqlalchemy import func
import secrets
import string
from pydantic import BaseModel

# Password reset request models
class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

router = APIRouter(prefix="/api/auth", tags=["authentication"])

@router.post("/login", response_model=Token)
def login(user_credentials: UserLogin, db: Session = Depends(get_db)):
    """Authenticate user and return access token."""
    user = authenticate_user(user_credentials.email, user_credentials.password, db)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    # Update last login
    user.last_login = func.now()
    db.commit()
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse.from_orm(user)
    }

@router.post("/register/student", response_model=StudentProfileResponse)
def register_student(student_data: StudentCreate, db: Session = Depends(get_db)):
    """Register a new student."""
    # Check if user already exists
    db_user = db.query(User).filter(User.email == student_data.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check enrollment number
    existing_student = db.query(Student).filter(Student.enrollment_number == student_data.enrollment_number).first()
    if existing_student:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Enrollment number already exists"
        )
    
    try:
        # Create user account
        hashed_password = get_password_hash(student_data.password)
        user = User(
            email=student_data.email,
            password_hash=hashed_password,
            role=UserRole.STUDENT
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Create student record
        student = Student(
            user_id=user.id,
            enrollment_number=student_data.enrollment_number,
            first_name=student_data.first_name,
            last_name=student_data.last_name,
            phone=student_data.phone,
            date_of_birth=student_data.date_of_birth,
            gender=student_data.gender,
            blood_group=student_data.blood_group,
            address=student_data.address,
            city=student_data.city,
            state=student_data.state,
            pincode=student_data.pincode,
            department_id=student_data.department_id,
            semester=student_data.semester,
            batch=student_data.batch,
            admission_year=student_data.admission_year
        )
        db.add(student)
        db.commit()
        db.refresh(student)
        
        # Load relationships for response
        db.refresh(user)
        db.refresh(student)
        
        return StudentProfileResponse(
            **student.__dict__,
            user=UserResponse.from_orm(user)
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating student: {str(e)}"
        )

@router.post("/register/faculty", response_model=FacultyProfileResponse)
def register_faculty(faculty_data: FacultyCreate, db: Session = Depends(get_db)):
    """Register a new faculty."""
    # Check if user already exists
    db_user = db.query(User).filter(User.email == faculty_data.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check employee ID
    existing_faculty = db.query(Faculty).filter(Faculty.employee_id == faculty_data.employee_id).first()
    if existing_faculty:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Employee ID already exists"
        )
    
    try:
        # Create user account
        hashed_password = get_password_hash(faculty_data.password)
        user = User(
            email=faculty_data.email,
            password_hash=hashed_password,
            role=UserRole.FACULTY
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Create faculty record
        faculty = Faculty(
            user_id=user.id,
            employee_id=faculty_data.employee_id,
            first_name=faculty_data.first_name,
            last_name=faculty_data.last_name,
            phone=faculty_data.phone,
            email=faculty_data.email,
            specialization=faculty_data.specialization,
            designation=faculty_data.designation,
            department_id=faculty_data.department_id,
            can_verify_documents=faculty_data.can_verify_documents,
            can_assign_tasks=faculty_data.can_assign_tasks
        )
        db.add(faculty)
        db.commit()
        db.refresh(faculty)
        
        # Load relationships for response
        db.refresh(user)
        db.refresh(faculty)
        
        return FacultyProfileResponse(
            **faculty.__dict__,
            user=UserResponse.from_orm(user)
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating faculty: {str(e)}"
        )

@router.post("/register/admin", response_model=AdminProfileResponse)
def register_admin(admin_data: AdminCreate, db: Session = Depends(get_db)):
    """Register a new admin."""
    # Check if user already exists
    db_user = db.query(User).filter(User.email == admin_data.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    try:
        # Create user account
        hashed_password = get_password_hash(admin_data.password)
        user = User(
            email=admin_data.email,
            password_hash=hashed_password,
            role=UserRole.ADMIN
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Create admin record
        admin = Admin(
            user_id=user.id,
            first_name=admin_data.first_name,
            last_name=admin_data.last_name,
            phone=admin_data.phone,
            department_id=admin_data.department_id,
            permissions=admin_data.permissions
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        
        # Load relationships for response
        db.refresh(user)
        db.refresh(admin)
        
        return AdminProfileResponse(
            **admin.__dict__,
            user=UserResponse.from_orm(user)
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating admin: {str(e)}"
        )

@router.get("/me", response_model=dict)
def get_current_user_info(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    """Get current user information with role-specific details."""
    user_data = UserResponse.from_orm(current_user)

# Password reset functionality
# In-memory storage for reset tokens (in production, use database with expiration)
password_reset_tokens = {}

@router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Initiate password reset by sending a reset token."""
    user = db.query(User).filter(User.email == request.email).first()
    
    if not user:
        # Don't reveal if email exists for security
        return {"message": "If the email exists, a reset link has been sent"}
    
    # Generate reset token
    reset_token = secrets.token_urlsafe(32)
    expiry_time = datetime.utcnow() + timedelta(hours=1)  # Token valid for 1 hour
    
    # Store token (in production, store in database)
    password_reset_tokens[reset_token] = {
        "user_id": user.id,
        "email": request.email,
        "expires_at": expiry_time
    }
    
    # In production, send email with reset link
    # For now, return the token for testing
    return {
        "message": "Password reset link generated",
        "reset_token": reset_token,  # Remove this in production
        "expires_in": "1 hour"
    }

@router.post("/reset-password")
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Reset password using valid reset token."""
    # Check if token exists and is valid
    if request.token not in password_reset_tokens:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    token_data = password_reset_tokens[request.token]
    
    # Check if token has expired
    if datetime.utcnow() > token_data["expires_at"]:
        del password_reset_tokens[request.token]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token has expired"
        )
    
    # Get user
    user = db.query(User).filter(User.id == token_data["user_id"]).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update password
    user.password_hash = get_password_hash(request.new_password)
    db.commit()
    
    # Remove used token
    del password_reset_tokens[request.token]
    
    return {"message": "Password reset successfully"}

@router.get("/verify-reset-token/{token}")
def verify_reset_token(token: str):
    """Verify if a reset token is valid."""
    if token not in password_reset_tokens:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reset token"
        )
    
    token_data = password_reset_tokens[token]
    
    # Check if token has expired
    if datetime.utcnow() > token_data["expires_at"]:
        del password_reset_tokens[token]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token has expired"
        )
    
    return {"valid": True, "email": token_data["email"]}
    
    # Get role-specific information
    if current_user.role == UserRole.STUDENT:
        student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if student:
            return {
                "user": user_data,
                "role": "student",
                "profile": StudentProfileResponse(
                    **student.__dict__,
                    user=user_data
                )
            }
    
    elif current_user.role == UserRole.FACULTY:
        faculty = db.query(Faculty).filter(Faculty.user_id == current_user.id).first()
        if faculty:
            return {
                "user": user_data,
                "role": "faculty",
                "profile": FacultyProfileResponse(
                    **faculty.__dict__,
                    user=user_data
                )
            }
    
    elif current_user.role == UserRole.ADMIN:
        admin = db.query(Admin).filter(Admin.user_id == current_user.id).first()
        if admin:
            return {
                "user": user_data,
                "role": "admin",
                "profile": AdminProfileResponse(
                    **admin.__dict__,
                    user=user_data
                )
            }
    
    return {
        "user": user_data,
        "role": current_user.role.value,
        "profile": None
    }

@router.post("/logout")
def logout(current_user: User = Depends(get_current_active_user)):
    """Logout user (client-side token removal)."""
    return {"message": "Successfully logged out"}
