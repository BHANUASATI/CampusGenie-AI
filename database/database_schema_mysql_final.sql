-- University Document Management System Schema - MySQL Compatible Version
-- Created: 2026-02-21
-- Description: Complete schema for student document verification and task management system
-- Compatible with MySQL 5.6+ and MariaDB 10.0+
-- Database
USE CampusGenie;
-- Drop existing tables if they exist (for development)
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS task_submissions;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS student_documents;
DROP TABLE IF EXISTS document_types;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS faculties;
DROP TABLE IF EXISTS admins;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS departments;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Departments Table (for organization)
CREATE TABLE departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(10) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Users Table (Base authentication table)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('student', 'faculty', 'admin') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 3. Faculties Table (Faculty-specific information) - MOVED BEFORE STUDENTS
CREATE TABLE faculties (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    employee_id VARCHAR(50) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    specialization VARCHAR(100),
    designation VARCHAR(100),
    department_id INT,
    is_active BOOLEAN DEFAULT TRUE,
    can_verify_documents BOOLEAN DEFAULT TRUE,
    can_assign_tasks BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- 4. Admins Table (Admin-specific information)
CREATE TABLE admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    department_id INT,
    permissions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- 5. Students Table (Student-specific information) - MOVED AFTER FACULTIES
CREATE TABLE students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    enrollment_number VARCHAR(50) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    date_of_birth DATE,
    gender ENUM('male', 'female', 'other'),
    blood_group VARCHAR(5),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    department_id INT,
    semester INT DEFAULT 1,
    batch VARCHAR(20),
    admission_year INT,
    gpa DECIMAL(3,2) DEFAULT 0.00,
    attendance_percentage DECIMAL(5,2) DEFAULT 0.00,
    documents_verified BOOLEAN DEFAULT FALSE,
    verification_status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
    verified_by INT NULL,
    verified_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id),
    FOREIGN KEY (verified_by) REFERENCES faculties(id)
);

-- 6. Document Types Table (Types of documents students can upload)
CREATE TABLE document_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_required BOOLEAN DEFAULT TRUE,
    max_file_size_mb INT DEFAULT 5,
    allowed_extensions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 7. Student Documents Table (Document uploads and verification)
CREATE TABLE student_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    document_type_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size_mb DECIMAL(8,2) NOT NULL,
    file_extension VARCHAR(10) NOT NULL,
    upload_status ENUM('uploaded', 'processing', 'verified', 'rejected') DEFAULT 'uploaded',
    verification_status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
    verified_by INT NULL,
    verification_notes TEXT,
    rejection_reason TEXT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (document_type_id) REFERENCES document_types(id),
    FOREIGN KEY (verified_by) REFERENCES faculties(id),
    UNIQUE KEY unique_student_document (student_id, document_type_id)
);

-- 8. Tasks Table (Tasks assigned by faculty to students)
CREATE TABLE tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    assigned_by INT NOT NULL,
    assigned_to INT NULL,
    department_id INT NULL,
    task_type ENUM('assignment', 'project', 'exam', 'general') DEFAULT 'general',
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    due_date TIMESTAMP NULL,
    max_marks INT DEFAULT 100,
    status ENUM('draft', 'published', 'closed') DEFAULT 'draft',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_by) REFERENCES faculties(id),
    FOREIGN KEY (assigned_to) REFERENCES students(id),
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- 9. Task Submissions Table (Student submissions for tasks)
CREATE TABLE task_submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT NOT NULL,
    student_id INT NOT NULL,
    file_name VARCHAR(255) NULL,
    file_path VARCHAR(500) NULL,
    submission_text TEXT NULL,
    submission_status ENUM('not_submitted', 'submitted', 'graded', 'late') DEFAULT 'not_submitted',
    marks_obtained INT NULL,
    feedback TEXT NULL,
    graded_by INT NULL,
    submitted_at TIMESTAMP NULL,
    graded_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (graded_by) REFERENCES faculties(id),
    UNIQUE KEY unique_task_submission (task_id, student_id)
);

