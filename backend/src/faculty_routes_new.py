from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from models import User, Faculty, Department, Student, StudentDocument, Task, TaskSubmission, UserRole, FacultyRole, DocumentType
from database import get_db
from faculty_schemas import (
    FacultyCreate, FacultyUpdate, FacultyResponse, FacultyProfileResponse,
    DepartmentCreate, DepartmentUpdate, DepartmentResponse,
    TaskCreate, TaskUpdate, TaskResponse,
    StudentVerificationRequest, BulkStudentVerification,
    FacultyStats
)
from dependencies import get_current_active_user, get_current_faculty
from typing import List, Optional
from datetime import datetime
import bcrypt
import os

router = APIRouter(prefix="/faculty", tags=["faculty"])

# Helper function to set faculty permissions based on role
def set_faculty_permissions(faculty: Faculty, role: FacultyRole):
    """Set faculty permissions based on their role"""
    # Reset all permissions to False
    faculty.can_verify_documents = False
    faculty.can_assign_tasks = False
    faculty.can_grade_submissions = False
    faculty.can_manage_students = False
    faculty.can_generate_reports = False
    faculty.can_access_all_departments = False
    
    # Set permissions based on role
    if role == FacultyRole.REGISTRAR:
        faculty.can_verify_documents = True
        faculty.can_manage_students = True
        faculty.can_generate_reports = True
        faculty.can_access_all_departments = True
        faculty.can_assign_tasks = True  # Can assign administrative tasks
        
    elif role == FacultyRole.PROFESSOR:
        faculty.can_verify_documents = True
        faculty.can_assign_tasks = True
        faculty.can_grade_submissions = True
        faculty.can_generate_reports = True
        
    elif role == FacultyRole.ASSOCIATE_PROFESSOR:
        faculty.can_verify_documents = True
        faculty.can_assign_tasks = True
        faculty.can_grade_submissions = True
        
    elif role == FacultyRole.ASSISTANT_PROFESSOR:
        faculty.can_verify_documents = True
        faculty.can_assign_tasks = True
        faculty.can_grade_submissions = True
        
    elif role == FacultyRole.LECTURER:
        faculty.can_assign_tasks = True
        faculty.can_grade_submissions = True
        
    elif role == FacultyRole.LAB_INSTRUCTOR:
        faculty.can_assign_tasks = True
        faculty.can_grade_submissions = True
        
    elif role == FacultyRole.ADMIN_STAFF:
        faculty.can_verify_documents = True
        faculty.can_generate_reports = True
        faculty.can_access_all_departments = True

