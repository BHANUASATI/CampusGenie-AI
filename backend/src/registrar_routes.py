from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from models import User, Faculty, Student, StudentDocument, DocumentType, Admin
from database import get_db
from models import User, Faculty, Student, StudentDocument, DocumentType, Admin, Department
from database import get_db
from dependencies import get_current_active_user, get_current_faculty
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel
from security import get_password_hash
from dependencies import get_current_active_user, get_current_faculty
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel
from email_service import email_service
import os

router = APIRouter(prefix="/registrar", tags=["registrar"])

# Helper function to check if user is registrar
def get_registrar_user(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    """Check if current user is a registrar"""
    # Allow users with role "registrar" or faculty users with registrar designation
    if current_user.role == "registrar":
        # Check if there's a faculty record for this user
        faculty = db.query(Faculty).filter(Faculty.user_id == current_user.id).first()
        if faculty and faculty.designation.lower() == "registrar":
            return faculty
        # If no faculty record but role is registrar, create a minimal return object
        elif faculty:
            return faculty
        else:
            # Return the user info if no faculty record exists
            return current_user
    elif current_user.role == "faculty":
        faculty = db.query(Faculty).filter(Faculty.user_id == current_user.id).first()
        if not faculty or faculty.designation.lower() != "registrar":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Registrar privileges required."
            )
        return faculty
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Registrar access required."
        )

