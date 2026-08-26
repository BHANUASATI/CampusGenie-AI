# Todo Email Notification Feature

## Overview
This feature adds email notification capabilities to the student dashboard todo system, allowing students to receive email reminders for their academic and personal tasks at scheduled times.

## Features Added

### 1. Email Notification Settings
- **Custom Email**: Students can provide a custom email address for notifications
- **Scheduled Time**: Set a specific time (HH:MM format) for daily email reminders
- **Category Selection**: Choose between Academic and Personal todo categories
- **Enable/Disable**: Toggle email notifications on/off per todo

### 2. Backend Components
- **Email Service** (`backend/src/email_service.py`): Handles SMTP email sending with beautiful HTML templates
- **Notification Scheduler** (`backend/src/notification_scheduler.py`): Background task that checks and sends emails at scheduled times
- **Database Schema**: Added `notification_email`, `notification_time`, and `email_notification_enabled` fields to calendar_events table

### 3. Frontend Enhancements
- **Enhanced Todo Modal**: Added email notification section with:
  - Email input field
  - Time picker for notification scheduling
  - Enable/disable checkbox
  - Category dropdown (Academic/Personal)
- **Beautiful UI**: Attractive design with icons and smooth transitions

## Configuration

### Email Service Configuration
Add these environment variables to your `backend/.env` file:

```env
# SMTP Configuration
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=your-email@gmail.com
```

### Gmail Setup
If using Gmail:
1. Go to Google Account settings
2. Enable 2-factor authentication
3. Generate an App Password
4. Use the App Password in `SMTP_PASSWORD`

## How to Use

### For Students:
1. Navigate to the Student Dashboard
2. Click on the Calendar/Tasks section
3. Click "Add New Todo" or edit an existing todo
4. Fill in the todo details (title, description, etc.)
5. Select Category: Academic 🎓 or Personal 👤
6. Scroll down to "Email Notifications" section
7. Check "Enable Email Notifications"
8. Enter your email address
9. Select notification time (e.g., 09:00 for 9 AM)
10. Save the todo

### Email Notification Schedule:
- The system checks every minute for todos that need notifications
- At the specified time, you'll receive a daily email reminder
- Email contains:
  - Todo title and description
  - Due date and time
  - Priority level
  - Category (Academic/Personal)
  - Direct link to CampusGenie

### Email Template Features:
- Beautiful HTML design with responsive layout
- Priority-based color coding
- Category badges (Academic/Personal)
- Direct link to application
- Professional branding

## Technical Details

### Database Migration
Run the migration script to add email notification fields:
```bash
cd backend
python3 migrate_add_email_notifications.py
```

### Scheduler Architecture
- Runs as a background task on FastAPI startup
- Checks every minute for todos matching current notification time
- Sends emails using SMTP
- Marks todos as notified to prevent duplicate emails

### API Endpoints
The existing calendar API endpoints are extended to support email notification fields:
- `POST /calendar/events` - Create todo with email settings
- `PUT /calendar/events/{id}` - Update todo email settings
- `GET /calendar/events` - Get todos with email settings

## Testing

### Manual Testing:
1. Create a todo with email notifications enabled
2. Set notification time to current time + 1 minute
3. Wait for the scheduled time
4. Check your email for the notification

### Email Service Test:
```python
from backend.src.email_service import email_service

# Test email sending
success = email_service.send_todo_notification(
    to_email="test@example.com",
    todo_title="Test Todo",
    todo_description="This is a test",
    due_date=datetime.now(),
    todo_type="academic",
    priority="high"
)
```

## Troubleshooting

### Emails not sending:
1. Check SMTP credentials in `.env` file
2. Verify email server and port settings
3. Check firewall/network connectivity
4. Review backend logs for errors

### Scheduler not running:
1. Check backend startup logs for "Starting notification scheduler"
2. Verify FastAPI application is running
3. Check for Python errors in startup process

### Email not received:
1. Check spam/junk folder
2. Verify email address is correct
3. Check SMTP provider's sending limits
4. Verify notification time is correctly set

## Future Enhancements
- [ ] Add SMS notifications
- [ ] Support for multiple notification times per day
- [ ] Email digest for multiple todos
- [ ] Custom email templates per user
- [ ] Notification history tracking
- [ ] Push notifications for mobile app

## Security Notes
- SMTP credentials should be kept secure
- Use App Passwords instead of regular passwords
- Never commit `.env` file to version control
- Consider using email API services (SendGrid, Mailgun) for production