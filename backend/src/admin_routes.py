from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from models import User, Student, Faculty, Admin, Department, StudentDocument, Task, TaskSubmission
from database import get_db
from schemas import DashboardStats
from config import is_accepted_email, accepted_domain_error
from dependencies import get_current_active_user, get_current_admin
from typing import List
from datetime import datetime
from pydantic import BaseModel
import re
from security import get_password_hash

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/dashboard/stats", response_model=DashboardStats)
def get_admin_dashboard_stats(
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get dashboard statistics for admin."""
    total_students = db.query(Student).count()
    verified_students = db.query(Student).filter(Student.documents_verified == True).count()
    pending_documents = db.query(StudentDocument).filter(StudentDocument.verification_status == 'pending').count()
    total_tasks = db.query(Task).filter(Task.status == 'published').count()
    total_faculty = db.query(Faculty).filter(Faculty.is_active == True).count()
    
    return DashboardStats(
        total_students=total_students,
        total_faculty=total_faculty,
        total_admins=db.query(Admin).count(),
        total_departments=db.query(Department).count(),
        total_documents=db.query(StudentDocument).count(),
        total_tasks=total_tasks,
        pending_verifications=pending_documents,
        active_users=db.query(User).filter(User.is_active == True).count()
    )

@router.get("/students")
def get_all_students(
    skip: int = 0,
    limit: int = 100,
    verification_status: str = None,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all students with optional filtering."""
    query = db.query(Student)
    
    if verification_status:
        query = query.filter(Student.verification_status == verification_status)
    
    students = query.offset(skip).limit(limit).all()
    
    return [
        {
            "id": student.id,
            "enrollment_number": student.enrollment_number,
            "first_name": student.first_name,
            "last_name": student.last_name,
            "email": student.user.email,
            "department": student.department.name if student.department else None,
            "semester": student.semester,
            "gpa": float(student.gpa),
            "attendance_percentage": float(student.attendance_percentage),
            "documents_verified": student.documents_verified,
            "verification_status": student.verification_status,
            "verified_at": student.verified_at,
            "created_at": student.created_at
        }
        for student in students
    ]

@router.get("/faculty")
def get_all_faculty(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all faculty members."""
    faculties = db.query(Faculty).offset(skip).limit(limit).all()
    
    return [
        {
            "id": faculty.id,
            "employee_id": faculty.employee_id,
            "first_name": faculty.first_name,
            "last_name": faculty.last_name,
            "email": faculty.user.email,
            "specialization": faculty.specialization,
            "designation": faculty.designation,
            "department": faculty.department.name if faculty.department else None,
            "is_active": faculty.is_active,
            "can_verify_documents": faculty.can_verify_documents,
            "can_assign_tasks": faculty.can_assign_tasks,
            "created_at": faculty.created_at
        }
        for faculty in faculties
    ]

@router.get("/departments")
def get_all_departments(
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all departments."""
    departments = db.query(Department).all()
    
    return [
        {
            "id": dept.id,
            "name": dept.name,
            "code": dept.code,
            "description": dept.description,
            "student_count": db.query(Student).filter(Student.department_id == dept.id).count(),
            "faculty_count": db.query(Faculty).filter(Faculty.department_id == dept.id).count()
        }
        for dept in departments
    ]

@router.get("/documents/pending")
def get_all_pending_documents(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all pending document verifications."""
    documents = db.query(StudentDocument).filter(
        StudentDocument.verification_status == 'pending'
    ).offset(skip).limit(limit).all()
    
    return [
        {
            "id": doc.id,
            "student": {
                "id": doc.student.id,
                "enrollment_number": doc.student.enrollment_number,
                "first_name": doc.student.first_name,
                "last_name": doc.student.last_name,
                "email": doc.student.user.email
            },
            "document_type": doc.document_type.name,
            "file_name": doc.file_name,
            "file_size_mb": float(doc.file_size_mb) if doc.file_size_mb else None,
            "uploaded_at": doc.uploaded_at
        }
        for doc in documents
    ]

@router.get("/tasks")
def get_all_tasks(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all tasks."""
    tasks = db.query(Task).offset(skip).limit(limit).all()
    
    return [
        {
            "id": task.id,
            "title": task.title,
            "task_type": task.task_type,
            "priority": task.priority,
            "status": task.status,
            "due_date": task.due_date,
            "max_marks": task.max_marks,
            "assigned_by": {
                "id": task.assigned_by_faculty.id,
                "name": f"{task.assigned_by_faculty.first_name} {task.assigned_by_faculty.last_name}",
                "email": task.assigned_by_faculty.user.email
            } if task.assigned_by_faculty else None,
            "assigned_to": {
                "id": task.assigned_to_student.id,
                "name": f"{task.assigned_to_student.first_name} {task.assigned_to_student.last_name}",
                "enrollment_number": task.assigned_to_student.enrollment_number
            } if task.assigned_to_student else None,
            "department": task.department.name if task.department else None,
            "created_at": task.created_at,
            "submission_count": len(task.submissions)
        }
        for task in tasks
    ]

@router.post("/faculty/{faculty_id}/toggle-status")
def toggle_faculty_status(
    faculty_id: int,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Toggle faculty active status."""
    faculty = db.query(Faculty).filter(Faculty.id == faculty_id).first()
    if not faculty:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Faculty not found"
        )
    
    faculty.is_active = not faculty.is_active
    db.commit()
    
    return {
        "message": f"Faculty status updated to {'active' if faculty.is_active else 'inactive'}",
        "is_active": faculty.is_active
    }

@router.get("/audit/logs")
def get_audit_logs(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get audit logs."""
    from database_models import AuditLog
    
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
    
    return [
        {
            "id": log.id,
            "user": log.user.email if log.user else "System",
            "action": log.action,
            "table_name": log.table_name,
            "record_id": log.record_id,
            "ip_address": log.ip_address,
            "user_agent": log.user_agent,
            "created_at": log.created_at
        }
        for log in logs
    ]

# Pydantic schemas for user management
class UserCreate(BaseModel):
    name: str
    email: str
    role: str  # 'student' or 'faculty'
    phone: str = None
    enrollment_number: str = None
    department: str
    password: str
    confirm_password: str

class UserUpdate(BaseModel):
    name: str = None
    email: str = None
    phone: str = None
    department: str = None
    status: str = None  # 'active' or 'inactive'

@router.get("/users")
def get_all_users(
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all users (students and faculty)."""
    users = []
    
    # Get students
    students = db.query(Student).all()
    for student in students:
        users.append({
            "id": student.id,
            "name": f"{student.first_name} {student.last_name}",
            "email": student.user.email,
            "role": "student",
            "phone": student.phone,
            "enrollment_number": student.enrollment_number,
            "department": student.department.name if student.department else None,
            "created_at": student.created_at.isoformat() if student.created_at else None,
            "status": "active" if student.user.is_active else "inactive"
        })
    
    # Get faculty
    faculties = db.query(Faculty).all()
    for faculty in faculties:
        users.append({
            "id": faculty.id,
            "name": f"{faculty.first_name} {faculty.last_name}",
            "email": faculty.user.email,
            "role": "faculty",
            "phone": faculty.phone,
            "department": faculty.department.name if faculty.department else None,
            "created_at": faculty.created_at.isoformat() if faculty.created_at else None,
            "status": "active" if faculty.user.is_active else "inactive"
        })
    
    return users

@router.get("/stats")
def get_admin_stats(
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get user statistics for admin dashboard."""
    total_students = db.query(Student).count()
    total_faculty = db.query(Faculty).count()
    total_users = total_students + total_faculty
    active_users = db.query(User).filter(User.is_active == True).count()
    
    return {
        "total_users": total_users,
        "total_students": total_students,
        "total_faculty": total_faculty,
        "active_users": active_users
    }

@router.post("/users")
def create_user(
    user_data: UserCreate,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Create a new user (student or faculty)."""
    
    # Validate passwords match
    if user_data.password != user_data.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match"
        )
    
    # Validate email format
    if not is_accepted_email(user_data.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=accepted_domain_error(user_data.email)
        )
    
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Get department
    department = db.query(Department).filter(Department.name == user_data.department).first()
    if not department:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Department not found"
        )
    
    try:
        # Create user account
        hashed_password = get_password_hash(user_data.password)
        new_user = User(
            email=user_data.email,
            password_hash=hashed_password,
            is_active=True,
            role=user_data.role
        )
        db.add(new_user)
        db.flush()  # Get the user ID
        
        if user_data.role == 'student':
            # Validate enrollment number
            if not user_data.enrollment_number:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Enrollment number is required for students"
                )
            
            # Check if enrollment number already exists
            existing_enrollment = db.query(Student).filter(
                Student.enrollment_number == user_data.enrollment_number
            ).first()
            if existing_enrollment:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Enrollment number already exists"
                )
            
            # Create student
            name_parts = user_data.name.split()
            first_name = name_parts[0] if len(name_parts) > 0 else ""
            last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""
            
            new_student = Student(
                user_id=new_user.id,
                enrollment_number=user_data.enrollment_number,
                first_name=first_name,
                last_name=last_name,
                department_id=department.id,
                phone=user_data.phone,
                semester=1,  # Default semester
                gpa=0.0,  # Default GPA
                attendance_percentage=0.0,  # Default attendance
                documents_verified=False,
                verification_status='pending'
            )
            db.add(new_student)
            
        elif user_data.role == 'faculty':
            # Create faculty
            name_parts = user_data.name.split()
            first_name = name_parts[0] if len(name_parts) > 0 else ""
            last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""
            
            new_faculty = Faculty(
                user_id=new_user.id,
                employee_id=f"EMP{datetime.now().strftime('%Y%m%d%H%M%S')}",  # Generate employee ID
                first_name=first_name,
                last_name=last_name,
                department_id=department.id,
                phone=user_data.phone,
                designation="Faculty",  # Default designation
                specialization="General",  # Default specialization
                is_active=True,
                can_verify_documents=True,
                can_assign_tasks=True
            )
            db.add(new_faculty)
        
        db.commit()
        
        return {
            "message": f"{user_data.role.capitalize()} created successfully",
            "user_id": new_user.id,
            "email": user_data.email,
            "role": user_data.role
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating user: {str(e)}"
        )

@router.put("/users/{user_id}")
def update_user(
    user_id: int,
    user_data: UserUpdate,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update user information."""
    
    # Try to find user as student first
    user = db.query(Student).filter(Student.id == user_id).first()
    user_type = "student"
    
    if not user:
        # Try to find as faculty
        user = db.query(Faculty).filter(Faculty.id == user_id).first()
        user_type = "faculty"
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    try:
        # Update user basic info
        if user_data.name:
            name_parts = user_data.name.split()
            user.first_name = name_parts[0] if len(name_parts) > 0 else user.first_name
            user.last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else user.last_name
        
        if user_data.email:
            # Check if email already exists (excluding current user)
            existing_user = db.query(User).filter(
                User.email == user_data.email,
                User.id != user.user_id
            ).first()
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered"
                )
            user.user.email = user_data.email
        
        if user_data.phone is not None:
            user.phone = user_data.phone
        
        if user_data.department:
            department = db.query(Department).filter(Department.name == user_data.department).first()
            if not department:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Department not found"
                )
            user.department_id = department.id
        
        if user_data.status is not None:
            user.user.is_active = (user_data.status == 'active')
        
        db.commit()
        
        return {
            "message": f"{user_type.capitalize()} updated successfully",
            "user_id": user_id
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating user: {str(e)}"
        )

@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Delete a user."""
    
    # Try to find user as student first
    user = db.query(Student).filter(Student.id == user_id).first()
    user_type = "student"
    
    if not user:
        # Try to find as faculty
        user = db.query(Faculty).filter(Faculty.id == user_id).first()
        user_type = "faculty"
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    try:
        # Get the user account for deletion
        user_account = user.user
        
        # Delete the student/faculty record first (due to foreign key constraint)
        db.delete(user)
        
        # Delete the user account
        db.delete(user_account)
        
        db.commit()
        
        return {
            "message": f"{user_type.capitalize()} deleted successfully",
            "user_id": user_id
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting user: {str(e)}"
        )

# Student verification endpoints
@router.get("/students/verification-stats")
def get_student_verification_stats(
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get student verification statistics."""
    total_students = db.query(Student).count()
    verified_students = db.query(Student).filter(Student.verification_status == 'verified').count()
    pending_students = db.query(Student).filter(Student.verification_status == 'pending').count()
    rejected_students = db.query(Student).filter(Student.verification_status == 'rejected').count()
    
    return {
        "total_students": total_students,
        "verified_students": verified_students,
        "pending_students": pending_students,
        "rejected_students": rejected_students
    }

@router.post("/students/{student_id}/verify")
def verify_student(
    student_id: int,
    verification_data: dict = None,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Verify a student."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )
    
    try:
        # Update student verification status
        student.verification_status = VerificationStatus.VERIFIED
        student.documents_verified = True
        student.verified_at = datetime.utcnow()
        
        # Get faculty ID (assuming admin is acting as verifier)
        # In a real implementation, you might want to track which admin verified
        faculty_verifier = db.query(Faculty).filter(Faculty.user_id == current_user.id).first()
        if faculty_verifier:
            student.verified_by = faculty_verifier.id
        
        db.commit()
        
        return {
            "message": "Student verified successfully",
            "student_id": student_id,
            "verification_status": student.verification_status,
            "verified_at": student.verified_at
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error verifying student: {str(e)}"
        )

@router.post("/students/{student_id}/reject")
def reject_student(
    student_id: int,
    rejection_data: dict = None,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Reject a student verification."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )
    
    try:
        # Update student verification status
        student.verification_status = VerificationStatus.REJECTED
        student.documents_verified = False
        student.verified_at = datetime.utcnow()
        
        # Get faculty ID (assuming admin is acting as verifier)
        faculty_verifier = db.query(Faculty).filter(Faculty.user_id == current_user.id).first()
        if faculty_verifier:
            student.verified_by = faculty_verifier.id
        
        # Add rejection reason if provided
        if rejection_data and 'rejection_reason' in rejection_data:
            # You might want to add a rejection_reason field to the Student model
            pass
        
        db.commit()
        
        return {
            "message": "Student verification rejected",
            "student_id": student_id,
            "verification_status": student.verification_status,
            "verified_at": student.verified_at
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error rejecting student: {str(e)}"
        )

@router.post("/students/bulk-verify")
def bulk_verify_students(
    student_ids: list[int],
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Bulk verify students."""
    if not student_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No student IDs provided"
        )
    
    try:
        # Get faculty ID (assuming admin is acting as verifier)
        faculty_verifier = db.query(Faculty).filter(Faculty.user_id == current_user.id).first()
        
        verified_count = 0
        for student_id in student_ids:
            student = db.query(Student).filter(Student.id == student_id).first()
            if student:
                student.verification_status = VerificationStatus.VERIFIED
                student.documents_verified = True
                student.verified_at = datetime.utcnow()
                if faculty_verifier:
                    student.verified_by = faculty_verifier.id
                verified_count += 1
        
        db.commit()
        
        return {
            "message": f"Bulk verification completed",
            "verified_count": verified_count,
            "total_requested": len(student_ids)
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error in bulk verification: {str(e)}"
        )

@router.post("/students/bulk-reject")
def bulk_reject_students(
    student_ids: list[int],
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Bulk reject students."""
    if not student_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No student IDs provided"
        )
    
    try:
        # Get faculty ID (assuming admin is acting as verifier)
        faculty_verifier = db.query(Faculty).filter(Faculty.user_id == current_user.id).first()
        
        rejected_count = 0
        for student_id in student_ids:
            student = db.query(Student).filter(Student.id == student_id).first()
            if student:
                student.verification_status = VerificationStatus.REJECTED
                student.documents_verified = False
                student.verified_at = datetime.utcnow()
                if faculty_verifier:
                    student.verified_by = faculty_verifier.id
                rejected_count += 1
        
        db.commit()
        
        return {
            "message": f"Bulk rejection completed",
            "rejected_count": rejected_count,
            "total_requested": len(student_ids)
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error in bulk rejection: {str(e)}"
        )