-- 10. Audit Log Table (Track all important actions)
CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(50) NULL,
    record_id INT NULL,
    old_values TEXT NULL,
    new_values TEXT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 11. Notifications Table (System notifications)
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    notification_type ENUM('info', 'success', 'warning', 'error') DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    action_url VARCHAR(500) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_students_enrollment ON students(enrollment_number);
CREATE INDEX idx_students_verification ON students(verification_status);
CREATE INDEX idx_faculties_employee ON faculties(employee_id);
CREATE INDEX idx_student_documents_student ON student_documents(student_id);
CREATE INDEX idx_student_documents_status ON student_documents(verification_status);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_department ON tasks(department_id);
CREATE INDEX idx_task_submissions_student ON task_submissions(student_id);
CREATE INDEX idx_task_submissions_task ON task_submissions(task_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- Insert initial data

-- Insert departments
INSERT INTO departments (name, code, description) VALUES
('Computer Science', 'CS', 'Computer Science and Engineering Department'),
('Electronics', 'EC', 'Electronics and Communication Engineering'),
('Mechanical', 'ME', 'Mechanical Engineering Department'),
('Civil', 'CE', 'Civil Engineering Department'),
('Electrical', 'EE', 'Electrical Engineering Department');

-- Insert document types with explicit values
INSERT INTO document_types (name, description, is_required, max_file_size_mb, allowed_extensions) VALUES
('Birth Certificate', 'Official birth certificate document', TRUE, 5, '[\"pdf\", \"jpg\", \"jpeg\"]'),
('Mark Sheet 10th', '10th grade mark sheet', TRUE, 5, '[\"pdf\", \"jpg\", \"jpeg\"]'),
('Mark Sheet 12th', '12th grade mark sheet', TRUE, 5, '[\"pdf\", \"jpg\", \"jpeg\"]'),
('Aadhaar Card', 'National ID card', TRUE, 5, '[\"pdf\", \"jpg\", \"jpeg\"]'),
('Passport Size Photo', 'Recent passport size photograph', TRUE, 2, '[\"jpg\", \"jpeg\", \"png\"]'),
('Transfer Certificate', 'Transfer certificate from previous institution', TRUE, 5, '[\"pdf\"]'),
('Migration Certificate', 'Migration certificate if applicable', TRUE, 5, '[\"pdf\"]'),
('Income Certificate', 'Family income certificate for scholarships', TRUE, 5, '[\"pdf\"]'),
('Domicile Certificate', 'State domicile certificate', TRUE, 5, '[\"pdf\"]');

-- Create default admin (password: admin123)
INSERT INTO users (email, password_hash, role, email_verified) VALUES
('admin@university.edu.in', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6QJw/2Ej7W', 'admin', TRUE);

INSERT INTO admins (user_id, first_name, last_name, department_id, permissions) VALUES
(1, 'System', 'Administrator', 1, '{\"user_management\": true, \"document_verification\": true, \"task_management\": true, \"system_settings\": true}');

-- Create views for commonly used data

-- View for students with verification status
CREATE VIEW student_verification_status AS
SELECT 
    s.id,
    s.enrollment_number,
    s.first_name,
    s.last_name,
    u.email,
    s.semester,
    s.documents_verified,
    s.verification_status,
    COUNT(sd.id) as total_documents,
    COUNT(CASE WHEN sd.verification_status = 'verified' THEN 1 END) as verified_documents,
    COUNT(CASE WHEN sd.verification_status = 'pending' THEN 1 END) as pending_documents
FROM students s
LEFT JOIN users u ON s.user_id = u.id
LEFT JOIN student_documents sd ON s.id = sd.student_id
GROUP BY s.id, s.enrollment_number, s.first_name, s.last_name, u.email, s.semester, s.documents_verified, s.verification_status;

-- View for faculty workload
CREATE VIEW faculty_workload AS
SELECT 
    f.id,
    f.employee_id,
    f.first_name,
    f.last_name,
    COUNT(t.id) as total_tasks_assigned,
    COUNT(CASE WHEN t.due_date >= CURDATE() THEN 1 END) as active_tasks,
    COUNT(ts.id) as submissions_to_grade
FROM faculties f
LEFT JOIN tasks t ON f.id = t.assigned_by
LEFT JOIN task_submissions ts ON t.id = ts.task_id AND ts.submission_status = 'submitted' AND ts.graded_at IS NULL
GROUP BY f.id, f.employee_id, f.first_name, f.last_name;

-- Triggers for automatic updates (MySQL version)

-- Trigger to update student verification status when all documents are verified
DELIMITER //
CREATE TRIGGER update_student_verification_status
AFTER INSERT ON student_documents
FOR EACH ROW
BEGIN
    DECLARE total_required INT DEFAULT 0;
    DECLARE total_verified INT DEFAULT 0;
    
    -- Count required documents for this student
    SELECT COUNT(*) INTO total_required
    FROM document_types dt
    WHERE dt.is_required = TRUE;
    
    -- Count verified required documents for this student
    SELECT COUNT(*) INTO total_verified
    FROM student_documents sd
    JOIN document_types dt ON sd.document_type_id = dt.id
    WHERE sd.student_id = NEW.student_id 
      AND sd.verification_status = 'verified' 
      AND dt.is_required = TRUE;
    
    -- Update student verification status
    UPDATE students 
    SET 
        documents_verified = (total_required = total_verified),
        verification_status = CASE 
            WHEN (total_required = total_verified) THEN 'verified'
            WHEN EXISTS (
                SELECT 1 FROM student_documents sd2 
                WHERE sd2.student_id = NEW.student_id AND sd2.verification_status = 'rejected'
            ) THEN 'rejected'
            ELSE 'pending'
        END,
        verified_at = CASE 
            WHEN (total_required = total_verified) THEN NOW()
            ELSE NULL
        END
    WHERE id = NEW.student_id;
END//
DELIMITER ;

DELIMITER //
CREATE TRIGGER update_student_verification_status_update
AFTER UPDATE ON student_documents
FOR EACH ROW
BEGIN
    DECLARE total_required INT DEFAULT 0;
    DECLARE total_verified INT DEFAULT 0;
    
    -- Count required documents for this student
    SELECT COUNT(*) INTO total_required
    FROM document_types dt
    WHERE dt.is_required = TRUE;
    
    -- Count verified required documents for this student
    SELECT COUNT(*) INTO total_verified
    FROM student_documents sd
    JOIN document_types dt ON sd.document_type_id = dt.id
    WHERE sd.student_id = NEW.student_id 
      AND sd.verification_status = 'verified' 
      AND dt.is_required = TRUE;
    
    -- Update student verification status
    UPDATE students 
    SET 
        documents_verified = (total_required = total_verified),
        verification_status = CASE 
            WHEN (total_required = total_verified) THEN 'verified'
            WHEN EXISTS (
                SELECT 1 FROM student_documents sd2 
                WHERE sd2.student_id = NEW.student_id AND sd2.verification_status = 'rejected'
            ) THEN 'rejected'
            ELSE 'pending'
        END,
        verified_at = CASE 
            WHEN (total_required = total_verified) THEN NOW()
            ELSE NULL
        END
    WHERE id = NEW.student_id;
END//
DELIMITER ;

-- Stored Procedures for MySQL

-- Procedure to create student login credentials
DELIMITER //
CREATE PROCEDURE create_student_credentials(
    IN p_email VARCHAR(255),
    IN p_password VARCHAR(255),
    IN p_enrollment_number VARCHAR(50),
    IN p_first_name VARCHAR(100),
    IN p_last_name VARCHAR(100),
    IN p_department_id INT,
    OUT p_student_id INT
)
BEGIN
    DECLARE v_user_id INT;
    
    -- Create user account
    INSERT INTO users (email, password_hash, role, email_verified)
    VALUES (p_email, p_password, 'student', FALSE);
    
    -- Get the user ID
    SET v_user_id = LAST_INSERT_ID();
    
    -- Create student record
    INSERT INTO students (user_id, enrollment_number, first_name, last_name, department_id)
    VALUES (v_user_id, p_enrollment_number, p_first_name, p_last_name, p_department_id);
    
    -- Return the student ID
    SET p_student_id = LAST_INSERT_ID();
END//
DELIMITER ;

-- Procedure to create faculty login credentials
DELIMITER //
CREATE PROCEDURE create_faculty_credentials(
    IN p_email VARCHAR(255),
    IN p_password VARCHAR(255),
    IN p_employee_id VARCHAR(50),
    IN p_first_name VARCHAR(100),
    IN p_last_name VARCHAR(100),
    IN p_department_id INT,
    OUT p_faculty_id INT
)
BEGIN
    DECLARE v_user_id INT;
    
    -- Create user account
    INSERT INTO users (email, password_hash, role, email_verified)
    VALUES (p_email, p_password, 'faculty', FALSE);
    
    -- Get the user ID
    SET v_user_id = LAST_INSERT_ID();
    
    -- Create faculty record
    INSERT INTO faculties (user_id, employee_id, first_name, last_name, department_id)
    VALUES (v_user_id, p_employee_id, p_first_name, p_last_name, p_department_id);
    
    -- Return the faculty ID
    SET p_faculty_id = LAST_INSERT_ID();
END//
DELIMITER ;

-- Function to check if student can access dashboard
DELIMITER //
CREATE FUNCTION can_access_dashboard(p_user_id INT) RETURNS BOOLEAN
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE v_can_access BOOLEAN DEFAULT FALSE;
    
    SELECT documents_verified = TRUE AND verification_status = 'verified' 
    INTO v_can_access
    FROM students s
    JOIN users u ON s.user_id = u.id
    WHERE u.id = p_user_id;
    
    RETURN v_can_access;
END//
DELIMITER ;

-- Function to check if faculty can verify documents
DELIMITER //
CREATE FUNCTION can_verify_documents(p_user_id INT) RETURNS BOOLEAN
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE v_can_verify BOOLEAN DEFAULT FALSE;
    
    SELECT f.can_verify_documents = TRUE AND f.is_active = TRUE 
    INTO v_can_verify
    FROM faculties f
    JOIN users u ON f.user_id = u.id
    WHERE u.id = p_user_id;
    
    RETURN v_can_verify;
END//
DELIMITER ;

-- Function to check if faculty can assign tasks
DELIMITER //
CREATE FUNCTION can_assign_tasks(p_user_id INT) RETURNS BOOLEAN
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE v_can_assign BOOLEAN DEFAULT FALSE;
    
    SELECT f.can_assign_tasks = TRUE AND f.is_active = TRUE 
    INTO v_can_assign
    FROM faculties f
    JOIN users u ON f.user_id = u.id
    WHERE u.id = p_user_id;
    
    RETURN v_can_assign;
END//
DELIMITER ;
