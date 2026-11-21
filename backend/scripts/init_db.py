"""
Database initialisation script for Railway deployment.

Runs once on first deploy:
  1. Creates all SQLAlchemy tables (idempotent).
  2. Seeds departments if none exist.
  3. Seeds default user accounts if none exist.
  4. Ensures registrar has correct Faculty record + Registrar designation.
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
        # Always seed departments — idempotent
        _seed_departments(db)

        if db.query(User).count() > 0:
            # Existing DB — just ensure registrar is set up correctly
            _ensure_registrar(db)
            print("Users already exist — skipping user seed.")
            return

        print("Seeding default accounts …")
        dept = db.query(Department).first()

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

        faculty_seed = [
            (users["registrar@university.edu.in"], "REG001", "Registrar", "Office",  "Registrar"),
            (users["john.smith@university.edu.in"], "FAC001", "John",      "Smith",   "Professor"),
        ]
        for user, emp_id, first, last, designation in faculty_seed:
            db.add(Faculty(
                user_id=user.id,
                employee_id=emp_id,
                first_name=first,
                last_name=last,
                designation=designation,
                department_id=dept.id if dept else None,
                can_verify_documents=True,
                can_assign_tasks=True,
            ))

        db.commit()
        print(f"Seeded {len(accounts)} accounts.")
    finally:
        db.close()


def _seed_departments(db) -> None:
    """Seed a default school + departments if none exist — safe to call every boot."""
    from models import School
    if db.query(Department).count() > 0:
        return

    # Create a default school first (Department requires school_id)
    school = db.query(School).first()
    if not school:
        school = School(
            name="School of Engineering and Technology",
            code="SET",
            type="engineering_technology",
            description="School of Engineering and Technology",
        )
        db.add(school)
        db.flush()

    depts = [
        ("Computer Science",  "CS",  "computer_science",   "Computer Science and Engineering"),
        ("Electronics",        "EC",  "electronics",        "Electronics and Communication Engineering"),
        ("Mechanical",         "ME",  "mechanical",         "Mechanical Engineering"),
        ("Civil",              "CE",  "civil",              "Civil Engineering"),
        ("Mathematics",        "MA",  "mathematics",        "Mathematics and Statistics"),
    ]
    for name, code, dtype, desc in depts:
        db.add(Department(name=name, code=code, type=dtype, description=desc, school_id=school.id))
    db.commit()
    print(f"Seeded school + {len(depts)} departments.")


def _ensure_registrar(db) -> None:
    """Guarantee the registrar account has a Faculty record with Registrar designation."""
    reg_user = db.query(User).filter(User.email == "registrar@university.edu.in").first()
    if not reg_user:
        return
    faculty = db.query(Faculty).filter(Faculty.user_id == reg_user.id).first()
    if faculty:
        if "registrar" not in (faculty.designation or "").lower():
            faculty.designation = "Registrar"
            db.commit()
            print("Fixed registrar designation → Registrar")
    else:
        dept = db.query(Department).first()
        db.add(Faculty(
            user_id=reg_user.id,
            employee_id="REG001",
            first_name="Registrar",
            last_name="Office",
            designation="Registrar",
            department_id=dept.id if dept else None,
            can_verify_documents=True,
            can_assign_tasks=True,
        ))
        db.commit()
        print("Created missing Faculty record for registrar.")


if __name__ == "__main__":
    main()