@router.get("/documents/all", response_model=List[dict])
def get_all_documents(
    skip: int = Query(0, ge=0),
    limit: int = Query(1000, ge=1, le=1000),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all documents for registrar (with full access)"""
    # Verify registrar access
    registrar = get_registrar_user(current_user, db)
    
    # Get all documents with student and document type info
    documents = db.query(StudentDocument, Student, DocumentType).join(
        Student, StudentDocument.student_id == Student.id
    ).join(
        DocumentType, StudentDocument.document_type_id == DocumentType.id
    ).offset(skip).limit(limit).all()
    
    result = []
    for doc, student, doc_type in documents:
        verified_by_faculty = None
        if doc.verified_by:
            verified_faculty = db.query(Faculty).filter(Faculty.id == doc.verified_by).first()
            if verified_faculty:
                verified_by_faculty = f"{verified_faculty.first_name} {verified_faculty.last_name}"
        
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
            "verified_at": doc.verified_at.isoformat() if doc.verified_at else None,
            "verification_notes": doc.verification_notes,
            "verified_by_name": verified_by_faculty,
            "uploaded_at": doc.uploaded_at.isoformat() if doc.uploaded_at else None,
            "file_path": doc.file_path
        })
    
    return result

@router.get("/stats", response_model=Dict[str, Any])
def get_registrar_stats(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get registrar dashboard statistics"""
    # Verify registrar access
    registrar = get_registrar_user(current_user, db)
    
    # Get document statistics
    total_documents = db.query(StudentDocument).count()
    pending_documents = db.query(StudentDocument).filter(StudentDocument.verification_status == "pending").count()
    verified_documents = db.query(StudentDocument).filter(StudentDocument.verification_status == "verified").count()
    rejected_documents = db.query(StudentDocument).filter(StudentDocument.verification_status == "rejected").count()
    
    # Get student statistics
    total_students = db.query(Student).count()
    verified_students = db.query(Student).filter(Student.documents_verified == True).count()
    pending_students = db.query(Student).filter(Student.documents_verified == False).count()
    
    return {
        "total_documents": total_documents,
        "pending_documents": pending_documents,
        "verified_documents": verified_documents,
        "rejected_documents": rejected_documents,
        "total_students": total_students,
        "verified_students": verified_students,
        "pending_students": pending_students,
        "rejected_students": 0  # Can be calculated if needed
    }

@router.get("/students/all", response_model=List[dict])
def get_all_students(
    skip: int = Query(0, ge=0),
    limit: int = Query(1000, ge=1, le=1000),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all students for registrar"""
    # Verify registrar access
    registrar = get_registrar_user(current_user, db)
    
    students = db.query(Student).offset(skip).limit(limit).all()
    
    result = []
    for student in students:
        # Get student's document count
        doc_count = db.query(StudentDocument).filter(StudentDocument.student_id == student.id).count()
        pending_docs = db.query(StudentDocument).filter(
            StudentDocument.student_id == student.id,
            StudentDocument.verification_status == "pending"
        ).count()
        
        result.append({
            "id": student.id,
            "enrollment_number": student.enrollment_number,
            "first_name": student.first_name,
            "last_name": student.last_name,
            "email": student.user.email if student.user else "",
            "phone": student.phone,
            "department": student.department.name if student.department else "",
            "semester": student.semester,
            "gpa": student.gpa,
            "attendance_percentage": student.attendance_percentage,
            "documents_verified": student.documents_verified,
            "verification_status": "verified" if student.documents_verified else "pending",
            "verified_at": None,  # Can be added if tracking verification date
            "created_at": student.created_at.isoformat() if student.created_at else None,
            "total_documents": doc_count,
            "pending_documents": pending_docs
        })
    
    return result

@router.get("/recent-activity", response_model=List[dict])
def get_recent_activity(
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get recent verification activity"""
    # Verify registrar access
    registrar = get_registrar_user(current_user, db)
    
    # Get recent document verifications
    recent_docs = db.query(StudentDocument, Student, DocumentType, Faculty).join(
        Student, StudentDocument.student_id == Student.id
    ).join(
        DocumentType, StudentDocument.document_type_id == DocumentType.id
    ).outerjoin(
        Faculty, StudentDocument.verified_by == Faculty.id
    ).filter(
        StudentDocument.verified_at.isnot(None)
    ).order_by(
        StudentDocument.verified_at.desc()
    ).limit(limit).all()
    
    result = []
    for doc, student, doc_type, faculty in recent_docs:
        result.append({
            "id": doc.id,
            "type": "document_verification",
            "description": f"{doc_type.name} for {student.first_name} {student.last_name}",
            "status": doc.verification_status,
            "timestamp": doc.verified_at.isoformat() if doc.verified_at else None,
            "performed_by": f"{faculty.first_name} {faculty.last_name}" if faculty else "System",
            "student_name": f"{student.first_name} {student.last_name}",
            "enrollment_number": student.enrollment_number
        })
    
    return result

@router.get("/search", response_model=List[dict])
def search_documents_and_students(
    q: str = Query(..., min_length=1),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Search documents and students"""
    # Verify registrar access
    registrar = get_registrar_user(current_user, db)
    
    search_term = f"%{q}%"
    
    # Search in documents
    documents = db.query(StudentDocument, Student, DocumentType).join(
        Student, StudentDocument.student_id == Student.id
    ).join(
        DocumentType, StudentDocument.document_type_id == DocumentType.id
    ).filter(
        or_(
            Student.first_name.ilike(search_term),
            Student.last_name.ilike(search_term),
            Student.enrollment_number.ilike(search_term),
            Student.user.has(User.email.ilike(search_term)) if Student.user else False,
            DocumentType.name.ilike(search_term),
            StudentDocument.file_name.ilike(search_term)
        )
    ).all()
    
    result = []
    for doc, student, doc_type in documents:
        verified_by_faculty = None
        if doc.verified_by:
            verified_faculty = db.query(Faculty).filter(Faculty.id == doc.verified_by).first()
            if verified_faculty:
                verified_by_faculty = f"{verified_faculty.first_name} {verified_faculty.last_name}"
        
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
            "verified_at": doc.verified_at.isoformat() if doc.verified_at else None,
            "verification_notes": doc.verification_notes,
            "verified_by_name": verified_by_faculty,
            "uploaded_at": doc.uploaded_at.isoformat() if doc.uploaded_at else None,
            "file_path": doc.file_path
        })
    
    return result

@router.get("/student/{student_id}/documents", response_model=List[dict])
def get_student_documents(
    student_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all documents for a specific student"""
    # Verify registrar access
    registrar = get_registrar_user(current_user, db)
    
    # Check if student exists
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )
    
    # Get student's documents
    documents = db.query(StudentDocument, DocumentType).join(
        DocumentType, StudentDocument.document_type_id == DocumentType.id
    ).filter(
        StudentDocument.student_id == student_id
    ).all()
    
    result = []
    for doc, doc_type in documents:
        verified_by_faculty = None
        if doc.verified_by:
            verified_faculty = db.query(Faculty).filter(Faculty.id == doc.verified_by).first()
            if verified_faculty:
                verified_by_faculty = f"{verified_faculty.first_name} {verified_faculty.last_name}"
        
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
            "verified_at": doc.verified_at.isoformat() if doc.verified_at else None,
            "verification_notes": doc.verification_notes,
            "verified_by_name": verified_by_faculty,
            "uploaded_at": doc.uploaded_at.isoformat() if doc.uploaded_at else None,
            "file_path": doc.file_path
        })
    
    return result

