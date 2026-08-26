import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import os
from datetime import datetime
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_username = os.getenv("SMTP_USERNAME")
        self.smtp_password = os.getenv("SMTP_PASSWORD")
        self.from_email = os.getenv("FROM_EMAIL", self.smtp_username)
        
        # Log configuration status
        if self.smtp_username and self.smtp_password:
            logger.info(f"✅ Email service configured with server: {self.smtp_server}")
        else:
            logger.warning("⚠️ Email service not properly configured - SMTP credentials missing")
        
    def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """Send an email using SMTP."""
        if not all([self.smtp_username, self.smtp_password]):
            logger.warning("SMTP credentials not configured. Email sending disabled.")
            return False
            
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['From'] = self.from_email
            msg['To'] = to_email
            msg['Subject'] = subject
            
            # Add text and HTML parts
            if text_content:
                part1 = MIMEText(text_content, 'plain')
                msg.attach(part1)
            
            part2 = MIMEText(html_content, 'html')
            msg.attach(part2)
            
            # Send email
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)
                
            logger.info(f"Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False
    
    def send_todo_notification(
        self,
        to_email: str,
        todo_title: str,
        todo_description: str,
        due_date: datetime,
        todo_type: str = "personal",
        priority: str = "medium"
    ) -> bool:
        """Send a todo notification email."""
        
        # Format due date
        formatted_date = due_date.strftime("%B %d, %Y at %I:%M %p")
        
        # Determine priority color
        priority_colors = {
            "low": "#10b981",
            "medium": "#f59e0b", 
            "high": "#ef4444",
            "urgent": "#dc2626"
        }
        priority_color = priority_colors.get(priority, "#6b7280")
        
        # Create HTML content
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Todo Reminder</title>
            <style>
                body {{
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f9fafb;
                }}
                .container {{
                    background-color: #ffffff;
                    border-radius: 12px;
                    padding: 30px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                }}
                .header {{
                    text-align: center;
                    padding-bottom: 20px;
                    border-bottom: 2px solid #e5e7eb;
                }}
                .logo {{
                    font-size: 24px;
                    font-weight: bold;
                    color: #4f46e5;
                }}
                .content {{
                    padding: 20px 0;
                }}
                .todo-title {{
                    font-size: 22px;
                    font-weight: 600;
                    color: #1f2937;
                    margin-bottom: 10px;
                }}
                .todo-type {{
                    display: inline-block;
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 600;
                    text-transform: uppercase;
                    margin-bottom: 15px;
                }}
                .academic {{
                    background-color: #e0e7ff;
                    color: #4338ca;
                }}
                .personal {{
                    background-color: #fce7f3;
                    color: #be185d;
                }}
                .todo-description {{
                    color: #6b7280;
                    margin-bottom: 20px;
                    line-height: 1.8;
                }}
                .due-date {{
                    background-color: #fef3c7;
                    border-left: 4px solid #f59e0b;
                    padding: 15px;
                    margin: 20px 0;
                    border-radius: 4px;
                }}
                .due-date strong {{
                    color: #92400e;
                }}
                .priority-badge {{
                    display: inline-block;
                    padding: 6px 16px;
                    border-radius: 20px;
                    font-size: 14px;
                    font-weight: 600;
                    color: white;
                    background-color: {priority_color};
                    margin-top: 10px;
                }}
                .footer {{
                    text-align: center;
                    padding-top: 20px;
                    border-top: 1px solid #e5e7eb;
                    color: #9ca3af;
                    font-size: 12px;
                }}
                .button {{
                    display: inline-block;
                    padding: 12px 24px;
                    background-color: #4f46e5;
                    color: white;
                    text-decoration: none;
                    border-radius: 8px;
                    font-weight: 600;
                    margin-top: 20px;
                }}
                .button:hover {{
                    background-color: #4338ca;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">🎓 CampusGenie</div>
                </div>
                
                <div class="content">
                    <h2 style="color: #1f2937; margin-bottom: 5px;">Todo Reminder</h2>
                    <p style="color: #6b7280; margin-bottom: 20px;">You have a task that needs your attention!</p>
                    
                    <span class="todo-type {todo_type}">{todo_type}</span>
                    
                    <h3 class="todo-title">{todo_title}</h3>
                    
                    {f'<p class="todo-description">{todo_description}</p>' if todo_description else ''}
                    
                    <div class="due-date">
                        <strong>📅 Due Date:</strong> {formatted_date}
                    </div>
                    
                    <div class="priority-badge">
                        Priority: {priority.upper()}
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="http://localhost:3000" class="button">View in CampusGenie</a>
                    </div>
                </div>
                
                <div class="footer">
                    <p>This is an automated reminder from CampusGenie. Please do not reply to this email.</p>
                    <p>© 2024 CampusGenie. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Text version for email clients that don't support HTML
        text_content = f"""
        CampusGenie - Todo Reminder
        
        You have a task that needs your attention!
        
        Type: {todo_type.upper()}
        Title: {todo_title}
        {f'Description: {todo_description}' if todo_description else ''}
        Due Date: {formatted_date}
        Priority: {priority.upper()}
        
        View in CampusGenie: http://localhost:3000
        
        This is an automated reminder. Please do not reply.
        """
        
        subject = f"🔔 Reminder: {todo_title} - Due {formatted_date}"
        
        return self.send_email(to_email, subject, html_content, text_content)

# Global email service instance
email_service = EmailService()