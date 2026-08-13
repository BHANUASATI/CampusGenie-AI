# API Endpoints Documentation Updated

## Authentication Endpoints

### POST /api/auth/login
**Description**: User login with email and password
**Request Body**:
```json
{
  "email": "string",
  "password": "string"
}
```
**Response**:
```json
{
  "success": true,
  "token": "jwt_token",
  "user": {
    "id": 1,
    "email": "user@university.edu.in",
    "role": "student|faculty|admin",
    "profile": {}
  }
}
```

### POST /api/auth/logout
**Description**: User logout
**Headers**: `Authorization: Bearer <token>`
**Response**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### GET /api/auth/me
**Description**: Get current user profile
**Headers**: `Authorization: Bearer <token>`
**Response**:
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@university.edu.in",
    "role": "student",
    "profile": {
      "firstName": "John",
      "lastName": "Doe",
      "documentsVerified": true
    }
  }
}
```

## Admin Endpoints

### POST /api/admin/users/create
**Description**: Create new user (student/faculty) with credentials
**Headers**: `Authorization: Bearer <admin_token>`
**Request Body**:
```json
{
  "email": "student@university.edu.in",
  "password": "password123",
  "role": "student",
  "profile": {
    "firstName": "John",
    "lastName": "Doe",
    "enrollmentNumber": "2024CS001",
    "departmentId": 1
  }
}
```

### GET /api/admin/students
**Description**: Get all students with verification status
**Headers**: `Authorization: Bearer <admin_token>`
**Response**:
```json
{
  "success": true,
  "students": [
    {
      "id": 1,
      "enrollmentNumber": "2024CS001",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@university.edu.in",
      "documentsVerified": true,
      "verificationStatus": "verified",
      "totalDocuments": 6,
      "verifiedDocuments": 6,
      "pendingDocuments": 0
    }
  ]
}
```

### GET /api/admin/faculty
**Description**: Get all faculty members
**Headers**: `Authorization: Bearer <admin_token>`
**Response**:
```json
{
  "success": true,
  "faculty": [
    {
      "id": 1,
      "employeeId": "FAC001",
      "firstName": "John",
      "lastName": "Smith",
      "email": "john.smith@university.edu.in",
      "department": "Computer Science",
      "isActive": true,
      "canVerifyDocuments": true,
      "canAssignTasks": true
    }
  ]
}
```

### POST /api/admin/faculty/add
**Description**: Add new faculty member
**Headers**: `Authorization: Bearer <admin_token>`
**Request Body**:
```json
{
  "email": "faculty@university.edu.in",
  "password": "password123",
  "firstName": "Jane",
  "lastName": "Smith",
  "employeeId": "FAC002",
  "departmentId": 1,
  "specialization": "Database Systems",
  "designation": "Assistant Professor"
}
```

### DELETE /api/admin/faculty/:id
**Description**: Remove faculty member
**Headers**: `Authorization: Bearer <admin_token>`
**Response**:
```json
{
  "success": true,
  "message": "Faculty member removed successfully"
}
```

## Student Endpoints

### GET /api/student/dashboard
**Description**: Get student dashboard (only if documents verified)
**Headers**: `Authorization: Bearer <student_token>`
**Response**:
```json
{
  "success": true,
  "dashboard": {
    "profile": {
      "firstName": "John",
      "lastName": "Doe",
      "enrollmentNumber": "2024CS001",
      "semester": 3,
      "gpa": 8.5,
      "attendancePercentage": 92.5
    },
    "tasks": [
      {
        "id": 1,
        "title": "Database Design Project",
        "priority": "high",
        "dueDate": "2026-03-15T23:59:59Z",
        "submissionStatus": "submitted",
        "marksObtained": 92
      }
    ],
    "notifications": [
      {
        "id": 1,
        "title": "Documents Verified",
        "message": "All your documents have been verified",
        "type": "success",
        "isRead": false
      }
    ]
  }
}
```

### GET /api/student/documents
**Description**: Get student's uploaded documents
**Headers**: `Authorization: Bearer <student_token>`
**Response**:
```json
{
  "success": true,
  "documents": [
    {
      "id": 1,
      "documentType": "Birth Certificate",
      "fileName": "birth_certificate.pdf",
      "fileSize": 1.2,
      "verificationStatus": "verified",
      "uploadedAt": "2026-02-01T10:00:00Z",
      "verifiedAt": "2026-02-01T10:30:00Z"
    }
  ]
}
```

### POST /api/student/documents/upload
**Description**: Upload document
**Headers**: `Authorization: Bearer <student_token>`
**Request**: `multipart/form-data`
- `document`: File
- `documentTypeId`: Integer
**Response**:
```json
{
  "success": true,
  "message": "Document uploaded successfully",
  "document": {
    "id": 1,
    "fileName": "birth_certificate.pdf",
    "verificationStatus": "pending"
  }
}
```

### GET /api/student/tasks
**Description**: Get tasks assigned to student
**Headers**: `Authorization: Bearer <student_token>`
**Response**:
```json
{
  "success": true,
  "tasks": [
    {
      "id": 1,
      "title": "Database Design Project",
      "description": "Design a complete database schema...",
      "priority": "high",
      "dueDate": "2026-03-15T23:59:59Z",
      "maxMarks": 100,
      "submissionStatus": "submitted",
      "marksObtained": 92,
      "feedback": "Excellent work!",
      "assignedBy": "John Smith"
    }
  ]
}
```

### POST /api/student/tasks/:id/submit
**Description**: Submit task
**Headers**: `Authorization: Bearer <student_token>`
**Request**: `multipart/form-data`
- `submissionText`: String (optional)
- `file`: File (optional)
**Response**:
```json
{
  "success": true,
  "message": "Task submitted successfully",
  "submission": {
    "id": 1,
    "submissionStatus": "submitted",
    "submittedAt": "2026-03-14T15:30:00Z"
  }
}
```

## Faculty Endpoints

### GET /api/faculty/documents/pending
**Description**: Get documents pending verification
**Headers**: `Authorization: Bearer <faculty_token>`
**Response**:
```json
{
  "success": true,
  "documents": [
    {
      "id": 1,
      "student": {
        "id": 1,
        "enrollmentNumber": "2024CS002",
        "firstName": "Priya",
        "lastName": "Sharma"
      },
      "documentType": "Birth Certificate",
      "fileName": "birth_certificate.pdf",
      "uploadedAt": "2026-02-02T11:00:00Z"
    }
  ]
}
```

### POST /api/faculty/documents/:id/verify
**Description**: Verify or reject document
**Headers**: `Authorization: Bearer <faculty_token>`
**Request Body**:
```json
{
  "action": "verify|reject",
  "notes": "Optional verification notes",
  "rejectionReason": "Reason for rejection (if rejected)"
}
```
**Response**:
```json
{
  "success": true,
  "message": "Document verified successfully"
}
```

### GET /api/faculty/tasks
**Description**: Get tasks assigned by faculty
**Headers**: `Authorization: Bearer <faculty_token>`
**Response**:
```json
{
  "success": true,
  "tasks": [
    {
      "id": 1,
      "title": "Database Design Project",
      "assignedTo": {
        "id": 1,
        "enrollmentNumber": "2024CS001",
        "firstName": "John",
        "lastName": "Doe"
      },
      "priority": "high",
      "dueDate": "2026-03-15T23:59:59Z",
      "status": "published",
      "submissionsCount": 1,
      "pendingGradingCount": 0
    }
  ]
}
```

### POST /api/faculty/tasks
**Description**: Create new task
**Headers**: `Authorization: Bearer <faculty_token>`
**Request Body**:
```json
{
  "title": "New Assignment",
  "description": "Assignment description",
  "assignedTo": 1, // or null for department-wide
  "departmentId": 1, // or null for individual
  "taskType": "assignment",
  "priority": "medium",
  "dueDate": "2026-03-20T23:59:59Z",
  "maxMarks": 50
}
```

### GET /api/faculty/tasks/:id/submissions
**Description**: Get task submissions
**Headers**: `Authorization: Bearer <faculty_token>`
**Response**:
```json
{
  "success": true,
  "submissions": [
    {
      "id": 1,
      "student": {
        "id": 1,
        "enrollmentNumber": "2024CS001",
        "firstName": "John",
        "lastName": "Doe"
      },
      "submissionText": "Submission text...",
      "fileName": "assignment.pdf",
      "submissionStatus": "submitted",
      "submittedAt": "2026-03-14T15:30:00Z",
      "marksObtained": null,
      "feedback": null
    }
  ]
}
```

### POST /api/faculty/submissions/:id/grade
**Description**: Grade submission
**Headers**: `Authorization: Bearer <faculty_token>`
**Request Body**:
```json
{
  "marksObtained": 92,
  "feedback": "Excellent work! Well done."
}
```
**Response**:
```json
{
  "success": true,
  "message": "Submission graded successfully"
}
```

## Utility Endpoints

### GET /api/document-types
**Description**: Get all document types
**Headers**: `Authorization: Bearer <token>`
**Response**:
```json
{
  "success": true,
  "documentTypes": [
    {
      "id": 1,
      "name": "Birth Certificate",
      "description": "Official birth certificate",
      "isRequired": true,
      "maxFileSizeMb": 5,
      "allowedExtensions": ["pdf", "jpg", "jpeg"]
    }
  ]
}
```

### GET /api/departments
**Description**: Get all departments
**Headers**: `Authorization: Bearer <token>`
**Response**:
```json
{
  "success": true,
  "departments": [
    {
      "id": 1,
      "name": "Computer Science",
      "code": "CS",
      "description": "Computer Science and Engineering"
    }
  ]
}
```

### GET /api/notifications
**Description**: Get user notifications
**Headers**: `Authorization: Bearer <token>`
**Response**:
```json
{
  "success": true,
  "notifications": [
    {
      "id": 1,
      "title": "Documents Verified",
      "message": "All your documents have been verified",
      "type": "success",
      "isRead": false,
      "createdAt": "2026-02-21T09:00:00Z",
      "actionUrl": "/dashboard"
    }
  ]
}
```

### PUT /api/notifications/:id/read
**Description**: Mark notification as read
**Headers**: `Authorization: Bearer <token>`
**Response**:
```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

