# CampusGenie Project Structure

This document describes the organized folder structure of the CampusGenie project.

## Root Directory Structure

```
NetACAD/
├── docs/                    # Project-wide documentation
├── scripts/                 # Shell scripts and utilities
├── tests/                   # Root-level test files
├── backend/                 # Backend application
├── frontend/                # Frontend React application
├── database/                # Database schemas and SQL files
├── .gitignore              # Git ignore rules
└── README.md               # Main project README
```

## Detailed Structure

### `/docs/` - Project Documentation
Contains all project-wide documentation files:
- `CALENDAR_API_DIAGNOSIS.md` - Calendar API troubleshooting
- `COURSE_SELECTION_GUIDE.md` - Course selection implementation guide
- `DOCUMENT_MANAGEMENT_IMPLEMENTATION.md` - Document management features
- `HOW_TO_USE_AI_ASSISTANT.md` - AI assistant usage guide
- `SCHOOL_COURSE_IMPLEMENTATION.md` - School course system documentation
- `document_verification_summary.md` - Document verification overview

### `/scripts/` - Utility Scripts
Shell scripts for project automation:
- `apply_animations.sh` - Apply dashboard animations
- `start_project.sh` - Project startup script

### `/tests/` - Root-Level Tests
Test files and HTML test pages:
- `animated_dashboard_login.html` - Animated login page test
- `auto_login.html` - Auto-login test page
- `modern_dashboard_login.html` - Modern login UI test
- `set_auth.html` - Authentication test page
- `test-admin-api.html` - Admin API test interface
- `create_test_user.py` - Test user creation script
- `test_document_api.py` - Document API tests
- `enhance_dashboard_animations.js` - Animation enhancement script

### `/backend/` - Backend Application

#### `/backend/src/` - Source Code
Core application code organized by functionality:
- **Routes**: `*_routes.py` files (admin, auth, calendar, document, faculty, registrar, school, student, task)
- **Models**: `*_models.py`, `database_models.py`, `models.py`
- **Schemas**: `*_schemas.py`, `pydantic_schemas.py`, `schemas.py`
- **Core**: `app.py`, `main.py`, `config.py`, `app_config.py`
- **Authentication**: `auth.py`, `security.py`, `dependencies.py`
- **Database**: `database.py`, `db_connection.py`
- **Services**: `ai_assistant.py`, `email_service.py`

#### `/backend/tests/` - Backend Tests
All test files for backend functionality:
- `test_ai_assistant.py` - AI assistant tests
- `test_api_call.py` - API call tests
- `test_api_endpoints.py` - Endpoint tests
- `test_auth.py` - Authentication tests
- `test_calendar_api.py` - Calendar API tests
- `test_complete_flow.py` - End-to-end flow tests
- `test_database.py` - Database tests
- `test_db.py` - Database connection tests
- `test_faculty_creation.py` - Faculty creation tests
- `test_mappings.py` - Data mapping tests
- `test_real_ai.py` - Real AI integration tests
- `test_realtime_models.py` - Real-time model tests
- `test_school_course_api.py` - School course API tests
- `test_upload.py` - File upload tests

#### `/backend/scripts/` - Backend Utilities
Database initialization, migration, and utility scripts:
- `add_missing_docs.py` - Add missing documentation
- `check_users.py` - User verification script
- `create_admin.py` - Admin user creation
- `create_registrar.py` - Registrar user creation
- `create_sample_faculty.py` - Sample faculty data generation
- `debug_ai.py` - AI debugging utilities
- `debug_upload.py` - Upload debugging utilities
- `demo_course_selection.py` - Course selection demo
- `fix_document_paths.py` - Document path correction
- `init_db.py` - Database initialization
- `init_db_simple.py` - Simple database initialization
- `migrate_department.py` - Department migration
- `migrate_faculty.py` - Faculty migration
- `run_migration.py` - Migration runner
- `setup_users.py` - User setup script

#### `/backend/docs/` - Backend Documentation
Backend-specific documentation:
- `ADMIN_SETUP.md` - Admin setup instructions
- `AI_SETUP_INSTRUCTIONS.md` - AI configuration guide
- `BACKEND_README.md` - Backend overview
- `ENABLE_REAL_AI.md` - Real AI enablement guide
- `GEMINI_API_SETUP.md` - Gemini API setup
- `README.md` - Backend README

#### `/backend/migrations/` - Database Migrations
Directory for database migration files (currently empty, ready for future migrations)

#### Other Backend Files
- `.env` - Environment variables (not tracked in git)
- `requirements.txt` - Python dependencies
- `requirements_new.txt` - Updated dependencies
- `netacad.db` - SQLite database (development)
- `university.db` - University database
- `uploads/` - Uploaded files directory
- `venv/` - Python virtual environment (not tracked in git)

### `/frontend/` - Frontend Application
React-based frontend application with:
- `src/` - Source code
- `public/` - Public assets
- `build/` - Production build (not tracked in git)
- `node_modules/` - Dependencies (not tracked in git)
- Configuration files: `package.json`, `tailwind.config.js`, `tsconfig.json`, etc.

### `/database/` - Database Files
SQL schemas and database documentation:
- `API_ENDPOINTS.md` - API endpoint documentation
- `MYSQL_FIX_NOTES.md` - MySQL troubleshooting
- `README.md` - Database README
- `SCHEMA_DOCUMENTATION.md` - Schema documentation
- `database_schema_mysql_final.sql` - MySQL schema
- `sample_data*.sql` - Sample data files
- `school_course_migration.sql` - School course migration

## Benefits of This Structure

1. **Clear Separation**: Source code, tests, documentation, and scripts are clearly separated
2. **Easy Navigation**: Files are grouped by purpose, making them easier to find
3. **Scalability**: Structure supports project growth with dedicated directories for each component
4. **Maintainability**: Organized structure makes maintenance and onboarding easier
5. **Best Practices**: Follows industry-standard project organization patterns

## Quick Reference

- **Need to run the project?** → Check `/scripts/start_project.sh`
- **Looking for documentation?** → Check `/docs/` or `/backend/docs/`
- **Need to test something?** → Check `/tests/` or `/backend/tests/`
- **Want to modify backend code?** → Check `/backend/src/`
- **Need to initialize database?** → Check `/backend/scripts/init_db.py`
- **Looking for API docs?** → Check `/database/API_ENDPOINTS.md`
