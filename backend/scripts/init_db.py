"""
Database initialisation script for Railway deployment.

Runs once on first deploy:
  1. Creates all SQLAlchemy tables (safe to re-run, uses CREATE IF NOT EXISTS).
  2. Seeds the default admin account if no users exist.
  3. Seeds the demo student account used by the "Demo Login" button.

Run from the backend/ directory:
    PYTHONPATH=src python3 scripts/init_db.py
"""
from __future__ import annotations
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from database import SessionLocal, engine
from models import Base, User
from calendar_models import Base as CalendarBase
from security import get_password_hash

def main() -> None:
    print("Creating tables …")
    Base.metadata.create_all(bind=engine)
    CalendarBase.metadata.create_all(bind=engine)
    print("Tables ready.")

    db = SessionLocal()
    try:
        if db.query(User).count() > 0:
            print("Users already exist — skipping seed.")
            return

        print("Seeding default accounts …")
        accounts = [
            ("admin@university.edu.in",      "admin123",      "admin"),
            ("registrar@university.edu.in",  "registrar123",  "faculty"),
            ("student@university.edu.in",    "student123",    "student"),
            ("john.smith@university.edu.in", "faculty123",    "faculty"),
        ]
        for email, password, role in accounts:
            user = User(
                email=email,
                password_hash=get_password_hash(password),
                role=role,
                is_active=True,
                email_verified=True,
            )
            db.add(user)
        db.commit()
        print(f"Seeded {len(accounts)} accounts.")
    finally:
        db.close()

if __name__ == "__main__":
    main()
