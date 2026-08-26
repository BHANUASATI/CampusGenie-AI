from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum, Boolean, JSON
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime
import enum

class EventType(enum.Enum):
    ACADEMIC = "academic"
    PERSONAL = "personal"

class EventStatus(enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class Priority(enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class RiskLevel(enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class TaskCategory(enum.Enum):
    ASSIGNMENT = "assignment"
    PROJECT = "project"
    STUDY = "study"
    EXAM = "exam"
    MEETING = "meeting"
    PERSONAL = "personal"
    WORK = "work"
    HEALTH = "health"
    FINANCE = "finance"
    OTHER = "other"

class TaskStatus(enum.Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    ARCHIVED = "archived"

class CalendarEvent(Base):
    __tablename__ = "calendar_events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    event_type = Column(Enum(EventType), nullable=False)
    status = Column(Enum(EventStatus), default=EventStatus.PENDING)
    priority = Column(Enum(Priority), default=Priority.MEDIUM)
    risk_level = Column(Enum(RiskLevel), default=RiskLevel.LOW)
    
    # Date and time
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime)
    alert_date = Column(DateTime)  # When to send alert
    
    # Location and category
    location = Column(String(255))
    category = Column(String(100))
    
    # Alert settings
    alert_message = Column(Text)
    alert_enabled = Column(Boolean, default=False)
    alert_sent = Column(Boolean, default=False)
    
    # Email notification settings
    notification_email = Column(String(255))  # Custom email for notifications
    notification_time = Column(String(10))  # Time in HH:MM format
    email_notification_enabled = Column(Boolean, default=False)
    
    # Task integration
    task_id = Column(Integer, ForeignKey("personal_tasks.id"), nullable=True)
    
    # User relationship (defined as simple FK to avoid circular imports)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Simple relationship to PersonalTask without back_populates to avoid circular imports
    task = relationship("PersonalTask", foreign_keys=[task_id])
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class PersonalTask(Base):
    __tablename__ = "personal_tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Task categorization
    category = Column(Enum(TaskCategory), default=TaskCategory.OTHER)
    status = Column(Enum(TaskStatus), default=TaskStatus.TODO)
    priority = Column(Enum(Priority), default=Priority.MEDIUM)
    
    # Dates
    due_date = Column(DateTime)
    start_date = Column(DateTime)
    completed_date = Column(DateTime)
    
    # Task organization
    parent_task_id = Column(Integer, ForeignKey("personal_tasks.id"), nullable=True)
    position = Column(Integer, default=0)  # For ordering subtasks
    tags = Column(JSON)  # Array of tag strings
    
    # Reminder settings
    reminder_enabled = Column(Boolean, default=False)
    reminder_date = Column(DateTime)
    reminder_sent = Column(Boolean, default=False)
    
    # Completion tracking
    progress = Column(Integer, default=0)  # 0-100 percentage
    estimated_hours = Column(Integer)
    actual_hours = Column(Integer)
    
    # Recurrence
    is_recurring = Column(Boolean, default=False)
    recurrence_pattern = Column(String(50))  # daily, weekly, monthly, etc.
    recurrence_end_date = Column(DateTime)
    
    # User assignment
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    parent_task = relationship("PersonalTask", remote_side=[id], backref="subtasks")
