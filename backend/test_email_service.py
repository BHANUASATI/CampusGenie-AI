#!/usr/bin/env python3
"""
Test script to verify email service functionality
"""

import sys
import os
from datetime import datetime, timedelta

# Add the src directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from email_service import email_service

def test_email_service():
    """Test the email service by sending a test email"""
    print("🧪 Testing Email Service...")
    print(f"SMTP Server: {email_service.smtp_server}")
    print(f"SMTP Port: {email_service.smtp_port}")
    print(f"SMTP Username: {email_service.smtp_username}")
    print(f"From Email: {email_service.from_email}")
    
    # Check if credentials are configured
    if not email_service.smtp_username or not email_service.smtp_password:
        print("❌ Email service not configured - missing SMTP credentials")
        return False
    
    # Send a test email
    test_email = input("Enter email address to send test to (or press Enter to use configured email): ").strip()
    if not test_email:
        test_email = email_service.smtp_username
    
    print(f"📧 Sending test email to: {test_email}")
    
    success = email_service.send_todo_notification(
        to_email=test_email,
        todo_title="Test Todo Notification",
        todo_description="This is a test email from CampusGenie todo notification system.",
        due_date=datetime.now() + timedelta(days=1),
        todo_type="academic",
        priority="high"
    )
    
    if success:
        print("✅ Test email sent successfully!")
        print("📬 Please check your inbox (and spam folder)")
        return True
    else:
        print("❌ Failed to send test email")
        print("🔍 Check the error logs above for details")
        return False

if __name__ == '__main__':
    try:
        test_email_service()
    except KeyboardInterrupt:
        print("\n⚠️ Test cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        sys.exit(1)