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
from models import Base, User, Faculty, Department
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
            # Users exist — but make sure registrar has correct designation
            _ensure_registrar_designation(db)
            print("Users already exist — skipping seed.")
            return

        print("Seeding default accounts …")

        # Seed a default department first
        dept = db.query(Department).first()
        if not dept:
            dept = Department(name="Computer Science", code="CS", description="Computer Science and Engineering")
            db.add(dept)
            db.flush()

        accounts = [
            ("admin@university.edu.in",      "admin123",      "admin"),
            ("registrar@university.edu.in",  "registrar123",  "faculty"),
            ("student@university.edu.in",    "student123",    "student"),
            ("john.smith@university.edu.in", "faculty123",    "faculty"),
        ]
        users = {}
        for email, password, role in accounts:
            user = User(
                email=email,
                password_hash=get_password_hash(password),
                role=role,
                is_active=True,
                email_verified=True,
            )
            db.add(user)
            db.flush()
            users[email] = user

        # Create Faculty records for faculty/registrar accounts
        faculty_records = [
            (users["registrar@university.edu.in"], "REG001", "Registrar", "Registrar"),
            (users["john.smith@university.edu.in"], "FAC001", "John", "Smith"),
        ]
        for user, emp_id, first, last in faculty_records:
            faculty = Faculty(
                user_id=user.id,
                employee_id=emp_id,
                first_name=first,
                last_name=last,
                designation="Registrar" if "REG" in emp_id else "Professor",
                department_id=dept.id,
                can_verify_documents=True,
                can_assign_tasks=True,
            )
            db.add(faculty)

        db.commit()
        print(f"Seeded {len(accounts)} accounts with faculty records.")
    finally:
        db.close()


def _ensure_registrar_designation(db) -> None:
    """Make sure the registrar user has a Faculty record with Registrar designation."""
    reg_user = db.query(User).filter(User.email == "registrar@university.edu.in").first()
    if not reg_user:
        return
    faculty = db.query(Faculty).filter(Faculty.user_id == reg_user.id).first()
    if faculty and "registrar" not in (faculty.designation or "").lower():
        faculty.designation = "Registrar"
        db.commit()
        print(f"Fixed registrar designation: {faculty.designation} → Registrar")

if __name__ == "__main__":
    main()
