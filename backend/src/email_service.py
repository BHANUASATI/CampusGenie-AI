import html
import logging
import os
import re
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

import requests
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


class EmailService:
    """Sends CampusGenie account emails via Resend (preferred) or SMTP.

    Resend's `onboarding@resend.dev` address is a *test* sender: it can only
    deliver to the email address that owns the Resend account. It must never be
    used as the production `from` address for student/faculty credentials.
    """

    RESEND_API_URL = "https://api.resend.com/emails"
    TEST_SENDER_RE = re.compile(r"@resend\.dev>?\s*$", re.IGNORECASE)

    def __init__(self):
        self.resend_api_key = os.getenv("RESEND_API_KEY", "")
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_username = os.getenv("SMTP_USERNAME", "")
        self.smtp_password = os.getenv("SMTP_PASSWORD", "")

        # RESEND_FROM_EMAIL wins so a verified sender can be configured without
        # changing generic SMTP settings. FROM_EMAIL remains backwards compatible.
        self.from_email = (
            os.getenv("RESEND_FROM_EMAIL")
            or os.getenv("FROM_EMAIL")
            or "onboarding@resend.dev"
        )
        self.allow_test_sender = os.getenv("ALLOW_RESEND_TEST_SENDER", "").lower() in (
            "1", "true", "yes"
        )
        self.last_error: Optional[str] = None

        summary = self.configuration_summary()
        if summary["configured"]:
            logger.info("✅ Email service configured via %s (from: %s)", summary["provider"], self.from_email)
        else:
            logger.warning("⚠️ Email service not usable: %s", summary["issue"])

    # ── Configuration helpers ────────────────────────────────────────────────

    @property
    def uses_resend(self) -> bool:
        return bool(self.resend_api_key and not self.resend_api_key.startswith("your-"))

    @property
    def uses_smtp(self) -> bool:
        return bool(
            self.smtp_username
            and self.smtp_password
            and not self.smtp_username.startswith("your-")
            and not self.smtp_password.startswith("your-")
        )

    @property
    def uses_test_sender(self) -> bool:
        return bool(self.TEST_SENDER_RE.search(self.from_email))

    def is_configured(self) -> bool:
        # A test sender can only mail the Resend account owner. Refuse it for
        # any provider in production unless explicitly enabled for local dev.
        if self.uses_test_sender and not self.allow_test_sender:
            return False
        return self.uses_resend or self.uses_smtp

    def configuration_summary(self) -> dict:
        """Non-secret configuration status, safe for a diagnostics endpoint."""
        if self.uses_resend:
            provider = "resend"
        elif self.uses_smtp:
            provider = "smtp"
        else:
            provider = "none"

        if self.uses_test_sender and not self.allow_test_sender:
            issue = (
                "FROM_EMAIL is the Resend test sender (onboarding@resend.dev). "
                "Verify a domain in Resend and set FROM_EMAIL to an address on it "
                "(e.g. CampusGenie <no-reply@yourdomain.com>)."
            )
        elif provider == "none":
            issue = "Set RESEND_API_KEY (recommended) or SMTP_USERNAME/SMTP_PASSWORD."
        else:
            issue = None

        return {
            "configured": self.is_configured(),
            "provider": provider,
            "from_email": self.from_email,
            "using_test_sender": self.uses_test_sender,
            "issue": issue,
        }

    # ── Sending ──────────────────────────────────────────────────────────────

    def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
    ) -> bool:
        """Send an email via Resend API (preferred) or SMTP fallback."""
        self.last_error = None
        if not self.is_configured():
            self.last_error = self.configuration_summary()["issue"]
            logger.warning("Email not sent to %s: %s", to_email, self.last_error)
            return False

        if self.uses_resend:
            return self._send_via_resend(to_email, subject, html_content, text_content)
        return self._send_via_smtp(to_email, subject, html_content, text_content)

    def _send_via_resend(self, to_email: str, subject: str, html: str, text: Optional[str]) -> bool:
        payload = {
            "from": self.from_email,
            "to": [to_email],
            "subject": subject,
            "html": html,
        }
        if text:
            payload["text"] = text
        try:
            resp = requests.post(
                self.RESEND_API_URL,
                json=payload,
                headers={"Authorization": f"Bearer {self.resend_api_key}"},
                timeout=10,
            )
            if resp.status_code in (200, 201):
                logger.info("Email sent via Resend to %s", to_email)
                return True
            self.last_error = f"Resend API error {resp.status_code}: {resp.text[:300]}"
            logger.error("Resend send failed: %s", self.last_error)
            return False
        except Exception as exc:  # network / DNS / TLS problems
            self.last_error = f"Resend send failed: {exc}"
            logger.error("%s", self.last_error)
            return False

    def _send_via_smtp(self, to_email: str, subject: str, html: str, text: Optional[str]) -> bool:
        try:
            msg = MIMEMultipart("alternative")
            msg["From"] = self.from_email
            msg["To"] = to_email
            msg["Subject"] = subject
            if text:
                msg.attach(MIMEText(text, "plain"))
            msg.attach(MIMEText(html, "html"))
            with smtplib.SMTP(self.smtp_server, self.smtp_port, timeout=10) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)
            logger.info("Email sent via SMTP to %s", to_email)
            return True
        except Exception as exc:
            self.last_error = f"SMTP send failed: {exc}"
            logger.error("SMTP send failed to %s: %s", to_email, exc)
            return False

    # ── Credentials email template ──────────────────────────────────────────

    def send_credentials_email(
        self,
        to_email: str,
        student_name: str,
        login_email: str,
        password: str,
        account_type: str = "student",
    ) -> bool:
        """Send the real login credentials using the shared template."""
        subject, text_content = build_credentials_content(
            name=student_name,
            login_email=login_email,
            password=password,
            account_type=account_type,
        )
        return self.send_email(
            to_email=to_email,
            subject=subject,
            html_content=build_credentials_email(
                name=student_name,
                login_email=login_email,
                password=password,
                account_type=account_type,
            ),
            text_content=text_content,
        )


