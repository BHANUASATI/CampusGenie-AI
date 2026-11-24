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
    """Sends CampusGenie account emails via Resend or SMTP (no domain needed).

    Resend's `onboarding@resend.dev` address is a *test* sender: it can only
    deliver to the email address that owns the Resend account. It must never be
    used as the production `from` address for student/faculty credentials.

    For deployments without a verified domain, either use Brevo's HTTPS API
    with a verified personal sender, or EMAIL_PROVIDER=smtp with a mailbox app
    password. SMTP on port 465 uses SSL; other ports use STARTTLS.
    """

    RESEND_API_URL = "https://api.resend.com/emails"
    BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"
    TEST_SENDER_RE = re.compile(r"@resend\.dev>?\s*$", re.IGNORECASE)

    def __init__(self):
        self.email_provider = os.getenv("EMAIL_PROVIDER", "auto").strip().lower()
        self.resend_api_key = os.getenv("RESEND_API_KEY", "")
        self.brevo_api_key = os.getenv("BREVO_API_KEY", "")
        self.brevo_from_email = os.getenv("BREVO_FROM_EMAIL", "")
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_username = os.getenv("SMTP_USERNAME", "")
        self.smtp_password = os.getenv("SMTP_PASSWORD", "")
        self.smtp_use_ssl = self.smtp_port == 465 or os.getenv(
            "SMTP_USE_SSL", ""
        ).lower() in ("1", "true", "yes")

        # RESEND_FROM_EMAIL wins so a verified sender can be configured without
        # changing generic SMTP settings. FROM_EMAIL remains backwards compatible.
        # The Resend candidate sender is tracked separately so a Brevo/SMTP
        # sender never masks Resend's test-sender restriction in auto mode.
        self.resend_from_email = (
            os.getenv("RESEND_FROM_EMAIL")
            or os.getenv("FROM_EMAIL")
            or "onboarding@resend.dev"
        )
        explicit_from = (
            os.getenv("RESEND_FROM_EMAIL")
            or self.brevo_from_email
            or os.getenv("FROM_EMAIL")
        )
        self.from_email = explicit_from or self.resend_from_email
        self.allow_test_sender = os.getenv("ALLOW_RESEND_TEST_SENDER", "").lower() in (
            "1", "true", "yes"
        )

        # Resolve once, before changing from_email: the Resend test sender check
        # depends on the original FROM_EMAIL value.
        self._provider = self._resolve_provider()

        # A stale FROM_EMAIL=onboarding@resend.dev must not be used as the
        # envelope sender when delivering through SMTP: the mail host rejects
        # addresses on domains the account does not own.
        if self._provider == "smtp" and self.uses_test_sender:
            self.from_email = self.smtp_username
        if self._provider == "brevo" and self.uses_test_sender:
            self.from_email = self.brevo_from_email

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
    def uses_brevo(self) -> bool:
        return bool(self.brevo_api_key and not self.brevo_api_key.startswith("your-"))

    @property
    def uses_test_sender(self) -> bool:
        return bool(self.TEST_SENDER_RE.search(self.resend_from_email))

    def _resolve_provider(self) -> str:
        """Decide which delivery method the configuration resolves to."""
        if self.email_provider in ("resend", "smtp", "brevo"):
            return self.email_provider
        # Auto: prefer Resend only when it will not be blocked by the test
        # sender. Otherwise fall back to the configured no-domain providers.
        if self.uses_resend and (not self.uses_test_sender or self.allow_test_sender):
            return "resend"
        if (
            self.uses_brevo
            and self.brevo_from_email
            and not self.TEST_SENDER_RE.search(self.brevo_from_email)
        ):
            return "brevo"
        if self.uses_smtp:
            return "smtp"
        if self.uses_resend:
            return "resend"
        return "none"

    @property
    def provider(self) -> str:
        """Delivery method resolved at startup (cached so it cannot flip)."""
        return self._provider

    def is_configured(self) -> bool:
        provider = self.provider
        if provider == "resend":
            return self.uses_resend and (
                not self.uses_test_sender or self.allow_test_sender
            )
        if provider == "smtp":
            return self.uses_smtp
        if provider == "brevo":
            return self.uses_brevo and bool(self.from_email)
        return False

    def configuration_summary(self) -> dict:
        """Non-secret configuration status, safe for a diagnostics endpoint."""
        provider = self.provider

        if provider == "resend" and not self.uses_resend:
            issue = (
                "Set RESEND_API_KEY, or set EMAIL_PROVIDER=brevo or EMAIL_PROVIDER=smtp."
            )
        elif provider == "resend" and self.uses_test_sender and not self.allow_test_sender:
            issue = (
                "FROM_EMAIL is the Resend test sender (onboarding@resend.dev). "
                "Verify a domain in Resend, or set EMAIL_PROVIDER=brevo / smtp to "
                "send without a domain."
            )
        elif provider == "smtp" and not self.uses_smtp:
            issue = (
                "Set SMTP_USERNAME and SMTP_PASSWORD (Gmail needs a 16-character "
                "App Password, not the normal account password)."
            )
        elif provider == "brevo" and not self.uses_brevo:
            issue = "Set BREVO_API_KEY (free Brevo account, no domain needed)."
        elif provider == "brevo" and not self.from_email:
            issue = "Set BREVO_FROM_EMAIL to the sender you verified in Brevo."
        elif provider == "none":
            issue = "Set BREVO_API_KEY, SMTP_USERNAME/SMTP_PASSWORD or RESEND_API_KEY."
        else:
            issue = None

        return {
            "configured": self.is_configured(),
            "provider": provider,
            "from_email": self.from_email,
            "using_test_sender": self.uses_test_sender and provider == "resend",
            "smtp_use_ssl": self.smtp_use_ssl,
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
        """Send an email via the configured provider (Resend API or SMTP)."""
        self.last_error = None
        if not self.is_configured():
            self.last_error = self.configuration_summary()["issue"]
            logger.warning("Email not sent to %s: %s", to_email, self.last_error)
            return False

        if self.provider == "resend":
            return self._send_via_resend(to_email, subject, html_content, text_content)
        if self.provider == "brevo":
            return self._send_via_brevo(to_email, subject, html_content, text_content)
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

    def _send_via_brevo(self, to_email: str, subject: str, html: str, text: Optional[str]) -> bool:
        """Send via Brevo HTTPS API — no domain needed, only a verified sender."""
        match = re.match(r"^(.*?)<([^>]+)>$", self.from_email)
        sender_name = (match.group(1).strip().strip('"') or "CampusGenie") if match else "CampusGenie"
        sender_email = match.group(2) if match else self.from_email
        payload = {
            "sender": {"name": sender_name, "email": sender_email},
            "to": [{"email": to_email}],
            "subject": subject,
            "htmlContent": html,
        }
        if text:
            payload["textContent"] = text
        try:
            resp = requests.post(
                self.BREVO_API_URL,
                json=payload,
                headers={"api-key": self.brevo_api_key, "Content-Type": "application/json"},
                timeout=10,
            )
            if resp.status_code in (200, 201, 202):
                logger.info("Email sent via Brevo to %s", to_email)
                return True
            self.last_error = f"Brevo API error {resp.status_code}: {resp.text[:300]}"
            logger.error("Brevo send failed: %s", self.last_error)
            return False
        except Exception as exc:
            self.last_error = f"Brevo send failed: {exc}"
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

            if self.smtp_use_ssl:
                server = smtplib.SMTP_SSL(self.smtp_server, self.smtp_port, timeout=10)
            else:
                server = smtplib.SMTP(self.smtp_server, self.smtp_port, timeout=10)
                server.starttls()
            with server:
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)
            logger.info("Email sent via SMTP to %s", to_email)
            return True
        except Exception as exc:
            detail = str(exc)
            if "535" in detail or "authentication" in detail.lower():
                detail += (
                    " — use a Gmail App Password (16 characters), not your "
                    "normal Gmail password"
                )
            self.last_error = f"SMTP send failed: {detail}"
            logger.error("SMTP send failed to %s: %s", to_email, detail)
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
