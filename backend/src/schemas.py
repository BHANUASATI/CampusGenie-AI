from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from models import UserRole, VerificationStatus, TaskType, TaskPriority, TaskStatus, SubmissionStatus, NotificationType, Gender, MessageSenderType

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    role: UserRole

class UserCreate(UserBase):
    password: str
    
    @validator('email')
    def validate_university_email(cls, v):
        from config import settings
        if not v.endswith(f"@{settings.UNIVERSITY_EMAIL_DOMAIN}"):
            raise ValueError(f"Email must be from {settings.UNIVERSITY_EMAIL_DOMAIN} domain")
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    selected_role: Optional[str] = None
    
    @validator('email')
    def validate_university_email(cls, v):
        from config import settings
        if not v.endswith(f"@{settings.UNIVERSITY_EMAIL_DOMAIN}"):
            raise ValueError(f"Email must be from {settings.UNIVERSITY_EMAIL_DOMAIN} domain")
        return v

class UserResponse(UserBase):
    id: int
    is_active: bool
    email_verified: bool
    last_login: Optional[datetime]
    created_at: datetime
    
    class Config:
        from_attributes = True

# School Schemas
class SchoolBase(BaseModel):
    name: str
    code: str
    type: str
    description: Optional[str] = None

class SchoolCreate(SchoolBase):
    pass

