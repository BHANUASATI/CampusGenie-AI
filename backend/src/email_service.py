import smtplib
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import os
import logging
import requests
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


class EmailService:
    def __init__(self):
        self.resend_api_key  = os.getenv("RESEND_API_KEY", "")
        self.smtp_server     = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port       = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_username   = os.getenv("SMTP_USERNAME", "")
        self.smtp_password   = os.getenv("SMTP_PASSWORD", "")
        self.from_email      = os.getenv("FROM_EMAIL", "onboarding@resend.dev")

        if self.resend_api_key and not self.resend_api_key.startswith("your-"):
            logger.info("✅ Email service configured via Resend API")
        elif self.smtp_username and self.smtp_password and not self.smtp_username.startswith("your-"):
            logger.info(f"✅ Email service configured via SMTP: {self.smtp_server}")
        else:
            logger.warning("⚠️ Email service not configured — set RESEND_API_KEY or SMTP credentials")

    def is_configured(self) -> bool:
        if self.resend_api_key and not self.resend_api_key.startswith("your-"):
            return True
        if (self.smtp_username and self.smtp_password
                and not self.smtp_username.startswith("your-")
                and not self.smtp_password.startswith("your-")):
            return True
        return False

    def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
    ) -> bool:
        """Send email via Resend API (preferred) or SMTP fallback."""
        if not self.is_configured():
            logger.warning("Email not configured — skipping send")
            return False

        # ── Resend API (works on Railway — HTTPS, no port blocking) ──────────
        if self.resend_api_key and not self.resend_api_key.startswith("your-"):
            return self._send_via_resend(to_email, subject, html_content, text_content)

        # ── SMTP fallback ─────────────────────────────────────────────────────
        return self._send_via_smtp(to_email, subject, html_content, text_content)

    def _send_via_resend(self, to_email: str, subject: str, html: str, text: Optional[str]) -> bool:
        """Send via Resend REST API — no port restrictions."""
        try:
            payload = {
                "from": self.from_email,
                "to": [to_email],
                "subject": subject,
                "html": html,
            }
            if text:
                payload["text"] = text
            resp = requests.post(
                "https://api.resend.com/emails",
                json=payload,
                headers={"Authorization": f"Bearer {self.resend_api_key}"},
                timeout=15,
            )
            if resp.status_code in (200, 201):
                logger.info(f"Email sent via Resend to {to_email}")
                return True
            else:
                logger.error(f"Resend error {resp.status_code}: {resp.text[:200]}")
                return False
        except Exception as e:
            logger.error(f"Resend send failed: {e}")
            return False

    def _send_via_smtp(self, to_email: str, subject: str, html: str, text: Optional[str]) -> bool:
        """Send via SMTP — may be blocked on some hosting platforms."""
        try:
            msg = MIMEMultipart("alternative")
            msg["From"]    = self.from_email
            msg["To"]      = to_email
            msg["Subject"] = subject
            if text:
                msg.attach(MIMEText(text, "plain"))
            msg.attach(MIMEText(html, "html"))
            with smtplib.SMTP(self.smtp_server, self.smtp_port, timeout=10) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)
            logger.info(f"Email sent via SMTP to {to_email}")
            return True
        except Exception as e:
            logger.error(f"SMTP send failed to {to_email}: {e}")
            return False


email_service = EmailService()