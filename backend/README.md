# CampusGenie Backend

FastAPI backend with PostgreSQL database for CampusGenie application.

## Project Structure

```
backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       └── auth.py          # Authentication endpoints (login/signup)
│   ├── core/
│   │   ├── config.py            # Application configuration
│   │   └── security.py          # Password hashing and JWT token generation
│   ├── db/
│   │   └── database.py          # Database connection and session management
│   ├── models/
│   │   └── user.py              # SQLAlchemy User model
│   ├── schemas/
│   │   └── user.py              # Pydantic schemas for request/response validation
│   └── main.py                  # FastAPI application entry point
├── requirements.txt             # Python dependencies
└── .env                         # Environment variables
```

## Setup Instructions

### Prerequisites

- Python 3.8+
- PostgreSQL database (pgAdmin or any PostgreSQL instance)

### Installation

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Configure environment variables:
   - Edit `.env` file with your PostgreSQL credentials:
   ```
   DATABASE_URL=postgresql://username:password@localhost:5432/database_name
   SECRET_KEY=your-secret-key-change-this-in-production
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=30
   ```

5. Create the database in PostgreSQL:
   - Open pgAdmin
   - Create a new database named `campusgenie` (or your preferred name)
   - Update the `DATABASE_URL` in `.env` accordingly

### Running the Application

Start the FastAPI server:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

### API Documentation

Once the server is running, access:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## API Endpoints

### Authentication

#### POST `/api/v1/auth/signup`
Register a new user

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "full_name": "John Doe",
  "password": "securepassword123"
}
```

**Response:** User object with id, email, username, etc.

#### POST `/api/v1/auth/login`
Login and get access token

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### Health Check

#### GET `/health`
Check API health status

**Response:**
```json
{
  "status": "healthy"
}
```

## Database Schema

### Users Table

| Column       | Type         | Description                    |
|--------------|--------------|--------------------------------|
| id           | Integer      | Primary key, auto-increment    |
| email        | String       | Unique, indexed                |
| username     | String       | Unique, indexed                |
| hashed_password | String    | Bcrypt hashed password         |
| full_name    | String       | Optional full name             |
| is_active    | Boolean      | Default: true                  |
| created_at   | DateTime     | Auto-generated timestamp       |
| updated_at   | DateTime     | Auto-updated on modification   |

## Security Features

- Password hashing using bcrypt
- JWT token-based authentication
- CORS enabled for frontend integration
- Input validation using Pydantic schemas
