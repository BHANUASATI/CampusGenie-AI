"""
Personal Task Routes
====================
Full CRUD operations for personal tasks with calendar integration
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import json

from database import get_db
from dependencies import get_current_active_user
from models import User
from calendar_models import PersonalTask, TaskCategory, TaskStatus, Priority
from pydantic import BaseModel, Field
from enum import Enum

router = APIRouter(prefix="/personal-tasks", tags=["personal-tasks"])

# Pydantic models for request/response
class TaskCategoryEnum(str, Enum):
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

class TaskStatusEnum(str, Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    ARCHIVED = "archived"

class PriorityEnum(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class PersonalTaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: TaskCategoryEnum = TaskCategoryEnum.OTHER
    priority: PriorityEnum = PriorityEnum.MEDIUM
    due_date: Optional[datetime] = None
    start_date: Optional[datetime] = None
    parent_task_id: Optional[int] = None
    tags: Optional[List[str]] = []
    reminder_enabled: bool = False
    reminder_date: Optional[datetime] = None
    progress: int = 0
    estimated_hours: Optional[int] = None
    is_recurring: bool = False
    recurrence_pattern: Optional[str] = None
    recurrence_end_date: Optional[datetime] = None

class PersonalTaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    category: Optional[TaskCategoryEnum] = None
    status: Optional[TaskStatusEnum] = None
    priority: Optional[PriorityEnum] = None
    due_date: Optional[datetime] = None
    start_date: Optional[datetime] = None
    completed_date: Optional[datetime] = None
    parent_task_id: Optional[int] = None
    position: Optional[int] = None
    tags: Optional[List[str]] = None
    reminder_enabled: Optional[bool] = None
    reminder_date: Optional[datetime] = None
    reminder_sent: Optional[bool] = None
    progress: Optional[int] = Field(None, ge=0, le=100)
    estimated_hours: Optional[int] = None
    actual_hours: Optional[int] = None
    is_recurring: Optional[bool] = None
    recurrence_pattern: Optional[str] = None
    recurrence_end_date: Optional[datetime] = None

class PersonalTaskResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    category: str
    status: str
    priority: str
    due_date: Optional[datetime]
    start_date: Optional[datetime]
    completed_date: Optional[datetime]
    parent_task_id: Optional[int]
    position: int
    tags: Optional[List[str]]
    reminder_enabled: bool
    reminder_date: Optional[datetime]
    reminder_sent: bool
    progress: int
    estimated_hours: Optional[int]
    actual_hours: Optional[int]
    is_recurring: bool
    recurrence_pattern: Optional[str]
    recurrence_end_date: Optional[datetime]
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class TaskStats(BaseModel):
    total: int
    completed: int
    in_progress: int
    todo: int
    overdue: int
    completion_rate: float

# CRUD Operations

@router.post("/", response_model=PersonalTaskResponse)
def create_task(
    task_data: PersonalTaskCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new personal task"""
    # Manual validation
    if not task_data.title or len(task_data.title) > 255:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Title must be between 1 and 255 characters"
        )
    
    if not 0 <= task_data.progress <= 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Progress must be between 0 and 100"
        )
    
    # Convert tags to JSON
    tags_json = json.dumps(task_data.tags) if task_data.tags else None
    
    # Handle parent task validation
    if task_data.parent_task_id:
        parent_task = db.query(PersonalTask).filter(
            PersonalTask.id == task_data.parent_task_id,
            PersonalTask.user_id == current_user.id
        ).first()
        if not parent_task:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Parent task not found or doesn't belong to user"
            )
    
    # Create task
    db_task = PersonalTask(
        title=task_data.title,
        description=task_data.description,
        category=task_data.category.value,
        status=TaskStatus.TODO.value,
        priority=task_data.priority.value,
        due_date=task_data.due_date,
        start_date=task_data.start_date,
        parent_task_id=task_data.parent_task_id,
        tags=tags_json,
        reminder_enabled=task_data.reminder_enabled,
        reminder_date=task_data.reminder_date,
        progress=task_data.progress,
        estimated_hours=task_data.estimated_hours,
        is_recurring=task_data.is_recurring,
        recurrence_pattern=task_data.recurrence_pattern,
        recurrence_end_date=task_data.recurrence_end_date,
        user_id=current_user.id
    )
    
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    
    return db_task

