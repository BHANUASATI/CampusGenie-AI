"""Institution directory.

The auth screens offer an institution picker, and the set of accepted email
domains is configuration (`UNIVERSITY_EMAIL_DOMAINS`). Exposing that list as an
endpoint keeps the frontend from hard-coding domains that the backend may
reject, and gives the ERP a public directory page to grow into.
"""

from fastapi import APIRouter
from typing import List, Optional

from config import settings

router = APIRouter(prefix="/api/institutions", tags=["institutions"])


def _institution_for(domain: str) -> dict:
    """Build a directory entry for an email domain.

    The domain is authoritative. The name comes from INSTITUTION_NAMES when the
    operator configured one, and otherwise falls back to a title-cased guess —
    never a hard-coded list of real universities, which would be exactly the
    kind of fabricated content this product exists to avoid.
    """
    return {
        "id": domain,
        "name": settings.display_name_for(domain),
        "domain": domain,
        "email_domain": f"@{domain}",
    }


@router.get("")
def list_institutions() -> dict:
    """Domains this deployment accepts campus email from."""
    domains = settings.email_domains
    return {
        "institutions": [_institution_for(d) for d in domains],
        "count": len(domains),
        "multi_tenant": len(domains) > 1,
    }


@router.get("/resolve")
def resolve_institution(email: Optional[str] = None, domain: Optional[str] = None) -> dict:
    """Confirm an address belongs to a configured institution."""
    if domain:
        candidate = domain.strip().lstrip("@").lower()
        accepted = candidate in settings.email_domains
    elif email and "@" in email:
        candidate = email.strip().rsplit("@", 1)[-1].lower()
        accepted = candidate in settings.email_domains
    else:
        return {"accepted": False, "institution": None}

    return {
        "accepted": accepted,
        "institution": _institution_for(candidate) if accepted else None,
        "institutions": [
            _institution_for(d) for d in settings.email_domains
        ],
    }