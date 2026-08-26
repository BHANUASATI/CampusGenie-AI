from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timedelta
from typing import List, Optional
from database import get_db
from calendar_models import CalendarEvent, EventType, EventStatus, Priority, RiskLevel, PersonalTask
from calendar_schemas import CalendarEventCreate, CalendarEventUpdate, CalendarEventResponse, CalendarEventList, CalendarStats
from dependencies import get_current_active_user, get_current_student, get_current_faculty, get_current_admin
from models import User

router = APIRouter(prefix="/calendar", tags=["calendar"])

@router.get("/events", response_model=CalendarEventList)
def get_calendar_events(
    event_type: Optional[EventType] = Query(None, description="Filter by event type"),
    status: Optional[EventStatus] = Query(None, description="Filter by status"),
    priority: Optional[Priority] = Query(None, description="Filter by priority"),
    risk_level: Optional[RiskLevel] = Query(None, description="Filter by risk level"),
    start_date: Optional[datetime] = Query(None, description="Filter events from this date"),
    end_date: Optional[datetime] = Query(None, description="Filter events until this date"),
    include_tasks: bool = Query(False, description="Include tasks as events"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get calendar events for the current user with optional filters."""
    query = db.query(CalendarEvent).filter(CalendarEvent.user_id == current_user.id)
    
    # Apply filters
    if event_type:
        query = query.filter(CalendarEvent.event_type == event_type)
    if status:
        query = query.filter(CalendarEvent.status == status)
    if priority:
        query = query.filter(CalendarEvent.priority == priority)
    if risk_level:
        query = query.filter(CalendarEvent.risk_level == risk_level)
    if start_date:
        query = query.filter(CalendarEvent.start_date >= start_date)
    if end_date:
        query = query.filter(CalendarEvent.start_date <= end_date)
    
    # Order by start_date
    query = query.order_by(CalendarEvent.start_date)
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    events = query.offset(skip).limit(limit).all()
    
    # Include tasks as events if requested
    if include_tasks:
        tasks = db.query(PersonalTask).filter(
            PersonalTask.user_id == current_user.id,
            PersonalTask.status != "archived",
            PersonalTask.status != "cancelled"
        ).all()
        
        # Convert tasks to event-like structures for calendar display
        for task in tasks:
            if task.due_date:
                # Create a dict that looks like an event
                task_event_dict = {
                    "id": f"task_{task.id}",  # Use prefix to distinguish from real events
                    "title": task.title,
                    "description": task.description,
                    "event_type": "personal",
                    "status": "pending" if task.status == "todo" else "in_progress" if task.status == "in_progress" else "completed",
                    "priority": task.priority,
                    "start_date": task.due_date,
                    "end_date": task.due_date,
                    "user_id": current_user.id,
                    "task_id": task.id,
                    "created_at": task.created_at,
                    "updated_at": task.updated_at,
                    "is_task": True  # Flag to identify as task
                }
                events.append(task_event_dict)
    
    return CalendarEventList(events=events, total=total)

@router.get("/events/{event_id}", response_model=CalendarEventResponse)
def get_calendar_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific calendar event."""
    event = db.query(CalendarEvent).filter(
        CalendarEvent.id == event_id,
        CalendarEvent.user_id == current_user.id
    ).first()
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    return event

@router.post("/events", response_model=CalendarEventResponse)
def create_calendar_event(
    event_data: CalendarEventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new calendar event."""
    event = CalendarEvent(
        user_id=current_user.id,
        **event_data.dict()
    )
    
    db.add(event)
    db.commit()
    db.refresh(event)
    
    return event

@router.put("/events/{event_id}", response_model=CalendarEventResponse)
def update_calendar_event(
    event_id: int,
    event_update: CalendarEventUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a calendar event."""
    event = db.query(CalendarEvent).filter(
        CalendarEvent.id == event_id,
        CalendarEvent.user_id == current_user.id
    ).first()
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    # Update fields
    update_data = event_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(event, field, value)
    
    db.commit()
    db.refresh(event)
    
    return event

@router.delete("/events/{event_id}")
def delete_calendar_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a calendar event."""
    event = db.query(CalendarEvent).filter(
        CalendarEvent.id == event_id,
        CalendarEvent.user_id == current_user.id
    ).first()
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    db.delete(event)
    db.commit()
    
    return {"message": "Event deleted successfully"}

@router.get("/academic-events", response_model=CalendarEventList)
def get_academic_events(
    month: Optional[int] = Query(None, ge=1, le=12, description="Filter by month (1-12)"),
    year: Optional[int] = Query(None, description="Filter by year"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_student)
):
    """Get academic calendar events for a student."""
    query = db.query(CalendarEvent).filter(
        CalendarEvent.user_id == current_user.id,
        CalendarEvent.event_type == EventType.ACADEMIC
    )
    
    # Filter by month and year if provided
    if month and year:
        start_date = datetime(year, month, 1)
        if month == 12:
            end_date = datetime(year + 1, 1, 1)
        else:
            end_date = datetime(year, month + 1, 1)
        query = query.filter(CalendarEvent.start_date >= start_date, CalendarEvent.start_date < end_date)
    
    query = query.order_by(CalendarEvent.start_date)
    events = query.all()
    
    return CalendarEventList(events=events, total=len(events))

@router.get("/personal-events", response_model=CalendarEventList)
def get_personal_events(
    month: Optional[int] = Query(None, ge=1, le=12, description="Filter by month (1-12)"),
    year: Optional[int] = Query(None, description="Filter by year"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_student)
):
    """Get personal calendar events for a student."""
    query = db.query(CalendarEvent).filter(
        CalendarEvent.user_id == current_user.id,
        CalendarEvent.event_type == EventType.PERSONAL
    )
    
    # Filter by month and year if provided
    if month and year:
        start_date = datetime(year, month, 1)
        if month == 12:
            end_date = datetime(year + 1, 1, 1)
        else:
            end_date = datetime(year, month + 1, 1)
        query = query.filter(CalendarEvent.start_date >= start_date, CalendarEvent.start_date < end_date)
    
    query = query.order_by(CalendarEvent.start_date)
    events = query.all()
    
    return CalendarEventList(events=events, total=len(events))

@router.get("/stats", response_model=CalendarStats)
def get_calendar_stats(
    event_type: Optional[EventType] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get calendar statistics for the current user."""
    query = db.query(CalendarEvent).filter(CalendarEvent.user_id == current_user.id)
    
    if event_type:
        query = query.filter(CalendarEvent.event_type == event_type)
    
    events = query.all()
    
    total_events = len(events)
    pending_events = len([e for e in events if e.status == EventStatus.PENDING])
    completed_events = len([e for e in events if e.status == EventStatus.COMPLETED])
    high_priority_events = len([e for e in events if e.priority in [Priority.HIGH, Priority.URGENT]])
    high_risk_events = len([e for e in events if e.risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]])
    
    # Upcoming alerts (events with alerts enabled and alert date in the next 7 days)
    now = datetime.utcnow()
    upcoming_alerts = len([
        e for e in events 
        if e.alert_enabled and e.alert_date and e.alert_date <= now + timedelta(days=7) and e.alert_date > now
    ])
    
    return CalendarStats(
        total_events=total_events,
        pending_events=pending_events,
        completed_events=completed_events,
        high_priority_events=high_priority_events,
        high_risk_events=high_risk_events,
        upcoming_alerts=upcoming_alerts
    )

@router.post("/events/{event_id}/mark-complete")
def mark_event_complete(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Mark a calendar event as completed."""
    event = db.query(CalendarEvent).filter(
        CalendarEvent.id == event_id,
        CalendarEvent.user_id == current_user.id
    ).first()
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    event.status = EventStatus.COMPLETED
    db.commit()
    
    return {"message": "Event marked as completed"}

@router.post("/events/{event_id}/toggle-status")
def toggle_event_status(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Toggle event status between pending and in-progress."""
    event = db.query(CalendarEvent).filter(
        CalendarEvent.id == event_id,
        CalendarEvent.user_id == current_user.id
    ).first()
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    if event.status == EventStatus.PENDING:
        event.status = EventStatus.IN_PROGRESS
    elif event.status == EventStatus.IN_PROGRESS:
        event.status = EventStatus.PENDING
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot toggle status of completed event"
        )
    
    db.commit()
    
    return {"message": f"Event status changed to {event.status.value}"}


@router.post("/events/{event_id}/test-notification")
def test_notification(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Test email notification for a specific event immediately."""
    from email_service import email_service
    from calendar_models import EventType
    
    event = db.query(CalendarEvent).filter(
        CalendarEvent.id == event_id,
        CalendarEvent.user_id == current_user.id
    ).first()
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    if not event.notification_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Event does not have a notification email configured"
        )
    
    try:
        # Determine todo type based on event_type
        todo_type = "academic" if event.event_type == EventType.ACADEMIC else "personal"
        
        # Send test email immediately
        success = email_service.send_todo_notification(
            to_email=event.notification_email,
            todo_title=event.title,
            todo_description=event.description or "",
            due_date=event.start_date,
            todo_type=todo_type,
            priority=event.priority.value
        )
        
        if success:
            return {"message": "Test notification sent successfully", "email": event.notification_email}
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send test notification"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error sending test notification: {str(e)}"
        )
