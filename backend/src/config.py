from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from typing import Optional
import os
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    model_config = ConfigDict(
        env_file=".env",
        extra="ignore"  # Allow extra fields in .env
    )
    # Database
    DATABASE_URL: str = "mysql+mysqlconnector://root:@localhost:3306/CampusGenie"
    
    # JWT
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    # Lifetime when the user asks to stay signed in. Long enough to not be
    # re-prompted every day, short enough that a lost laptop still self-heals.
    REMEMBER_ME_EXPIRE_DAYS: int = 30
    
    # CORS
    ALLOWED_ORIGINS: list = ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:3003", "http://localhost:3004", "http://localhost:3005", "http://localhost:3006"]
    
    # University Email Domain
    #
    # Single-tenant deployments set UNIVERSITY_EMAIL_DOMAIN. CampusGenie ERP is
    # multi-tenant, so a deployment serving several institutions sets
    # UNIVERSITY_EMAIL_DOMAINS instead (comma-separated). The singular value is
    # always accepted, and is the default when the plural is empty, so existing
    # deployments keep working untouched.
    UNIVERSITY_EMAIL_DOMAIN: str = "university.edu.in"
    UNIVERSITY_EMAIL_DOMAINS: Optional[str] = None
    # Display names for the above, as "domain=Proper Name" pairs, comma
    # separated: "krmu.ac.in=K.R. Mangalam University". Names not listed here
    # fall back to a title-cased guess from the domain, which is usually wrong
    # and should be overridden for anything a user will see.
    INSTITUTION_NAMES: Optional[str] = None
    
    @property
    def email_domains(self) -> list[str]:
        """Every email domain this deployment accepts, lowercase, no `@`."""
        domains = [
            d.strip().lstrip("@").lower()
            for d in (self.UNIVERSITY_EMAIL_DOMAINS or "").split(",")
            if d.strip()
        ]
        legacy = self.UNIVERSITY_EMAIL_DOMAIN.strip().lstrip("@").lower()
        if legacy and legacy not in domains:
            domains.append(legacy)
        return domains or ["university.edu.in"]

    @property
    def institution_names(self) -> dict[str, str]:
        """Display names keyed by domain, parsed from INSTITUTION_NAMES."""
        names: dict[str, str] = {}
        for pair in (self.INSTITUTION_NAMES or "").split(","):
            if "=" not in pair:
                continue
            domain, _, label = pair.partition("=")
            domain = domain.strip().lstrip("@").lower()
            label = label.strip()
            if domain and label:
                names[domain] = label
        return names

    def display_name_for(self, domain: str) -> str:
        """Human name for a domain: configured first, then a derived guess."""
        domain = domain.strip().lstrip("@").lower()
        configured = self.institution_names.get(domain)
        if configured:
            return configured
        # "krmu.ac.in" -> "Krmu". A fallback, not a claim of the real name.
        return domain.split(".")[0].replace("-", " ").title()
    
    # Email Configuration
    SMTP_SERVER: str = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME: str = os.getenv("SMTP_USERNAME", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    FROM_EMAIL: str = os.getenv("FROM_EMAIL", "")
    
    # OpenAI Configuration (deprecated - using Gemini instead)
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY")

    # Google Gemini Configuration
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY")
    
    # Microsoft Azure AD Configuration
    AZURE_CLIENT_ID: Optional[str] = os.getenv("AZURE_CLIENT_ID")
    AZURE_CLIENT_SECRET: Optional[str] = os.getenv("AZURE_CLIENT_SECRET")
    AZURE_TENANT_ID: Optional[str] = os.getenv("AZURE_TENANT_ID", "38fd5a4b-955f-455a-9ad2-d2daa5a4e4d0")
    AZURE_REDIRECT_URI: str = os.getenv("AZURE_REDIRECT_URI", "http://localhost:3000/auth/callback")

# Create global settings instance
settings = Settings()


def email_domain_of(email: str) -> str:
    """Return the lowercase domain part of an email address."""
    return email.strip().rsplit("@", 1)[-1].lower() if "@" in email else ""


def is_accepted_email(email: str) -> bool:
    """True when the address belongs to an institution on this deployment.

    Used everywhere a campus email is validated, so adding an institution is a
    config change rather than a code change.
    """
    return email_domain_of(email) in settings.email_domains


def accepted_domain_error(email: str) -> str:
    """Human-readable rejection message naming every accepted institution."""
    domains = settings.email_domains
    if len(domains) == 1:
        return f"Email must be from the {domains[0]} domain"
    return f"Email must be from one of these domains: {', '.join(f'@{d}' for d in domains)}"
