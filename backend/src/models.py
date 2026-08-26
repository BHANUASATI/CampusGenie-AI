from sqlalchemy import Column, Integer, String, DateTime, Boolean, Enum, Text, ForeignKey, DECIMAL, TIMESTAMP
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base
import enum
from datetime import datetime

# Enums matching database schema
class UserRole(str, enum.Enum):
    STUDENT = "student"
    FACULTY = "faculty"
    ADMIN = "admin"
    REGISTRAR = "registrar"

class FacultyRole(str, enum.Enum):
    REGISTRAR = "registrar"
    PROFESSOR = "professor"
    ASSOCIATE_PROFESSOR = "associate_professor"
    ASSISTANT_PROFESSOR = "assistant_professor"
    LECTURER = "lecturer"
    LAB_INSTRUCTOR = "lab_instructor"
    ADMIN_STAFF = "admin_staff"

class DepartmentType(str, enum.Enum):
    COMPUTER_SCIENCE = "computer_science"
    MECHANICAL = "mechanical"
    ELECTRICAL = "electrical"
    CIVIL = "civil"
    CHEMICAL = "chemical"
    ELECTRONICS = "electronics"
    BUSINESS = "business"
    PHYSICS = "physics"
    CHEMISTRY = "chemistry"
    MATHEMATICS = "mathematics"

class SchoolType(str, enum.Enum):
    ENGINEERING_TECHNOLOGY = "engineering_technology"
    MANAGEMENT_STUDIES = "management_studies"
    SCIENCES = "sciences"
    ARTS_HUMANITIES = "arts_humanities"
    MEDICINE = "medicine"
    LAW = "law"
    EDUCATION = "education"

class VerificationStatus(str, enum.Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"

class TaskType(str, enum.Enum):
    ASSIGNMENT = "assignment"
    PROJECT = "project"
    EXAM = "exam"
    GENERAL = "general"

class TaskPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class MessageSenderType(str, enum.Enum):
    USER = "user"
    AI = "ai"

class TaskStatus(str, enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    CLOSED = "closed"

class SubmissionStatus(str, enum.Enum):
    NOT_SUBMITTED = "not_submitted"
    SUBMITTED = "submitted"
    LATE = "late"
    GRADED = "graded"

class NotificationType(str, enum.Enum):
    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"

class Gender(str, enum.Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"

# Models matching database schema
class School(Base):
    __tablename__ = "schools"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    code = Column(String(10), unique=True, nullable=False)
    type = Column(String(50), nullable=False)
    description = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    departments = relationship("Department", back_populates="school")

class Department(Base):
    __tablename__ = "departments"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(10), nullable=False)
    type = Column(String(50), nullable=False)
    description = Column(Text)
    school_id = Column(Integer, ForeignKey("schools.id"), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    school = relationship("School", back_populates="departments")
    faculties = relationship("Faculty", back_populates="department")
    students = relationship("Student", back_populates="department")
    tasks = relationship("Task", back_populates="department")
    courses = relationship("Course", back_populates="department")

class Course(Base):
    __tablename__ = "courses"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(10), unique=True, nullable=False)
    type = Column(String(50), nullable=False)
    description = Column(Text)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    duration_years = Column(Integer, default=4)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    department = relationship("Department", back_populates="courses")

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole, values_callable=lambda x: [e.value for e in x]), nullable=False)
    is_active = Column(Boolean, default=True)
    email_verified = Column(Boolean, default=False)
    last_login = Column(TIMESTAMP, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    student = relationship("Student", back_populates="user", uselist=False)
    faculty = relationship("Faculty", back_populates="user", uselist=False)
    admin = relationship("Admin", back_populates="user", uselist=False)
    audit_logs = relationship("AuditLog", back_populates="user")
    notifications = relationship("Notification", back_populates="user")
    
    # Calendar and personal tasks relationships (added after calendar_models to avoid circular imports)
    # These are loaded dynamically to avoid circular dependency issues

class Faculty(Base):
    __tablename__ = "faculties"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    employee_id = Column(String(50), unique=True, nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    phone = Column(String(20))
    email = Column(String(255))
    specialization = Column(String(100))
    designation = Column(String(100))
    role = Column(String(50), nullable=False, default="lecturer")
    department_id = Column(Integer, ForeignKey("departments.id"))
    is_active = Column(Boolean, default=True)
    
    # Enhanced permissions based on role
    can_verify_documents = Column(Boolean, default=True)
    can_assign_tasks = Column(Boolean, default=True)
    can_grade_submissions = Column(Boolean, default=True)
    can_manage_students = Column(Boolean, default=False)
    can_generate_reports = Column(Boolean, default=False)
    can_access_all_departments = Column(Boolean, default=False)
    
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="faculty")
    department = relationship("Department", back_populates="faculties")
    assigned_tasks = relationship("Task", back_populates="faculty")
    verified_documents = relationship("StudentDocument", back_populates="verifier_faculty", foreign_keys="StudentDocument.verified_by")
    graded_submissions = relationship("TaskSubmission", back_populates="grader_faculty", foreign_keys="TaskSubmission.graded_by")

class Admin(Base):
    __tablename__ = "admins"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    phone = Column(String(20))
    department_id = Column(Integer, ForeignKey("departments.id"))
    permissions = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="admin")
    department = relationship("Department")

