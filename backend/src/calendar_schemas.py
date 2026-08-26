from pydantic import BaseModel, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum

class EventType(str, Enum):
    ACADEMIC = "academic"
    PERSONAL = "personal"

class EventStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"

class Priority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class CalendarEventBase(BaseModel):
    title: str
    description: Optional[str] = None
    event_type: EventType
    status: EventStatus = EventStatus.PENDING
    priority: Priority = Priority.MEDIUM
    risk_level: RiskLevel = RiskLevel.LOW
    start_date: datetime
    end_date: Optional[datetime] = None
    alert_date: Optional[datetime] = None
    location: Optional[str] = None
    category: Optional[str] = None
    alert_message: Optional[str] = None
    alert_enabled: bool = False
    
    # Email notification settings
    notification_email: Optional[str] = None
    notification_time: Optional[str] = None  # HH:MM format
    email_notification_enabled: bool = False

    @validator('end_date')
    def validate_end_date(cls, v, values):
        if v and 'start_date' in values:
            if v <= values['start_date']:
                raise ValueError('End date must be after start date')
        return v

    @validator('alert_date')
    def validate_alert_date(cls, v, values):
        if v and 'start_date' in values:
            if v > values['start_date']:
                raise ValueError('Alert date must be on or before start date')
        return v

class CalendarEventCreate(CalendarEventBase):
    pass

class CalendarEventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[EventStatus] = None
    priority: Optional[Priority] = None
    risk_level: Optional[RiskLevel] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    alert_date: Optional[datetime] = None
    location: Optional[str] = None
    category: Optional[str] = None
    alert_message: Optional[str] = None
    alert_enabled: Optional[bool] = None
    
    # Email notification settings
    notification_email: Optional[str] = None
    notification_time: Optional[str] = None
    email_notification_enabled: Optional[bool] = None

class CalendarEventResponse(CalendarEventBase):
    id: int
    user_id: int
    alert_sent: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CalendarEventList(BaseModel):
    events: List[CalendarEventResponse]
    total: int

class CalendarStats(BaseModel):
    total_events: int
    pending_events: int
    completed_events: int
    high_priority_events: int
    high_risk_events: int
    upcoming_alerts: int