# Additional endpoints needed by frontend
class VerificationRequest(BaseModel):
    verification_status: str
    remarks: Optional[str] = None

@router.post("/documents/{document_id}/verify")
def verify_document(
    document_id: int,
    verification_data: VerificationRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Verify or reject a document"""
    # Verify registrar access
    registrar = get_registrar_user(current_user, db)
    
    # Get document
    document = db.query(StudentDocument).filter(StudentDocument.id == document_id).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Update document
    document.verification_status = verification_data.verification_status
    document.verified_at = datetime.utcnow()
    document.verification_notes = verification_data.remarks
    
    # Handle both User and Faculty objects
    if hasattr(registrar, 'id'):
        document.verified_by = registrar.id
    else:
        # If registrar is a User object, we need to find the faculty record
        faculty = db.query(Faculty).filter(Faculty.user_id == registrar.id).first()
        document.verified_by = faculty.id if faculty else registrar.id
    
    db.commit()
    
    return {"message": f"Document {verification_data.verification_status} successfully"}

@router.post("/students/{student_id}/verify")
def verify_student(
    student_id: int,
    verification_data: VerificationRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Verify or reject a student"""
    # Verify registrar access
    registrar = get_registrar_user(current_user, db)
    
    # Get student
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )
    
    # Update student verification status (only if verified)
    if verification_data.verification_status == "verified":
        # Check if all 9 required documents are verified
        verified_docs = db.query(StudentDocument).filter(
            StudentDocument.student_id == student.id,
            StudentDocument.verification_status == 'verified'
        ).count()
        
        if verified_docs == 9:
            student.documents_verified = True
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot verify student. Only {verified_docs}/9 required documents are verified."
            )
    else:
        student.documents_verified = False
    
    db.commit()
    
    return {"message": f"Student {verification_data.verification_status} successfully"}

class BulkVerificationRequest(BaseModel):
    document_ids: List[int]
    verification_status: str
    remarks: Optional[str] = None