## Error Responses

All endpoints return error responses in this format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "reason": "Invalid email format"
    }
  }
}
```

### Common Error Codes

- `UNAUTHORIZED`: Invalid or missing authentication token
- `FORBIDDEN`: User doesn't have permission for this action
- `VALIDATION_ERROR`: Invalid input data
- `NOT_FOUND`: Resource not found
- `FILE_TOO_LARGE`: Uploaded file exceeds size limit
- `INVALID_FILE_TYPE`: Uploaded file type not allowed
- `DUPLICATE_ENTRY`: Resource already exists
- `SERVER_ERROR`: Internal server error

## File Upload Requirements

### Document Upload
- **Max File Size**: 5MB (configurable per document type)
- **Allowed Formats**: PDF, JPG, JPEG, PNG (configurable per document type)
- **Storage Path**: `/uploads/documents/{enrollment_number}/`

### Task Submission
- **Max File Size**: 10MB
- **Allowed Formats**: PDF, DOC, DOCX, ZIP, JPG, PNG
- **Storage Path**: `/uploads/submissions/{task_id}/`

## Authentication Flow

1. **Login**: User provides email and password
2. **Token Generation**: Server generates JWT token with user ID and role
3. **Token Validation**: All protected routes validate the token
4. **Role-Based Access**: Each endpoint checks user role for authorization

## Dashboard Access Control

Students can only access the dashboard if:
```sql
documents_verified = TRUE AND verification_status = 'verified'
```

This check is performed on every dashboard request to ensure only verified students have access.