class Student(Base):
    __tablename__ = "students"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    enrollment_number = Column(String(50), unique=True, nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    phone = Column(String(20))
    date_of_birth = Column(DateTime)
    gender = Column(Enum(Gender, values_callable=lambda x: [e.value for e in x]))
    blood_group = Column(String(5))
    address = Column(Text)
    city = Column(String(100))
    state = Column(String(100))
    pincode = Column(String(10))
    school_id = Column(Integer, ForeignKey("schools.id"))
    department_id = Column(Integer, ForeignKey("departments.id"))
    course_id = Column(Integer, ForeignKey("courses.id"))
    semester = Column(Integer, default=1)
    batch = Column(String(20))
    admission_year = Column(Integer)
    gpa = Column(DECIMAL(3,2), default=0.00)
    attendance_percentage = Column(DECIMAL(5,2), default=0.00)
    documents_verified = Column(Boolean, default=False)
    verification_status = Column(Enum(VerificationStatus, values_callable=lambda x: [e.value for e in x]), default=VerificationStatus.PENDING)
    verified_by = Column(Integer, ForeignKey("faculties.id"))
    verified_at = Column(TIMESTAMP, nullable=True)
    profile_image = Column(String(500), nullable=True)  # URL to profile image
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="student")
    school = relationship("School")
    department = relationship("Department", back_populates="students")
    course = relationship("Course")
    verifier = relationship("Faculty", foreign_keys=[verified_by], overlaps="verified_documents")
    documents = relationship("StudentDocument", back_populates="student")
    tasks = relationship("Task", back_populates="student")
    submissions = relationship("TaskSubmission", back_populates="student")

class DocumentType(Base):
    __tablename__ = "document_types"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    is_required = Column(Boolean, default=True)
    max_file_size_mb = Column(Integer, default=5)
    allowed_extensions = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    documents = relationship("StudentDocument", back_populates="document_type")

class StudentDocument(Base):
    __tablename__ = "student_documents"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    document_type_id = Column(Integer, ForeignKey("document_types.id"), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size_mb = Column(DECIMAL(8,2), nullable=False)
    file_extension = Column(String(10), nullable=False)
    upload_status = Column(String(20), default="uploaded")
    verification_status = Column(Enum(VerificationStatus, values_callable=lambda x: [e.value for e in x]), default=VerificationStatus.PENDING)
    verified_by = Column(Integer, ForeignKey("faculties.id"))
    verification_notes = Column(Text)
    rejection_reason = Column(Text)
    uploaded_at = Column(TIMESTAMP, server_default=func.now())
    verified_at = Column(TIMESTAMP, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    student = relationship("Student", back_populates="documents")
    document_type = relationship("DocumentType", back_populates="documents")
    verifier_faculty = relationship("Faculty", back_populates="verified_documents", foreign_keys=[verified_by])

class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    assigned_by = Column(Integer, ForeignKey("faculties.id"), nullable=False)
    assigned_to = Column(Integer, ForeignKey("students.id"))
    department_id = Column(Integer, ForeignKey("departments.id"))
    task_type = Column(Enum(TaskType, values_callable=lambda x: [e.value for e in x]), default=TaskType.GENERAL)
    priority = Column(Enum(TaskPriority, values_callable=lambda x: [e.value for e in x]), default=TaskPriority.MEDIUM)
    due_date = Column(TIMESTAMP, nullable=True)
    max_marks = Column(Integer, default=100)
    status = Column(Enum(TaskStatus, values_callable=lambda x: [e.value for e in x]), default=TaskStatus.DRAFT)
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    faculty = relationship("Faculty", back_populates="assigned_tasks", foreign_keys=[assigned_by])
    student = relationship("Student", back_populates="tasks", foreign_keys=[assigned_to])
    department = relationship("Department", back_populates="tasks")
    submissions = relationship("TaskSubmission", back_populates="task")

class TaskSubmission(Base):
    __tablename__ = "task_submissions"
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    file_name = Column(String(255))
    file_path = Column(String(500))
    submission_text = Column(Text)
    submission_status = Column(Enum(SubmissionStatus, values_callable=lambda x: [e.value for e in x]), default=SubmissionStatus.NOT_SUBMITTED)
    marks_obtained = Column(Integer)
    feedback = Column(Text)
    graded_by = Column(Integer, ForeignKey("faculties.id"))
    submitted_at = Column(TIMESTAMP, nullable=True)
    graded_at = Column(TIMESTAMP, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    task = relationship("Task", back_populates="submissions")
    student = relationship("Student", back_populates="submissions")
    grader_faculty = relationship("Faculty", back_populates="graded_submissions", foreign_keys=[graded_by])

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String(100), nullable=False)
    table_name = Column(String(50))
    record_id = Column(Integer)
    old_values = Column(Text)
    new_values = Column(Text)
    ip_address = Column(String(45))
    user_agent = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="audit_logs")

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(Enum(NotificationType, values_callable=lambda x: [e.value for e in x]), default=NotificationType.INFO)
    is_read = Column(Boolean, default=False)
    action_url = Column(String(500))
    created_at = Column(TIMESTAMP, server_default=func.now())
    expires_at = Column(TIMESTAMP, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="notifications")

class AIConversation(Base):
    __tablename__ = "ai_conversations"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User")
    messages = relationship("AIMessage", back_populates="conversation", cascade="all, delete-orphan")

class AIMessage(Base):
    __tablename__ = "ai_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("ai_conversations.id"), nullable=False)
    content = Column(Text, nullable=False)
    sender_type = Column(Enum(MessageSenderType, values_callable=lambda x: [e.value for e in x]), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    
    # Relationships
    conversation = relationship("AIConversation", back_populates="messages")