def build_credentials_content(
    name: str,
    login_email: str,
    password: str,
    account_type: str = "student",
) -> tuple[str, str]:
    """Return (subject, plain-text body) for a credentials email."""
    label = "Faculty" if account_type == "faculty" else "Student"
    subject = f"🎓 Your CampusGenie {label} Account Credentials"
    text_content = (
        f"Hello {name},\n\n"
        f"Your CampusGenie account has been created. Use these credentials to log in:\n\n"
        f"Login Email: {login_email}\n"
        f"Password: {password}\n\n"
        f"Login here: {os.getenv('FRONTEND_URL', 'https://campusgenie-ai-production-c6422709.up.railway.app')}\n\n"
        "Please change your password after your first login.\n\n"
        "Automated message from CampusGenie. Do not reply.\n"
    )
    return subject, text_content


def build_credentials_email(
    name: str,
    login_email: str,
    password: str,
    account_type: str = "student",
) -> str:
    """HTML email body for a new student/faculty account."""
    frontend_url = os.getenv(
        "FRONTEND_URL",
        "https://campusgenie-ai-production-c6422709.up.railway.app",
    )
    safe_name = html.escape(str(name))
    safe_login = html.escape(str(login_email))
    safe_password = html.escape(str(password))
    safe_url = html.escape(frontend_url, quote=True)

    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;background:#f3f4f6;padding:30px;margin:0">
<div style="max-width:520px;margin:auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08)">
  <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:30px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:1.5rem">🎓 CampusGenie</h1>
    <p style="color:rgba(255,255,255,.85);margin:6px 0 0;font-size:.9rem">AI-Powered University Portal</p>
  </div>
  <div style="padding:30px">
    <p style="color:#374151;margin:0 0 16px">Hello <strong>{safe_name}</strong>, welcome to CampusGenie!</p>
    <p style="color:#6b7280;margin:0 0 24px;line-height:1.6">Your account has been created. Here are your login credentials:</p>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:20px;margin-bottom:24px">
      <p style="margin:0 0 10px;color:#374151"><strong>Login Email:</strong> {safe_login}</p>
      <p style="margin:0;color:#374151"><strong>Password:</strong>
        <code style="background:#ede9fe;color:#5b21b6;padding:3px 8px;border-radius:4px">{safe_password}</code>
      </p>
    </div>
    <div style="background:#fef3c7;border-left:4px solid #f59e0b;border-radius:4px;padding:12px 16px;margin-bottom:24px">
      <p style="margin:0;color:#92400e;font-size:.88rem">⚠️ Please change your password after your first login.</p>
    </div>
    <div style="text-align:center">
      <a href="{safe_url}" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;padding:12px 32px;border-radius:999px;text-decoration:none;font-weight:600">
        Login to CampusGenie →
      </a>
    </div>
  </div>
  <div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px;text-align:center">
    <p style="margin:0;color:#9ca3af;font-size:.8rem">Automated message from CampusGenie. Do not reply.</p>
  </div>
</div>
</body></html>"""


email_service = EmailService()