@router.get("/", response_model=List[PersonalTaskResponse])
def get_tasks(
    status: Optional[str] = None,
    category: Optional[str] = None,
    priority: Optional[str] = None,
    parent_task_id: Optional[int] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get personal tasks with filtering and search"""
    query = db.query(PersonalTask).filter(PersonalTask.user_id == current_user.id)
    
    # Apply filters
    if status:
        query = query.filter(PersonalTask.status == status)
    if category:
        query = query.filter(PersonalTask.category == category)
    if priority:
        query = query.filter(PersonalTask.priority == priority)
    if parent_task_id is not None:
        query = query.filter(PersonalTask.parent_task_id == parent_task_id)
    if search:
        query = query.filter(PersonalTask.title.contains(search))
    
    # Order by priority and due date
    query = query.order_by(
        PersonalTask.priority.desc(),
        PersonalTask.due_date.asc().nulls_last(),
        PersonalTask.created_at.desc()
    )
    
    tasks = query.offset(skip).limit(limit).all()
    return tasks

@router.get("/stats", response_model=TaskStats)
def get_task_stats(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get task statistics"""
    total = db.query(PersonalTask).filter(PersonalTask.user_id == current_user.id).count()
    completed = db.query(PersonalTask).filter(
        PersonalTask.user_id == current_user.id,
        PersonalTask.status == TaskStatus.COMPLETED.value
    ).count()
    in_progress = db.query(PersonalTask).filter(
        PersonalTask.user_id == current_user.id,
        PersonalTask.status == TaskStatus.IN_PROGRESS.value
    ).count()
    todo = db.query(PersonalTask).filter(
        PersonalTask.user_id == current_user.id,
        PersonalTask.status == TaskStatus.TODO.value
    ).count()
    
    # Count overdue tasks
    now = datetime.utcnow()
    overdue = db.query(PersonalTask).filter(
        PersonalTask.user_id == current_user.id,
        PersonalTask.due_date < now,
        PersonalTask.status != TaskStatus.COMPLETED.value
    ).count()
    
    completion_rate = (completed / total * 100) if total > 0 else 0.0
    
    return TaskStats(
        total=total,
        completed=completed,
        in_progress=in_progress,
        todo=todo,
        overdue=overdue,
        completion_rate=completion_rate
    )

@router.get("/{task_id}", response_model=PersonalTaskResponse)
def get_task(
    task_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific task by ID"""
    task = db.query(PersonalTask).filter(
        PersonalTask.id == task_id,
        PersonalTask.user_id == current_user.id
    ).first()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    return task

@router.put("/{task_id}", response_model=PersonalTaskResponse)
def update_task(
    task_id: int,
    task_update: PersonalTaskUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a task"""
    task = db.query(PersonalTask).filter(
        PersonalTask.id == task_id,
        PersonalTask.user_id == current_user.id
    ).first()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Update fields
    update_data = task_update.dict(exclude_unset=True)
    
    # Handle tags conversion
    if 'tags' in update_data and update_data['tags'] is not None:
        update_data['tags'] = json.dumps(update_data['tags'])
    
    # Handle status change to completed
    if 'status' in update_data and update_data['status'] == TaskStatusEnum.COMPLETED.value:
        update_data['completed_date'] = datetime.utcnow()
        update_data['progress'] = 100
    
    for field, value in update_data.items():
        setattr(task, field, value)
    
    db.commit()
    db.refresh(task)
    
    return task

@router.delete("/{task_id}")
def delete_task(
    task_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a task"""
    task = db.query(PersonalTask).filter(
        PersonalTask.id == task_id,
        PersonalTask.user_id == current_user.id
    ).first()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    db.delete(task)
    db.commit()
    
    return {"message": "Task deleted successfully"}

@router.post("/{task_id}/complete")
def complete_task(
    task_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Mark a task as completed"""
    task = db.query(PersonalTask).filter(
        PersonalTask.id == task_id,
        PersonalTask.user_id == current_user.id
    ).first()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    task.status = TaskStatus.COMPLETED.value
    task.completed_date = datetime.utcnow()
    task.progress = 100
    
    db.commit()
    db.refresh(task)
    
    return task

@router.post("/{task_id}/uncomplete")
def uncomplete_task(
    task_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Mark a completed task as not completed"""
    task = db.query(PersonalTask).filter(
        PersonalTask.id == task_id,
        PersonalTask.user_id == current_user.id
    ).first()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    task.status = TaskStatus.TODO.value
    task.completed_date = None
    task.progress = 0
    
    db.commit()
    db.refresh(task)
    
    return task

@router.post("/{task_id}/progress")
def update_progress(
    task_id: int,
    progress: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update task progress"""
    task = db.query(PersonalTask).filter(
        PersonalTask.id == task_id,
        PersonalTask.user_id == current_user.id
    ).first()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Validate progress range
    if not 0 <= progress <= 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Progress must be between 0 and 100"
        )
    
    task.progress = progress
    
    # Auto-complete if progress is 100
    if progress == 100:
        task.status = TaskStatus.COMPLETED.value
        task.completed_date = datetime.utcnow()
    elif progress > 0 and task.status == TaskStatus.TODO.value:
        task.status = TaskStatus.IN_PROGRESS.value
    
    db.commit()
    db.refresh(task)
    
    return task