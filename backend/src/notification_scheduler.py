import asyncio
from datetime import datetime, time
from typing import Optional
import logging
from sqlalchemy.orm import Session
from database import get_db
from calendar_models import CalendarEvent, EventType, EventStatus
from email_service import email_service

logger = logging.getLogger(__name__)

class NotificationScheduler:
    def __init__(self):
        self.running = False
        self.task: Optional[asyncio.Task] = None
        
    async def start(self):
        """Start the notification scheduler."""
        if self.running:
            logger.warning("Notification scheduler is already running")
            return
            
        self.running = True
        logger.info("🔔 Starting notification scheduler")
        self.task = asyncio.create_task(self._run_scheduler())
        
    async def stop(self):
        """Stop the notification scheduler."""
        if not self.running:
            return
            
        self.running = False
        if self.task:
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass
        logger.info("Notification scheduler stopped")
        
    async def _run_scheduler(self):
        """Main scheduler loop."""
        while self.running:
            try:
                await self._check_and_send_notifications()
                # Check every minute
                await asyncio.sleep(60)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in notification scheduler: {str(e)}")
                await asyncio.sleep(60)  # Wait before retrying
                
    async def _check_and_send_notifications(self):
        """Check for todos that need email notifications and send them."""
        now = datetime.now()
        current_time = now.strftime("%H:%M")
        current_date = now.date()
        
        logger.debug(f"🔍 Checking notifications at {current_time}")
        
        try:
            # Get database session
            db = next(get_db())
            
            try:
                # Find events that need notifications
                # 1. Email notification is enabled
                # 2. Notification time matches current time
                # 3. Event is not completed
                # 4. Event is in the future OR today (not overdue by more than 1 day)
                # 5. Email hasn't been sent yet today
                
                events_to_notify = db.query(CalendarEvent).filter(
                    CalendarEvent.email_notification_enabled == True,
                    CalendarEvent.notification_time == current_time,
                    CalendarEvent.status != EventStatus.COMPLETED,
                    CalendarEvent.start_date >= now.date(),  # Changed from > to >= to include today
                    CalendarEvent.notification_email.isnot(None)
                ).all()
                
                logger.info(f"📋 Found {len(events_to_notify)} events to notify at {current_time}")
                
                for event in events_to_notify:
                    logger.debug(f"Processing event {event.id}: {event.title}")
                    logger.debug(f"  - Due date: {event.start_date}")
                    logger.debug(f"  - Current date: {current_date}")
                    logger.debug(f"  - Alert sent: {event.alert_sent}")
                    
                    # Check if we already sent an email today
                    # We'll use a simple logic: reset alert_sent at midnight
                    # For now, we'll always send if it's the right time and event is active
                    should_send = True
                    
                    # Optional: Add logic to prevent multiple emails per day
                    # This would require a separate field to track last email sent date
                    # For now, we'll send daily notifications
                    
                    if should_send:
                        success = await self._send_notification_email(event, db)
                        if success:
                            logger.info(f"✅ Sent notification email for event {event.id}: {event.title}")
                        else:
                            logger.error(f"❌ Failed to send notification email for event {event.id}")
                    else:
                        logger.debug(f"⏭️  Skipping event {event.id} - email already sent today")
                            
            finally:
                db.close()
                
        except Exception as e:
            logger.error(f"❌ Error checking notifications: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            
    async def _send_notification_email(self, event: CalendarEvent, db: Session) -> bool:
        """Send notification email for a specific event."""
        try:
            # Determine todo type based on event_type
            todo_type = "academic" if event.event_type == EventType.ACADEMIC else "personal"
            
            # Send email
            success = email_service.send_todo_notification(
                to_email=event.notification_email,
                todo_title=event.title,
                todo_description=event.description or "",
                due_date=event.start_date,
                todo_type=todo_type,
                priority=event.priority.value
            )
            
            if success:
                # Mark as sent (you might want to add a separate field for this)
                event.alert_sent = True
                db.commit()
                
            return success
            
        except Exception as e:
            logger.error(f"Error sending notification email: {str(e)}")
            return False

# Global scheduler instance
notification_scheduler = NotificationScheduler()

async def start_notification_scheduler():
    """Start the notification scheduler (called on app startup)."""
    await notification_scheduler.start()

async def stop_notification_scheduler():
    """Stop the notification scheduler (called on app shutdown)."""
    await notification_scheduler.stop()