@router.post("/documents/bulk-verify")
def bulk_verify_documents(
    bulk_data: BulkVerificationRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Bulk verify documents"""
    # Verify registrar access
    registrar = get_registrar_user(current_user, db)
    
    verified_count = 0
    for doc_id in bulk_data.document_ids:
        document = db.query(StudentDocument).filter(StudentDocument.id == doc_id).first()
        if document:
            document.verification_status = bulk_data.verification_status
            document.verified_at = datetime.utcnow()
            document.verification_notes = bulk_data.remarks
            
            # Handle both User and Faculty objects
            if hasattr(registrar, 'id'):
                document.verified_by = registrar.id
            else:
                # If registrar is a User object, we need to find the faculty record
                faculty = db.query(Faculty).filter(Faculty.user_id == registrar.id).first()
                document.verified_by = faculty.id if faculty else registrar.id
            
            verified_count += 1
    
    db.commit()
    
    return {"message": f"Verified {verified_count} documents successfully"}

class BulkStudentVerificationRequest(BaseModel):
    student_ids: List[int]
    verification_status: str
    remarks: Optional[str] = None

@router.post("/students/bulk-verify")
def bulk_verify_students(
    bulk_data: BulkStudentVerificationRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Bulk verify students"""
    # Verify registrar access
    registrar = get_registrar_user(current_user, db)
    
    verified_count = 0
    for student_id in bulk_data.student_ids:
        student = db.query(Student).filter(Student.id == student_id).first()
        if student:
            if bulk_data.verification_status == "verified":
                # Check if all 9 required documents are verified
                verified_docs = db.query(StudentDocument).filter(
                    StudentDocument.student_id == student.id,
                    StudentDocument.verification_status == 'verified'
                ).count()
                
                if verified_docs == 9:
                    student.documents_verified = True
                    verified_count += 1
            else:
                student.documents_verified = False
                verified_count += 1
    
    db.commit()
    
    return {"message": f"Verified {verified_count} students successfully"}

# Student Management Endpoints
class StudentCreate(BaseModel):
    enrollment_number: str
    first_name: str
    last_name: str
    email: str
    personal_email: str  # For sending credentials, not stored in database
    phone: Optional[str] = None
    school_id: Optional[int] = None
    department_id: Optional[int] = None
    course_id: Optional[int] = None
    semester: Optional[int] = 1
    batch: Optional[str] = None
    admission_year: Optional[int] = None
    gpa: Optional[float] = 0.00
    attendance_percentage: Optional[float] = 0.00
    password: str

class StudentUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    department_id: Optional[int] = None
    semester: Optional[int] = None
    batch: Optional[str] = None
    admission_year: Optional[int] = None
    gpa: Optional[float] = None
    attendance_percentage: Optional[float] = None

@router.post("/students/create")
def create_student(
    student_data: StudentCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new student"""
    # Verify registrar access
    registrar = get_registrar_user(current_user, db)
    
    # Check if enrollment number already exists
    existing_student = db.query(Student).filter(Student.enrollment_number == student_data.enrollment_number).first()
    if existing_student:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Enrollment number already exists"
        )
    
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == student_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already exists"
        )
    
    try:
        # Create user account
        hashed_password = get_password_hash(student_data.password)
        user = User(
            email=student_data.email,
            password_hash=hashed_password,
            is_active=True,
            role="student"
        )
        db.add(user)
        db.flush()  # Get the user ID
        
        # Create student profile
        student = Student(
            user_id=user.id,
            enrollment_number=student_data.enrollment_number,
            first_name=student_data.first_name,
            last_name=student_data.last_name,
            phone=student_data.phone,
            school_id=student_data.school_id,
            department_id=student_data.department_id,
            course_id=student_data.course_id,
            semester=student_data.semester,
            batch=student_data.batch,
            admission_year=student_data.admission_year,
            gpa=student_data.gpa,
            attendance_percentage=student_data.attendance_percentage
        )
        db.add(student)
        db.commit()
        
        # Send credentials via email if email service is configured
        email_sent = False
        if email_service.is_configured():
            import asyncio
            student_name = f"{student_data.first_name} {student_data.last_name}"
            try:
                # Run async email sending in sync context
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                email_sent = loop.run_until_complete(
                    email_service.send_credentials_email(
                        to_email=student_data.personal_email,
                        student_name=student_name,
                        login_email=student_data.email,
                        password=student_data.password
                    )
                )
                loop.close()
            except Exception as e:
                print(f"Failed to send email: {str(e)}")
                email_sent = False
        
        response_message = "Student created successfully"
        if email_sent:
            response_message += " and credentials sent to personal email"
        elif email_service.is_configured():
            response_message += " but failed to send credentials email"
        else:
            response_message += " (email service not configured)"
            
        return {"message": response_message, "student_id": student.id, "email_sent": email_sent}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating student: {str(e)}"
        )

@router.put("/students/{student_id}")
def update_student(
    student_id: int,
    student_data: StudentUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update student information"""
    # Verify registrar access
    registrar = get_registrar_user(current_user, db)
    
    # Get student
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )
    
    try:
        # Update student fields
        update_data = student_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(student, field, value)
        
        db.commit()
        return {"message": "Student updated successfully"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating student: {str(e)}"
        )

@router.delete("/students/{student_id}")
def delete_student(
    student_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a student"""
    # Verify registrar access
    registrar = get_registrar_user(current_user, db)
    
    # Get student
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )
    
    try:
        # Get associated user
        user = db.query(User).filter(User.id == student.user_id).first()
        
        # Delete student documents first
        db.query(StudentDocument).filter(StudentDocument.student_id == student_id).delete()
        
        # Delete student
        db.delete(student)
        
        # Delete user if exists
        if user:
            db.delete(user)
        
        db.commit()
        return {"message": "Student deleted successfully"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting student: {str(e)}"
        )

@router.get("/departments")
def get_departments(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all departments for dropdown"""
    # Verify registrar access
    registrar = get_registrar_user(current_user, db)
    
    departments = db.query(Department).all()
    return [{"id": dept.id, "name": dept.name} for dept in departments]

# Faculty Management Endpoints
class FacultyCreate(BaseModel):
    employee_id: str
    first_name: str
    last_name: str
    email: str
    personal_email: str  # For sending credentials, not stored in database
    phone: Optional[str] = None
    designation: str
    department_id: Optional[int] = None
    password: str

@router.post("/faculty")
def create_faculty(
    faculty_data: FacultyCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new faculty"""
    # Verify registrar access
    registrar = get_registrar_user(current_user, db)
    
    # Check if employee ID already exists
    existing_faculty = db.query(Faculty).filter(Faculty.employee_id == faculty_data.employee_id).first()
    if existing_faculty:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Employee ID already exists"
        )
    
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == faculty_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already exists"
        )
    
    try:
        # Create user account
        hashed_password = get_password_hash(faculty_data.password)
        user = User(
            email=faculty_data.email,
            password_hash=hashed_password,
            is_active=True,
            role="faculty"
        )
        db.add(user)
        db.flush()  # Get the user ID
        
        # Create faculty profile
        faculty = Faculty(
            user_id=user.id,
            employee_id=faculty_data.employee_id,
            first_name=faculty_data.first_name,
            last_name=faculty_data.last_name,
            phone=faculty_data.phone,
            designation=faculty_data.designation,
            department_id=faculty_data.department_id
        )
        db.add(faculty)
        db.commit()
        
        # Send credentials via email if email service is configured
        email_sent = False
        if email_service.is_configured():
            import asyncio
            faculty_name = f"{faculty_data.first_name} {faculty_data.last_name}"
            try:
                # Run async email sending in sync context
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                email_sent = loop.run_until_complete(
                    email_service.send_faculty_credentials_email(
                        to_email=faculty_data.personal_email,
                        faculty_name=faculty_name,
                        login_email=faculty_data.email,
                        password=faculty_data.password
                    )
                )
                loop.close()
            except Exception as e:
                print(f"Failed to send email: {str(e)}")
                email_sent = False
        
        response_message = "Faculty created successfully"
        if email_sent:
            response_message += " and credentials sent to personal email"
        elif email_service.is_configured():
            response_message += " but failed to send credentials email"
        else:
            response_message += " (email service not configured)"
            
        return {"message": response_message, "faculty_id": faculty.id, "email_sent": email_sent}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating faculty: {str(e)}"
        )

@router.get("/faculty")
def get_faculty(
    skip: int = Query(0, ge=0),
    limit: int = Query(1000, ge=1, le=1000),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all faculty for registrar"""
    # Verify registrar access
    registrar = get_registrar_user(current_user, db)
    
    faculty_list = db.query(Faculty).offset(skip).limit(limit).all()
    
    result = []
    for faculty_member in faculty_list:
        result.append({
            "id": faculty_member.id,
            "employee_id": faculty_member.employee_id,
            "first_name": faculty_member.first_name,
            "last_name": faculty_member.last_name,
            "email": faculty_member.user.email if faculty_member.user else "",
            "phone": faculty_member.phone,
            "designation": faculty_member.designation,
            "department": faculty_member.department.name if faculty_member.department else "",
            "department_id": faculty_member.department_id,
            "created_at": faculty_member.created_at.isoformat() if faculty_member.created_at else None
        })
    
    return result

@router.get("/documents/download/{document_id}")
def download_document(
    document_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Download a document (Registrar only)"""
    # Verify registrar access
    registrar = get_registrar_user(current_user, db)
    
    # Get document
    document = db.query(StudentDocument).filter(StudentDocument.id == document_id).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Use file path as stored (relative to backend working directory)
    file_path = document.file_path
    
    # Check if file exists
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File not found on server: {file_path}"
        )
    
    return FileResponse(
        file_path,
        media_type='application/octet-stream',
        filename=document.file_name
    )