class SchoolResponse(SchoolBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Department Schemas
class DepartmentBase(BaseModel):
    name: str
    code: str
    type: str
    description: Optional[str] = None
    school_id: int

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentResponse(DepartmentBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class DepartmentWithSchool(DepartmentResponse):
    school: SchoolResponse

# Course Schemas
class CourseBase(BaseModel):
    name: str
    code: str
    type: str
    description: Optional[str] = None
    department_id: int
    duration_years: int = 4

class CourseCreate(CourseBase):
    pass

class CourseResponse(CourseBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class CourseWithDepartment(CourseResponse):
    department: DepartmentWithSchool

# Student Schemas
class StudentBase(BaseModel):
    enrollment_number: str
    first_name: str
    last_name: str
    phone: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    gender: Optional[Gender] = None
    blood_group: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    school_id: Optional[int] = None
    department_id: Optional[int] = None
    course_id: Optional[int] = None
    semester: int = 1
    batch: Optional[str] = None
    admission_year: Optional[int] = None

class StudentCreate(StudentBase):
    email: EmailStr
    password: str
    
    @validator('email')
    def validate_university_email(cls, v):
        from config import settings
        if not v.endswith(f"@{settings.UNIVERSITY_EMAIL_DOMAIN}"):
            raise ValueError(f"Email must be from {settings.UNIVERSITY_EMAIL_DOMAIN} domain")
        return v

class StudentUpdate(BaseModel):
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None

class StudentResponse(StudentBase):
    id: int
    user_id: int
    gpa: Decimal
    attendance_percentage: Decimal
    documents_verified: bool
    verification_status: VerificationStatus
    verified_by: Optional[int] = None
    verified_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class StudentProfileResponse(StudentResponse):
    user: UserResponse
    school: Optional[SchoolResponse] = None
    department: Optional[DepartmentResponse] = None
    course: Optional[CourseResponse] = None

# Faculty Schemas
class FacultyBase(BaseModel):
    employee_id: str
    first_name: str
    last_name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    specialization: Optional[str] = None
    designation: Optional[str] = None
    department_id: Optional[int] = None
    can_verify_documents: bool = True
    can_assign_tasks: bool = True

class FacultyCreate(FacultyBase):
    email: EmailStr
    password: str
    
    @validator('email')
    def validate_university_email(cls, v):
        from config import settings
        if not v.endswith(f"@{settings.UNIVERSITY_EMAIL_DOMAIN}"):
            raise ValueError(f"Email must be from {settings.UNIVERSITY_EMAIL_DOMAIN} domain")
        return v

class FacultyUpdate(BaseModel):
    phone: Optional[str] = None
    specialization: Optional[str] = None
    designation: Optional[str] = None

class FacultyResponse(FacultyBase):
    id: int
    user_id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class FacultyProfileResponse(FacultyResponse):
    user: UserResponse
    department: Optional[DepartmentResponse] = None

# Admin Schemas
class AdminBase(BaseModel):
    first_name: str
    last_name: str
    phone: Optional[str] = None
    department_id: Optional[int] = None
    permissions: Optional[str] = None

class AdminCreate(AdminBase):
    email: EmailStr
    password: str
    
    @validator('email')
    def validate_university_email(cls, v):
        from config import settings
        if not v.endswith(f"@{settings.UNIVERSITY_EMAIL_DOMAIN}"):
            raise ValueError(f"Email must be from {settings.UNIVERSITY_EMAIL_DOMAIN} domain")
        return v

class AdminResponse(AdminBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class AdminProfileResponse(AdminResponse):
    user: UserResponse
    department: Optional[DepartmentResponse] = None

# Document Type Schemas
class DocumentTypeBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_required: bool = True
    max_file_size_mb: int = 5
    allowed_extensions: Optional[str] = None

class DocumentTypeCreate(DocumentTypeBase):
    pass

class DocumentTypeResponse(DocumentTypeBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Student Document Schemas
class StudentDocumentBase(BaseModel):
    document_type_id: int
    file_name: str
    file_path: str
    file_size_mb: Decimal
    file_extension: str

class StudentDocumentCreate(StudentDocumentBase):
    pass

class StudentDocumentResponse(StudentDocumentBase):
    id: int
    student_id: int
    upload_status: str
    verification_status: VerificationStatus
    verified_by: Optional[int] = None
    verification_notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    uploaded_at: datetime
    verified_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class StudentDocumentVerification(BaseModel):
    verification_status: VerificationStatus
    verification_notes: Optional[str] = None
    rejection_reason: Optional[str] = None

# Task Schemas
class TaskBase(BaseModel):
    title: str
    description: str
    assigned_to: Optional[int] = None
    department_id: Optional[int] = None
    task_type: TaskType = TaskType.GENERAL
    priority: TaskPriority = TaskPriority.MEDIUM
    due_date: Optional[datetime] = None
    max_marks: int = 100

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[TaskPriority] = None
    due_date: Optional[datetime] = None
    max_marks: Optional[int] = None
    status: Optional[TaskStatus] = None

class TaskResponse(TaskBase):
    id: int
    assigned_by: int
    status: TaskStatus
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class TaskDetailResponse(TaskResponse):
    assigned_by_faculty: Optional[FacultyProfileResponse] = None
    assigned_student: Optional[StudentProfileResponse] = None
    department: Optional[DepartmentResponse] = None

# Task Submission Schemas
class TaskSubmissionBase(BaseModel):
    submission_text: Optional[str] = None

class TaskSubmissionCreate(TaskSubmissionBase):
    pass

class TaskSubmissionUpdate(BaseModel):
    marks_obtained: Optional[int] = None
    feedback: Optional[str] = None

class TaskSubmissionResponse(TaskSubmissionBase):
    id: int
    task_id: int
    student_id: int
    file_name: Optional[str] = None
    file_path: Optional[str] = None
    submission_status: SubmissionStatus
    marks_obtained: Optional[int] = None
    feedback: Optional[str] = None
    graded_by: Optional[int] = None
    submitted_at: Optional[datetime] = None
    graded_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class TaskSubmissionGrade(BaseModel):
    marks_obtained: int
    feedback: Optional[str] = None

# Audit Log Schemas
class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    action: str
    table_name: Optional[str] = None
    record_id: Optional[int] = None
    old_values: Optional[str] = None
    new_values: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

# Notification Schemas
class NotificationBase(BaseModel):
    title: str
    message: str
    notification_type: NotificationType = NotificationType.INFO
    action_url: Optional[str] = None
    expires_at: Optional[datetime] = None

class NotificationCreate(NotificationBase):
    user_id: int

class NotificationResponse(NotificationBase):
    id: int
    user_id: int
    is_read: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# Dashboard Stats Schemas
class DashboardStats(BaseModel):
    total_students: int
    total_faculty: int
    total_admins: int
    total_departments: int
    total_documents: int
    total_tasks: int
    pending_verifications: int
    active_users: int

class StudentDashboardStats(BaseModel):
    total_documents: int
    verified_documents: int
    pending_documents: int
    rejected_documents: int
    total_tasks: int
    completed_tasks: int
    pending_tasks: int
    gpa: Decimal
    attendance_percentage: Decimal

class FacultyDashboardStats(BaseModel):
    total_students: int
    total_tasks_assigned: int
    pending_verifications: int
    submissions_to_grade: int
    active_tasks: int
    can_verify_documents: bool
    can_assign_tasks: bool

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class TokenData(BaseModel):
    email: Optional[str] = None

# AI Assistant Schemas
class AIConversationCreate(BaseModel):
    title: Optional[str] = None

class AIConversationResponse(BaseModel):
    id: int
    title: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class AIMessageCreate(BaseModel):
    content: str

class AIMessageResponse(BaseModel):
    id: int
    content: str
    sender_type: MessageSenderType
    created_at: datetime
    # Rich AI metadata — only populated on AI messages, None on user messages
    confidence: Optional[float] = None
    sources: Optional[List[dict]] = None
    follow_up_questions: Optional[List[str]] = None
    intent_detected: Optional[str] = None

    class Config:
        from_attributes = True

class AIConversationDetailResponse(AIConversationResponse):
    messages: List[AIMessageResponse]

class AIChatResponse(BaseModel):
    user_message: AIMessageResponse
    ai_message: AIMessageResponse
    # Updated conversation title (set from first message)
    conversation_title: Optional[str] = None

class AIQuickChat(BaseModel):
    content: str