# Faculty Management Routes (Admin only)
@router.post("/", response_model=FacultyResponse)
def create_faculty(
    faculty: FacultyCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new faculty member (Admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can create faculty members"
        )
    
    # Check if employee ID already exists
    existing_faculty = db.query(Faculty).filter(Faculty.employee_id == faculty.employee_id).first()
    if existing_faculty:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Employee ID already exists"
        )
    
    # Check if department exists
    department = db.query(Department).filter(Department.id == faculty.department_id).first()
    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found"
        )
    
    # Create user account
    hashed_password = bcrypt.hashpw(faculty.password.encode('utf-8'), bcrypt.gensalt())
    user = User(
        email=faculty.email or f"{faculty.employee_id}@university.edu.in",
        password=hashed_password.decode('utf-8'),
        role=UserRole.FACULTY,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Create faculty record
    db_faculty = Faculty(
        user_id=user.id,
        employee_id=faculty.employee_id,
        first_name=faculty.first_name,
        last_name=faculty.last_name,
        phone=faculty.phone,
        email=faculty.email,
        specialization=faculty.specialization,
        designation=faculty.designation,
        role=faculty.role,
        department_id=faculty.department_id,
        is_active=faculty.is_active
    )
    
    # Set permissions based on role
    set_faculty_permissions(db_faculty, faculty.role)
    
    db.add(db_faculty)
    db.commit()
    db.refresh(db_faculty)
    
    return db_faculty

@router.get("/", response_model=List[FacultyResponse])
def get_faculties(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    department_id: Optional[int] = Query(None),
    role: Optional[FacultyRole] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all faculty members (Admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can view all faculty members"
        )
    
    query = db.query(Faculty)
    
    if department_id:
        query = query.filter(Faculty.department_id == department_id)
    
    if role:
        query = query.filter(Faculty.role == role)
    
    faculties = query.offset(skip).limit(limit).all()
    return faculties

@router.get("/me", response_model=FacultyProfileResponse)
def get_my_faculty_profile(
    current_user: User = Depends(get_current_faculty),
    db: Session = Depends(get_db)
):
    """Get current faculty's profile"""
    try:
        faculty = db.query(Faculty).filter(Faculty.user_id == current_user.id).first()
        if not faculty:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Faculty profile not found"
            )
        
        department = db.query(Department).filter(Department.id == faculty.department_id).first()
        
        permissions = {
            "can_verify_documents": faculty.can_verify_documents,
            "can_assign_tasks": faculty.can_assign_tasks,
            "can_grade_submissions": faculty.can_grade_submissions,
            "can_manage_students": faculty.can_manage_students,
            "can_generate_reports": faculty.can_generate_reports,
            "can_access_all_departments": faculty.can_access_all_departments
        }
        
        return {
            **faculty.__dict__,
            "department": {
                "id": department.id,
                "name": department.name,
                "code": department.code,
                "type": department.type.value
            } if department else None,
            "permissions": permissions
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching faculty profile: {str(e)}"
        )

@router.put("/{faculty_id}", response_model=FacultyResponse)
def update_faculty(
    faculty_id: int,
    faculty_update: FacultyUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update faculty member (Admin only or own profile)"""
    if current_user.role != UserRole.ADMIN:
        # Check if updating own profile
        faculty = db.query(Faculty).filter(Faculty.user_id == current_user.id).first()
        if not faculty or faculty.id != faculty_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Can only update own profile"
            )
    
    db_faculty = db.query(Faculty).filter(Faculty.id == faculty_id).first()
    if not db_faculty:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Faculty not found"
        )
    
    # Update fields
    update_data = faculty_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_faculty, field, value)
    
    # Update permissions if role changed
    if 'role' in update_data:
        set_faculty_permissions(db_faculty, db_faculty.role)
    
    db.commit()
    db.refresh(db_faculty)
    
    return db_faculty

# Task Management Routes
@router.post("/tasks", response_model=TaskResponse)
def create_task(
    task: TaskCreate,
    current_user: User = Depends(get_current_faculty),
    db: Session = Depends(get_db)
):
    """Create a new task for students"""
    faculty = db.query(Faculty).filter(Faculty.user_id == current_user.id).first()
    if not faculty or not faculty.can_assign_tasks:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to assign tasks"
        )
    
    # Validate department
    if task.department_id:
        department = db.query(Department).filter(Department.id == task.department_id).first()
        if not department:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Department not found"
            )
    
    db_task = Task(
        title=task.title,
        description=task.description,
        type=task.type,
        priority=task.priority,
        due_date=task.due_date,
        max_score=task.max_score,
        faculty_id=faculty.id,
        department_id=task.department_id or faculty.department_id
    )
    
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    
    return db_task

@router.get("/tasks", response_model=List[TaskResponse])
def get_tasks(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_faculty),
    db: Session = Depends(get_db)
):
    """Get tasks created by current faculty"""
    faculty = db.query(Faculty).filter(Faculty.user_id == current_user.id).first()
    if not faculty:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Faculty profile not found"
        )
    
    tasks = db.query(Task).filter(Task.faculty_id == faculty.id).offset(skip).limit(limit).all()
    return tasks

@router.put("/tasks/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    task_update: TaskUpdate,
    current_user: User = Depends(get_current_faculty),
    db: Session = Depends(get_db)
):
    """Update a task"""
    faculty = db.query(Faculty).filter(Faculty.user_id == current_user.id).first()
    if not faculty or not faculty.can_assign_tasks:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update tasks"
        )
    
    task = db.query(Task).filter(Task.id == task_id, Task.faculty_id == faculty.id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    update_data = task_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(task, field, value)
    
    db.commit()
    db.refresh(task)
    
    return task

# Student Verification Routes
@router.get("/documents/pending", response_model=List[dict])
def get_pending_documents(
    skip: int = Query(0, ge=0),
    limit: int = Query(1000, ge=1, le=1000),
    current_user: User = Depends(get_current_faculty),
    db: Session = Depends(get_db)
):
    """Get all pending documents for verification"""
    faculty = db.query(Faculty).filter(Faculty.user_id == current_user.id).first()
    if not faculty or not faculty.can_verify_documents:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to verify documents"
        )
    
    # Get students based on faculty permissions
    if faculty.can_access_all_departments:
        students = db.query(Student).all()
    else:
        students = db.query(Student).filter(Student.department_id == faculty.department_id).all()
    
    student_ids = [s.id for s in students]
    
    # Get documents with student and document type info
    documents = db.query(StudentDocument, Student, DocumentType).join(
        Student, StudentDocument.student_id == Student.id
    ).join(
        DocumentType, StudentDocument.document_type_id == DocumentType.id
    ).filter(
        StudentDocument.student_id.in_(student_ids)
    ).offset(skip).limit(limit).all()
    
    result = []
    for doc, student, doc_type in documents:
        result.append({
            "id": doc.id,
            "student_id": doc.student_id,
            "student_name": f"{student.first_name} {student.last_name}",
            "student_email": student.user.email if student.user else "",
            "enrollment_number": student.enrollment_number,
            "document_type_name": doc_type.name,
            "file_name": doc.file_name,
            "file_size_mb": doc.file_size_mb,
            "file_extension": doc.file_extension,
            "verification_status": doc.verification_status,
            "verification_date": doc.verification_date.isoformat() if doc.verification_date else None,
            "verification_remarks": doc.verification_remarks,
            "verified_by_name": db.query(Faculty).filter(Faculty.id == doc.verified_by).first().first_name + " " + 
                            db.query(Faculty).filter(Faculty.id == doc.verified_by).first().last_name if doc.verified_by else None,
            "uploaded_at": doc.created_at.isoformat() if doc.created_at else None,
            "file_path": doc.file_path
        })
    
    return result

@router.post("/verify-document")
def verify_student_document(
    verification: StudentVerificationRequest,
    current_user: User = Depends(get_current_faculty),
    db: Session = Depends(get_db)
):
    """Verify a student document"""
    faculty = db.query(Faculty).filter(Faculty.user_id == current_user.id).first()
    if not faculty or not faculty.can_verify_documents:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to verify documents"
        )
    
    # Check if student exists
    student = db.query(Student).filter(Student.id == verification.student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )
    
    # Find the document
    document = db.query(StudentDocument).filter(
        and_(
            StudentDocument.student_id == verification.student_id,
            StudentDocument.document_type_id == verification.document_type_id
        )
    ).first()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Update verification status
    document.verification_status = verification.verification_status
    document.verified_by = faculty.id
    document.verification_date = datetime.utcnow()
    document.verification_remarks = verification.remarks
    
    db.commit()
    
    return {"message": "Document verified successfully"}

@router.post("/bulk-verify-documents")
def bulk_verify_student_documents(
    bulk_verification: BulkStudentVerification,
    current_user: User = Depends(get_current_faculty),
    db: Session = Depends(get_db)
):
    """Bulk verify student documents"""
    faculty = db.query(Faculty).filter(Faculty.user_id == current_user.id).first()
    if not faculty or not faculty.can_verify_documents:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to verify documents"
        )
    
    verified_count = 0
    for verification in bulk_verification.verifications:
        # Find the document
        document = db.query(StudentDocument).filter(
            and_(
                StudentDocument.student_id == verification.student_id,
                StudentDocument.document_type_id == verification.document_type_id
            )
        ).first()
        
        if document:
            # Update verification status
            document.verification_status = verification.verification_status
            document.verified_by = faculty.id
            document.verification_date = datetime.utcnow()
            document.verification_remarks = verification.remarks
            verified_count += 1
    
    db.commit()
    
    return {"message": f"Verified {verified_count} documents successfully"}

@router.get("/documents/download/{document_id}")
def download_document(
    document_id: int,
    current_user: User = Depends(get_current_faculty),
    db: Session = Depends(get_db)
):
    """Download a student document"""
    faculty = db.query(Faculty).filter(Faculty.user_id == current_user.id).first()
    if not faculty or not faculty.can_verify_documents:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to download documents"
        )
    
    # Get students based on faculty permissions
    if faculty.can_access_all_departments:
        students = db.query(Student).all()
    else:
        students = db.query(Student).filter(Student.department_id == faculty.department_id).all()
    
    student_ids = [s.id for s in students]
    
    # Find the document
    document = db.query(StudentDocument).filter(
        and_(
            StudentDocument.id == document_id,
            StudentDocument.student_id.in_(student_ids)
        )
    ).first()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Check if file exists
    if not os.path.exists(document.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found on server"
        )
    
    return FileResponse(
        document.file_path,
        media_type='application/octet-stream',
        filename=document.file_name
    )

# Statistics Route
@router.get("/stats", response_model=FacultyStats)
def get_faculty_stats(
    current_user: User = Depends(get_current_faculty),
    db: Session = Depends(get_db)
):
    """Get faculty statistics"""
    faculty = db.query(Faculty).filter(Faculty.user_id == current_user.id).first()
    if not faculty:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Faculty profile not found"
        )
    
    # Get students in faculty's department (or all if registrar/admin staff)
    if faculty.can_access_all_departments:
        students = db.query(Student).all()
    else:
        students = db.query(Student).filter(Student.department_id == faculty.department_id).all()
    
    student_ids = [s.id for s in students]
    
    # Document verification stats
    pending_verifications = db.query(StudentDocument).filter(
        and_(
            StudentDocument.student_id.in_(student_ids),
            StudentDocument.verification_status == "pending"
        )
    ).count()
    
    verified_documents = db.query(StudentDocument).filter(
        and_(
            StudentDocument.student_id.in_(student_ids),
            StudentDocument.verification_status == "verified"
        )
    ).count()
    
    rejected_documents = db.query(StudentDocument).filter(
        and_(
            StudentDocument.student_id.in_(student_ids),
            StudentDocument.verification_status == "rejected"
        )
    ).count()
    
    # Task stats
    active_tasks = db.query(Task).filter(
        and_(
            Task.faculty_id == faculty.id,
            Task.is_active == True,
            Task.due_date > datetime.utcnow()
        )
    ).count()
    
    completed_tasks = db.query(Task).filter(
        and_(
            Task.faculty_id == faculty.id,
            Task.is_active == False
        )
    ).count()
    
    # Submission stats
    pending_submissions = db.query(TaskSubmission).join(Task).filter(
        and_(
            Task.faculty_id == faculty.id,
            TaskSubmission.graded_by.is_(None)
        )
    ).count()
    
    graded_submissions = db.query(TaskSubmission).join(Task).filter(
        and_(
            Task.faculty_id == faculty.id,
            TaskSubmission.graded_by == faculty.id
        )
    ).count()
    
    return FacultyStats(
        total_students=len(students),
        pending_verifications=pending_verifications,
        verified_documents=verified_documents,
        rejected_documents=rejected_documents,
        active_tasks=active_tasks,
        completed_tasks=completed_tasks,
        pending_submissions=pending_submissions,
        graded_submissions=graded_submissions
    )

# Department Management Routes (Admin only)
@router.post("/departments", response_model=DepartmentResponse)
def create_department(
    department: DepartmentCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new department (Admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can create departments"
        )
    
    # Check if department code already exists
    existing_dept = db.query(Department).filter(
        or_(Department.name == department.name, Department.code == department.code)
    ).first()
    
    if existing_dept:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Department with this name or code already exists"
        )
    
    db_department = Department(
        name=department.name,
        code=department.code,
        type=department.type,
        description=department.description
    )
    
    db.add(db_department)
    db.commit()
    db.refresh(db_department)
    
    return db_department

@router.get("/departments", response_model=List[DepartmentResponse])
def get_departments(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all departments"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can view departments"
        )
    
    departments = db.query(Department).all()
    return departments
