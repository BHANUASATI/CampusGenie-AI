import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import asyncio
import aiosmtplib
from email.message import EmailMessage
from config import settings

class EmailService:
    def __init__(self):
        # Use settings if available, otherwise use defaults
        self.smtp_server = getattr(settings, 'SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = getattr(settings, 'SMTP_PORT', 587)
        self.smtp_username = getattr(settings, 'SMTP_USERNAME', '')
        self.smtp_password = getattr(settings, 'SMTP_PASSWORD', '')
        self.from_email = getattr(settings, 'FROM_EMAIL', self.smtp_username)
        
    async def send_credentials_email(self, to_email: str, student_name: str, login_email: str, password: str) -> bool:
        """Send student credentials via email"""
        try:
            # Create email message
            message = EmailMessage()
            message["From"] = self.from_email
            message["To"] = to_email
            message["Subject"] = "Your CampusGenie Student Account Credentials"
            
            # HTML email body (student template)
            html_body = f"""
            <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
                
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #007bff, #0056b3); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                    <h1 style="margin: 0; font-size: 28px;">🎓 Welcome to CampusGenie!</h1>
                    <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">AI for Smarter Learning</p>
                </div>
                
                <!-- Welcome Message -->
                <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <p style="font-size: 16px; color: #333; line-height: 1.6;">Dear <strong>{student_name}</strong>,</p>
                    <p style="font-size: 16px; color: #333; line-height: 1.6;">
                        Congratulations! Your student account has been successfully created at CampusGenie - AI for Smarter Learning. 
                        We're excited to have you join our academic community!
                    </p>
                </div>
                
                <!-- Login Credentials -->
                <div style="background-color: #e3f2fd; padding: 25px; border-radius: 10px; margin-bottom: 20px; border-left: 5px solid #007bff;">
                    <h3 style="color: #1976d2; margin-top: 0; display: flex; align-items: center;">
                        🔑 Your Account Credentials
                    </h3>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                        <tr style="background-color: rgba(25, 118, 210, 0.1);">
                            <td style="padding: 12px; font-weight: bold; color: #1976d2; border-radius: 5px 0 0 5px;">Login Email:</td>
                            <td style="padding: 12px; color: #007bff; font-family: monospace; font-weight: bold;">{login_email}</td>
                        </tr>
                        <tr style="background-color: rgba(220, 53, 69, 0.1);">
                            <td style="padding: 12px; font-weight: bold; color: #dc3545;">Temporary Password:</td>
                            <td style="padding: 12px; color: #dc3545; font-weight: bold; font-family: monospace;">{password}</td>
                        </tr>
                    </table>
                </div>
                
                <!-- Platform Features -->
                <div style="background-color: #f8fff8; padding: 25px; border-radius: 10px; margin-bottom: 20px; border-left: 5px solid #28a745;">
                    <h3 style="color: #28a745; margin-top: 0; display: flex; align-items: center;">
                        🚀 What You Can Do With CampusGenie
                    </h3>
                    <ul style="color: #333; line-height: 1.8; margin-bottom: 0;">
                        <li><strong>📚 Document Management:</strong> Upload and manage your academic documents securely</li>
                        <li><strong>✅ Verification Tracking:</strong> Monitor the status of your document verifications in real-time</li>
                        <li><strong>📝 Task Submissions:</strong> Submit assignments and track your grades</li>
                        <li><strong>📊 Academic Dashboard:</strong> View your academic progress and statistics</li>
                        <li><strong>🔔 Notifications:</strong> Stay updated with important announcements and deadlines</li>
                    </ul>
                </div>
                
                <!-- Next Steps -->
                <div style="background-color: #fff8e1; padding: 25px; border-radius: 10px; margin-bottom: 20px; border-left: 5px solid #ffc107;">
                    <h3 style="color: #f57c00; margin-top: 0; display: flex; align-items: center;">
                        📋 Your Next Steps
                    </h3>
                    <ol style="color: #333; line-height: 1.8; margin-bottom: 0;">
                        <li><strong>First Login:</strong> Use the credentials above to access your account</li>
                        <li><strong>Update Password:</strong> Change your temporary password immediately for security</li>
                        <li><strong>Complete Profile:</strong> Fill in your personal and academic information</li>
                        <li><strong>Upload Documents:</strong> Submit required documents for verification</li>
                        <li><strong>Explore Dashboard:</strong> Familiarize yourself with the platform features</li>
                    </ol>
                </div>
                
                <!-- Security Notice -->
                <div style="background-color: #ffebee; padding: 25px; border-radius: 10px; margin-bottom: 20px; border-left: 5px solid #f44336;">
                    <h4 style="color: #c62828; margin-top: 0; display: flex; align-items: center;">
                        🔒 Important Security Notice
                    </h4>
                    <ul style="color: #333; line-height: 1.8; margin-bottom: 0;">
                        <li><strong>Change Password:</strong> Update your password immediately after first login</li>
                        <li><strong>Keep Confidential:</strong> Never share your credentials with anyone</li>
                        <li><strong>Strong Password:</strong> Use a combination of letters, numbers, and symbols</li>
                        <li><strong>Secure Access:</strong> Always log out after using shared computers</li>
                        <li><strong>Report Issues:</strong> Contact support immediately if you suspect unauthorized access</li>
                    </ul>
                </div>
                
                <!-- Support Information -->
                <div style="background-color: #e8f5e8; padding: 25px; border-radius: 10px; margin-bottom: 20px;">
                    <h3 style="color: #2e7d32; margin-top: 0; display: flex; align-items: center;">
                        💬 Need Help? We're Here for You!
                    </h3>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                        <tr>
                            <td style="padding: 8px; font-weight: bold; color: #2e7d32;">📧 Technical Support:</td>
                            <td style="padding: 8px; color: #333;">support@university.edu.in</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; font-weight: bold; color: #2e7d32;">📞 Registrar Office:</td>
                            <td style="padding: 8px; color: #333;">+91-XXX-XXXX-XXXX</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; font-weight: bold; color: #2e7d32;">🕐 Office Hours:</td>
                            <td style="padding: 8px; color: #333;">Monday - Friday, 9:00 AM - 5:00 PM</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; font-weight: bold; color: #2e7d32;">🌐 Help Center:</td>
                            <td style="padding: 8px; color: #333;">help.university.edu.in/netacad</td>
                        </tr>
                    </table>
                </div>
                
                <!-- Important Links -->
                <div style="background-color: #e1f5fe; padding: 20px; border-radius: 10px; margin-bottom: 20px; text-align: center;">
                    <h4 style="color: #0277bd; margin-top: 0;">Quick Links</h4>
                    <div style="margin-top: 15px;">
                        <a href="http://localhost:3000" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 5px; font-weight: bold;">
                            🚀 Access CampusGenie
                        </a>
                        <a href="#" style="display: inline-block; background-color: #28a745; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 5px; font-weight: bold;">
                            📖 Student Handbook
                        </a>
                    </div>
                </div>
                
                <!-- Footer -->
                <div style="text-align: center; margin-top: 30px; padding: 20px; background-color: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <p style="color: #6c757d; font-size: 14px; margin-bottom: 10px;">
                        <strong>We're excited to be part of your academic journey! 🎓</strong>
                    </p>
                    <p style="color: #6c757d; font-size: 12px; margin-bottom: 5px;">
                        Best regards,<br>
                        The CampusGenie Team<br>
                        University Administration
                    </p>
                    <p style="color: #adb5bd; font-size: 11px; margin-top: 15px;">
                        This is an automated message. Please do not reply to this email.<br>
                        If you need assistance, use the contact information provided above.
                    </p>
                    <p style="color: #adb5bd; font-size: 10px; margin-top: 10px;">
                        © 2024 University. All rights reserved. | Privacy Policy | Terms of Service
                    </p>
                </div>
                
            </body>
            </html>
            """
            
            message.set_content(f"""
🎓 WELCOME TO NETACAD - YOUR ACADEMIC JOURNEY STARTS HERE! 🎓

Dear {student_name},

Congratulations! Your student account has been successfully created at CampusGenie - AI for Smarter Learning. We're excited to have you join our academic community!

🔑 YOUR ACCOUNT CREDENTIALS
═══════════════════════════════════════════════════════════════
Login Email: {login_email}
Temporary Password: {password}

🚀 WHAT YOU CAN DO WITH NETACAD
═══════════════════════════════════════════════════════════════
• 📚 Document Management: Upload and manage your academic documents securely
• ✅ Verification Tracking: Monitor the status of your document verifications in real-time
• 📝 Task Submissions: Submit assignments and track your grades
• 📊 Academic Dashboard: View your academic progress and statistics
• 🔔 Notifications: Stay updated with important announcements and deadlines

📋 YOUR NEXT STEPS
═══════════════════════════════════════════════════════════════
1. First Login: Use the credentials above to access your account
2. Update Password: Change your temporary password immediately for security
3. Complete Profile: Fill in your personal and academic information
4. Upload Documents: Submit required documents for verification
5. Explore Dashboard: Familiarize yourself with the platform features

🔒 IMPORTANT SECURITY NOTICE
═══════════════════════════════════════════════════════════════
• Change Password: Update your password immediately after first login
• Keep Confidential: Never share your credentials with anyone
• Strong Password: Use a combination of letters, numbers, and symbols
• Secure Access: Always log out after using shared computers
• Report Issues: Contact support immediately if you suspect unauthorized access

💬 NEED HELP? WE'RE HERE FOR YOU!
═══════════════════════════════════════════════════════════════
📧 Technical Support: support@university.edu.in
📞 Registrar Office: +91-XXX-XXXX-XXXX
🕐 Office Hours: Monday - Friday, 9:00 AM - 5:00 PM
🌐 Help Center: help.university.edu.in/netacad

🚀 QUICK ACCESS
═══════════════════════════════════════════════════════════════
Access CampusGenie: http://localhost:3000
Student Handbook: Available in the platform

We're excited to be part of your academic journey! 🎓

Best regards,
The CampusGenie Team
University Administration

This is an automated message. Please do not reply to this email.
If you need assistance, use the contact information provided above.

© 2024 University. All rights reserved. | Privacy Policy | Terms of Service
""")
            
            message.add_alternative(html_body, subtype="html")
            
            # Send email using aiosmtplib
            await aiosmtplib.send(
                message,
                hostname=self.smtp_server,
                port=self.smtp_port,
                start_tls=True,
                username=self.smtp_username,
                password=self.smtp_password,
            )
            
            return True
            
        except Exception as e:
            print(f"Error sending email: {str(e)}")
            return False

    async def send_faculty_credentials_email(self, to_email: str, faculty_name: str, login_email: str, password: str) -> bool:
        """Send faculty credentials via email"""
        try:
            # Create email message
            message = EmailMessage()
            message["From"] = self.from_email
            message["To"] = to_email
            message["Subject"] = "Your CampusGenie Faculty Account Credentials"
            
            # HTML email body (faculty template)
            html_body = f"""
            <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
                
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #6f42c1, #563d7c); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                    <h1 style="margin: 0; font-size: 28px;">👨‍🏫 Welcome to CampusGenie Faculty Portal!</h1>
                    <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your Academic Teaching Journey Starts Here</p>
                </div>
                
                <!-- Welcome Message -->
                <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <p style="font-size: 16px; color: #333; line-height: 1.6;">Dear <strong>{faculty_name}</strong>,</p>
                    <p style="font-size: 16px; color: #333; line-height: 1.6;">
                        Congratulations! Your faculty account has been successfully created at CampusGenie - the University Document Management System. 
                        We're excited to have you join our academic team!
                    </p>
                </div>
                
                <!-- Login Credentials -->
                <div style="background-color: #e3f2fd; padding: 25px; border-radius: 10px; margin-bottom: 20px; border-left: 5px solid #6f42c1;">
                    <h3 style="color: #6f42c1; margin-top: 0; display: flex; align-items: center;">
                        � Your Faculty Account Credentials
                    </h3>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                        <tr style="background-color: rgba(111, 66, 193, 0.1);">
                            <td style="padding: 12px; font-weight: bold; color: #6f42c1; border-radius: 5px 0 0 5px;">Login Email:</td>
                            <td style="padding: 12px; color: #6f42c1; font-family: monospace; font-weight: bold;">{login_email}</td>
                        </tr>
                        <tr style="background-color: rgba(220, 53, 69, 0.1);">
                            <td style="padding: 12px; font-weight: bold; color: #dc3545;">Temporary Password:</td>
                            <td style="padding: 12px; color: #dc3545; font-weight: bold; font-family: monospace;">{password}</td>
                        </tr>
                    </table>
                </div>
                
                <!-- Faculty Features -->
                <div style="background-color: #f8fff8; padding: 25px; border-radius: 10px; margin-bottom: 20px; border-left: 5px solid #28a745;">
                    <h3 style="color: #28a745; margin-top: 0; display: flex; align-items: center;">
                        🚀 What You Can Do With CampusGenie Faculty Portal
                    </h3>
                    <ul style="color: #333; line-height: 1.8; margin-bottom: 0;">
                        <li><strong>📚 Document Verification:</strong> Review and verify student academic documents</li>
                        <li><strong>👥 Student Management:</strong> Monitor student progress and academic records</li>
                        <li><strong>📝 Task Management:</strong> Create and manage assignments and assessments</li>
                        <li><strong>� Academic Analytics:</strong> View class performance and statistics</li>
                        <li><strong>🔔 Communication:</strong> Send announcements and communicate with students</li>
                        <li><strong>📅 Calendar Management:</strong> Schedule academic events and deadlines</li>
                    </ul>
                </div>
                
                <!-- Next Steps -->
                <div style="background-color: #fff8e1; padding: 25px; border-radius: 10px; margin-bottom: 20px; border-left: 5px solid #ffc107;">
                    <h3 style="color: #f57c00; margin-top: 0; display: flex; align-items: center;">
                        📋 Your Next Steps
                    </h3>
                    <ol style="color: #333; line-height: 1.8; margin-bottom: 0;">
                        <li><strong>First Login:</strong> Use the credentials above to access your faculty portal</li>
                        <li><strong>Update Password:</strong> Change your temporary password immediately for security</li>
                        <li><strong>Complete Profile:</strong> Fill in your professional information</li>
                        <li><strong>Explore Dashboard:</strong> Familiarize yourself with faculty portal features</li>
                        <li><strong>Set Up Courses:</strong> Configure your courses and student lists</li>
                    </ol>
                </div>
                
                <!-- Security Notice -->
                <div style="background-color: #ffebee; padding: 25px; border-radius: 10px; margin-bottom: 20px; border-left: 5px solid #f44336;">
                    <h4 style="color: #c62828; margin-top: 0; display: flex; align-items: center;">
                        🔒 Important Security Notice
                    </h4>
                    <ul style="color: #333; line-height: 1.8; margin-bottom: 0;">
                        <li><strong>Change Password:</strong> Update your password immediately after first login</li>
                        <li><strong>Keep Confidential:</strong> Never share your credentials with anyone</li>
                        <li><strong>Strong Password:</strong> Use a combination of letters, numbers, and symbols</li>
                        <li><strong>Secure Access:</strong> Always log out after using shared computers</li>
                        <li><strong>Report Issues:</strong> Contact IT support immediately if you suspect unauthorized access</li>
                    </ul>
                </div>
                
                <!-- Support Information -->
                <div style="background-color: #e8f5e8; padding: 25px; border-radius: 10px; margin-bottom: 20px;">
                    <h3 style="color: #2e7d32; margin-top: 0; display: flex; align-items: center;">
                        💬 Need Help? We're Here for You!
                    </h3>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                        <tr>
                            <td style="padding: 8px; font-weight: bold; color: #2e7d32;">📧 IT Support:</td>
                            <td style="padding: 8px; color: #333;">it.support@university.edu.in</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; font-weight: bold; color: #2e7d32;">📞 Registrar Office:</td>
                            <td style="padding: 8px; color: #333;">+91-XXX-XXXX-XXXX</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; font-weight: bold; color: #2e7d32;">🕐 Office Hours:</td>
                            <td style="padding: 8px; color: #333;">Monday - Friday, 9:00 AM - 5:00 PM</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; font-weight: bold; color: #2e7d32;">🌐 Faculty Portal:</td>
                            <td style="padding: 8px; color: #333;">faculty.university.edu.in/netacad</td>
                        </tr>
                    </table>
                </div>
                
                <!-- Important Links -->
                <div style="background-color: #e1f5fe; padding: 20px; border-radius: 10px; margin-bottom: 20px; text-align: center;">
                    <h4 style="color: #0277bd; margin-top: 0;">Quick Links</h4>
                    <div style="margin-top: 15px;">
                        <a href="http://localhost:3000" style="display: inline-block; background-color: #6f42c1; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 5px; font-weight: bold;">
                            🚀 Access Faculty Portal
                        </a>
                        <a href="#" style="display: inline-block; background-color: #28a745; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 5px; font-weight: bold;">
                            📖 Faculty Handbook
                        </a>
                    </div>
                </div>
                
                <!-- Footer -->
                <div style="text-align: center; margin-top: 30px; padding: 20px; background-color: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <p style="color: #6c757d; font-size: 14px; margin-bottom: 10px;">
                        <strong>We're excited to have you join our academic team! 👨‍�</strong>
                    </p>
                    <p style="color: #6c757d; font-size: 12px; margin-bottom: 5px;">
                        Best regards,<br>
                        The CampusGenie Team<br>
                        University Administration
                    </p>
                    <p style="color: #adb5bd; font-size: 11px; margin-top: 15px;">
                        This is an automated message. Please do not reply to this email.<br>
                        If you need assistance, use the contact information provided above.
                    </p>
                    <p style="color: #adb5bd; font-size: 10px; margin-top: 10px;">
                        © 2024 University. All rights reserved. | Privacy Policy | Terms of Service
                    </p>
                </div>
                
            </body>
            </html>
            """
            
            message.set_content(f"""
👨‍� WELCOME TO NETACAD FACULTY PORTAL - YOUR TEACHING JOURNEY STARTS HERE! 👨‍�

Dear {faculty_name},

Congratulations! Your faculty account has been successfully created at CampusGenie - the University Document Management System. We're excited to have you join our academic team!

🔑 YOUR FACULTY ACCOUNT CREDENTIALS
═══════════════════════════════════════════════════════════════
Login Email: {login_email}
Temporary Password: {password}

🚀 WHAT YOU CAN DO WITH NETACAD FACULTY PORTAL
═══════════════════════════════════════════════════════════════
• 📚 Document Verification: Review and verify student academic documents
• 👥 Student Management: Monitor student progress and academic records
• 📝 Task Management: Create and manage assignments and assessments
• 📊 Academic Analytics: View class performance and statistics
• 🔔 Communication: Send announcements and communicate with students
• 📅 Calendar Management: Schedule academic events and deadlines

📋 YOUR NEXT STEPS
═══════════════════════════════════════════════════════════════
1. First Login: Use the credentials above to access your faculty portal
2. Update Password: Change your temporary password immediately for security
3. Complete Profile: Fill in your professional information
4. Explore Dashboard: Familiarize yourself with faculty portal features
5. Set Up Courses: Configure your courses and student lists

🔒 IMPORTANT SECURITY NOTICE
═══════════════════════════════════════════════════════════════
• Change Password: Update your password immediately after first login
• Keep Confidential: Never share your credentials with anyone
• Strong Password: Use a combination of letters, numbers, and symbols
• Secure Access: Always log out after using shared computers
• Report Issues: Contact IT support immediately if you suspect unauthorized access

💬 NEED HELP? WE'RE HERE FOR YOU!
═══════════════════════════════════════════════════════════════
📧 IT Support: it.support@university.edu.in
📞 Registrar Office: +91-XXX-XXXX-XXXX
🕐 Office Hours: Monday - Friday, 9:00 AM - 5:00 PM
🌐 Faculty Portal: faculty.university.edu.in/netacad

🚀 QUICK ACCESS
═══════════════════════════════════════════════════════════════
Access Faculty Portal: http://localhost:3000
Faculty Handbook: Available in the portal

We're excited to have you join our academic team! 👨‍�

Best regards,
The CampusGenie Team
University Administration

This is an automated message. Please do not reply to this email.
If you need assistance, use the contact information provided above.

© 2024 University. All rights reserved. | Privacy Policy | Terms of Service
""")
            
            message.add_alternative(html_body, subtype="html")
            
            # Send email using aiosmtplib
            await aiosmtplib.send(
                message,
                hostname=self.smtp_server,
                port=self.smtp_port,
                start_tls=True,
                username=self.smtp_username,
                password=self.smtp_password,
            )
            
            return True
            
        except Exception as e:
            print(f"Error sending faculty email: {str(e)}")
            return False
    
    def is_configured(self) -> bool:
        """Check if email service is properly configured"""
        return bool(self.smtp_username and self.smtp_password and self.from_email)

# Global email service instance
email_service = EmailService()
