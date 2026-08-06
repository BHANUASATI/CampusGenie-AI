-- Sample Data for Testing and Demonstration - MySQL Version
-- This file contains sample data to test the complete workflow
-- Compatible with database_schema_mysql_final.sql

USE CampusGenie;

-- Clear all data (using TRUNCATE to avoid safe mode issues)
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE task_submissions;
TRUNCATE TABLE student_documents;
TRUNCATE TABLE tasks;
TRUNCATE TABLE students;
TRUNCATE TABLE faculties;
TRUNCATE TABLE admins;
TRUNCATE TABLE users;
TRUNCATE TABLE departments;
SET FOREIGN_KEY_CHECKS = 1;

-- Drop and recreate stored functions to fix ambiguous column issues
DROP FUNCTION IF EXISTS can_verify_documents;
DROP FUNCTION IF EXISTS can_assign_tasks;
DROP FUNCTION IF EXISTS can_access_dashboard;

-- Recreate fixed functions only (procedures already exist in schema)
DELIMITER //
CREATE FUNCTION can_access_dashboard(p_user_id INT) RETURNS BOOLEAN
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE v_can_access BOOLEAN DEFAULT FALSE;
    
    SELECT s.documents_verified = TRUE AND s.verification_status = 'verified' 
    INTO v_can_access
    FROM students s
    JOIN users u ON s.user_id = u.id
    WHERE u.id = p_user_id;
    
    RETURN v_can_access;
END//
DELIMITER ;

-- Fixed function to check if faculty can verify documents
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

-- Fixed function to check if faculty can assign tasks
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

-- Insert departments (already in main schema, but included for completeness)
INSERT INTO departments (name, code, description) VALUES
('Computer Science', 'CS', 'Computer Science and Engineering Department'),
('Electronics', 'EC', 'Electronics and Communication Engineering'),
('Mechanical', 'ME', 'Mechanical Engineering Department'),
('Civil', 'CE', 'Civil Engineering Department'),
('Electrical', 'EE', 'Electrical Engineering Department')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Insert document types (already in main schema, but included for completeness)
INSERT INTO document_types (name, description, is_required, max_file_size_mb, allowed_extensions) VALUES
('Birth Certificate', 'Official birth certificate document', TRUE, 5, '[\"pdf\", \"jpg\", \"jpeg\"]'),
('Mark Sheet 10th', '10th grade mark sheet', TRUE, 5, '[\"pdf\", \"jpg\", \"jpeg\"]'),
('Mark Sheet 12th', '12th grade mark sheet', TRUE, 5, '[\"pdf\", \"jpg\", \"jpeg\"]'),
('Aadhaar Card', 'National ID card', TRUE, 5, '[\"pdf\", \"jpg\", \"jpeg\"]'),
('Passport Size Photo', 'Recent passport size photograph', TRUE, 2, '[\"jpg\", \"jpeg\", \"png\"]'),
('Transfer Certificate', 'Transfer certificate from previous institution', TRUE, 5, '[\"pdf\"]'),
('Migration Certificate', 'Migration certificate if applicable', TRUE, 5, '[\"pdf\"]'),
('Income Certificate', 'Family income certificate for scholarships', TRUE, 5, '[\"pdf\"]'),
('Domicile Certificate', 'State domicile certificate', TRUE, 5, '[\"pdf\"]')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Create sample admin user (must be first to get ID 1)
INSERT INTO users (email, password_hash, role, email_verified) VALUES
('admin@university.edu.in', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6QJw/2Ej7W', 'admin', TRUE)
ON DUPLICATE KEY UPDATE email = VALUES(email);

-- Insert admin record
INSERT INTO admins (user_id, first_name, last_name, department_id, permissions) VALUES
(1, 'System', 'Administrator', 1, '{\"user_management\": true, \"document_verification\": true, \"task_management\": true, \"system_settings\": true}')
ON DUPLICATE KEY UPDATE user_id = VALUES(user_id);

-- Create sample faculty users
INSERT INTO users (email, password_hash, role, email_verified) VALUES
('john.smith@university.edu.in', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6QJw/2Ej7W', 'faculty', TRUE),
('sarah.jones@university.edu.in', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6QJw/2Ej7W', 'faculty', TRUE),
('michael.wilson@university.edu.in', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6QJw/2Ej7W', 'faculty', TRUE)
ON DUPLICATE KEY UPDATE email = VALUES(email);

-- Insert sample faculty records
INSERT INTO faculties (user_id, employee_id, first_name, last_name, specialization, designation, department_id) VALUES
(2, 'FAC001', 'John', 'Smith', 'Database Systems', 'Assistant Professor', 1),
(3, 'FAC002', 'Sarah', 'Jones', 'Web Development', 'Associate Professor', 1),
(4, 'FAC003', 'Michael', 'Wilson', 'Machine Learning', 'Professor', 1)
ON DUPLICATE KEY UPDATE employee_id = VALUES(employee_id);

-- Create sample student users
INSERT INTO users (email, password_hash, role, email_verified) VALUES
('rahul.kumar@university.edu.in', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6QJw/2Ej7W', 'student', TRUE),
('priya.sharma@university.edu.in', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6QJw/2Ej7W', 'student', TRUE),
('amit.patel@university.edu.in', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6QJw/2Ej7W', 'student', TRUE),
('neha.singh@university.edu.in', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6QJw/2Ej7W', 'student', TRUE)
ON DUPLICATE KEY UPDATE email = VALUES(email);

-- Insert sample student records (must be done before tasks that reference them)
INSERT INTO students (user_id, enrollment_number, first_name, last_name, phone, date_of_birth, gender, blood_group, address, city, state, pincode, department_id, semester, batch, admission_year, gpa, attendance_percentage) VALUES
(5, '2024CS001', 'Rahul', 'Kumar', '+91 9876543210', '2002-05-15', 'male', 'B+', '123 Main Street', 'Delhi', 'Delhi', '110001', 1, 3, 'A', 2024, 8.5, 92.5),
(6, '2024CS002', 'Priya', 'Sharma', '+91 9876543211', '2002-08-22', 'female', 'O+', '456 Park Avenue', 'Mumbai', 'Maharashtra', '400001', 1, 3, 'A', 2024, 9.2, 95.0),
(7, '2024CS003', 'Amit', 'Patel', '+91 9876543212', '2002-03-10', 'male', 'A+', '789 Garden Road', 'Ahmedabad', 'Gujarat', '380001', 1, 3, 'A', 2024, 7.8, 88.5),
(8, '2024CS004', 'Neha', 'Singh', '+91 9876543213', '2002-12-05', 'female', 'AB+', '321 College Road', 'Bangalore', 'Karnataka', '560001', 1, 3, 'A', 2024, 8.9, 91.0)
ON DUPLICATE KEY UPDATE enrollment_number = VALUES(enrollment_number);

-- Insert sample tasks (after students are created)
INSERT INTO tasks (title, description, assigned_by, assigned_to, department_id, task_type, priority, due_date, max_marks, status) VALUES
('Database Design Project', 'Design a complete database schema for a library management system with ER diagram and normalization', 1, 1, NULL, 'project', 'high', '2026-03-15 23:59:59', 100, 'published'),
('Web Development Assignment', 'Create a responsive web application using React and Node.js for student management', 2, 2, NULL, 'assignment', 'medium', '2026-03-10 23:59:59', 50, 'published'),
('Machine Learning Quiz', 'Complete the online quiz covering supervised and unsupervised learning algorithms', 3, NULL, 1, 'exam', 'medium', '2026-03-08 23:59:59', 30, 'published'),
('Algorithm Analysis', 'Analyze time and space complexity of sorting algorithms and write a comprehensive report', 1, 3, NULL, 'assignment', 'medium', '2026-03-20 23:59:59', 75, 'published'),
('Data Structures Lab', 'Implement various data structures and analyze their performance', 2, 4, NULL, 'assignment', 'high', '2026-03-12 23:59:59', 60, 'published');

-- Insert sample task submissions
INSERT INTO task_submissions (task_id, student_id, submission_text, submission_status, submitted_at) VALUES
(1, 1, 'I have completed the database design project with complete ER diagram, normalization up to 3NF, and SQL scripts. The project includes user management, book catalog, and transaction modules.', 'submitted', '2026-03-14 15:30:00'),
(2, 2, 'React frontend with Node.js backend completed. Features include student registration, course management, and grade tracking. All CRUD operations implemented with proper validation.', 'submitted', '2026-03-09 20:45:00'),
(4, 3, 'Comprehensive analysis of Quick Sort, Merge Sort, Heap Sort, and Bubble Sort algorithms with time complexity comparisons and performance graphs included.', 'submitted', '2026-03-19 18:20:00');

-- Grade some submissions
UPDATE task_submissions SET 
    marks_obtained = 92, 
    feedback = 'Excellent work! ER diagram is well-designed and normalization is correct. SQL scripts are efficient.',
    graded_by = 1,
    graded_at = '2026-03-16 10:30:00',
    submission_status = 'graded'
WHERE task_id = 1 AND student_id = 1;

UPDATE task_submissions SET 
    marks_obtained = 85, 
    feedback = 'Good implementation of React and Node.js. Consider adding more error handling and input validation.',
    graded_by = 2,
    graded_at = '2026-03-10 14:15:00',
    submission_status = 'graded'
WHERE task_id = 2 AND student_id = 2;

-- Insert sample student documents (simulating file uploads)
INSERT INTO student_documents (student_id, document_type_id, file_name, file_path, file_size_mb, file_extension, verification_status, verified_by, verification_notes, uploaded_at) VALUES
-- Rahul Kumar's documents (fully verified) - Student ID 1
(1, 1, 'birth_certificate_rahul.pdf', '/uploads/documents/2024CS001/birth_certificate.pdf', 1.2, 'pdf', 'verified', 1, 'Document verified and matches records', '2026-02-01 10:00:00'),
(1, 2, '10th_marksheet_rahul.pdf', '/uploads/documents/2024CS001/10th_marksheet.pdf', 2.1, 'pdf', 'verified', 1, 'Mark sheet verified with board', '2026-02-01 10:05:00'),
(1, 3, '12th_marksheet_rahul.pdf', '/uploads/documents/2024CS001/12th_marksheet.pdf', 2.3, 'pdf', 'verified', 1, 'Mark sheet verified with board', '2026-02-01 10:10:00'),
(1, 4, 'aadhaar_card_rahul.pdf', '/uploads/documents/2024CS001/aadhaar_card.pdf', 0.8, 'pdf', 'verified', 1, 'Aadhaar card verified', '2026-02-01 10:15:00'),
(1, 5, 'photo_rahul.jpg', '/uploads/documents/2024CS001/photo.jpg', 0.5, 'jpg', 'verified', 1, 'Photo verified and clear', '2026-02-01 10:20:00'),
(1, 6, 'transfer_certificate_rahul.pdf', '/uploads/documents/2024CS001/transfer_certificate.pdf', 1.5, 'pdf', 'verified', 1, 'Transfer certificate verified', '2026-02-01 10:25:00'),

-- Priya Sharma's documents (pending verification) - Student ID 2
(2, 1, 'birth_certificate_priya.pdf', '/uploads/documents/2024CS002/birth_certificate.pdf', 1.1, 'pdf', 'pending', NULL, NULL, '2026-02-02 11:00:00'),
(2, 2, '10th_marksheet_priya.pdf', '/uploads/documents/2024CS002/10th_marksheet.pdf', 2.0, 'pdf', 'verified', 2, 'Mark sheet verified', '2026-02-02 11:05:00'),
(2, 3, '12th_marksheet_priya.pdf', '/uploads/documents/2024CS002/12th_marksheet.pdf', 2.2, 'pdf', 'pending', NULL, NULL, '2026-02-02 11:10:00'),
(2, 4, 'aadhaar_card_priya.pdf', '/uploads/documents/2024CS002/aadhaar_card.pdf', 0.9, 'pdf', 'verified', 2, 'Aadhaar card verified', '2026-02-02 11:15:00'),
(2, 5, 'photo_priya.jpg', '/uploads/documents/2024CS002/photo.jpg', 0.4, 'jpg', 'pending', NULL, NULL, '2026-02-02 11:20:00'),

-- Amit Patel's documents (some rejected) - Student ID 3
(3, 1, 'birth_certificate_amit.pdf', '/uploads/documents/2024CS003/birth_certificate.pdf', 1.3, 'pdf', 'verified', 3, 'Document verified', '2026-02-03 09:00:00'),
(3, 2, '10th_marksheet_amit.pdf', '/uploads/documents/2024CS003/10th_marksheet.pdf', 2.4, 'pdf', 'rejected', 3, 'Document is unclear and blurry. Please upload a clear copy.', '2026-02-03 09:05:00'),
(3, 3, '12th_marksheet_amit.pdf', '/uploads/documents/2024CS003/12th_marksheet.pdf', 2.1, 'pdf', 'pending', NULL, NULL, '2026-02-03 09:10:00'),
(3, 4, 'aadhaar_card_amit.pdf', '/uploads/documents/2024CS003/aadhaar_card.pdf', 0.7, 'pdf', 'verified', 3, 'Aadhaar card verified', '2026-02-03 09:15:00'),

-- Neha Singh's documents (just started uploading) - Student ID 4
(4, 1, 'birth_certificate_neha.pdf', '/uploads/documents/2024CS004/birth_certificate.pdf', 1.0, 'pdf', 'pending', NULL, NULL, '2026-02-04 14:00:00'),
(4, 2, '10th_marksheet_neha.pdf', '/uploads/documents/2024CS004/10th_marksheet.pdf', 1.9, 'pdf', 'pending', NULL, NULL, '2026-02-04 14:05:00');

-- Insert sample notifications
INSERT INTO notifications (user_id, title, message, notification_type, is_read, action_url) VALUES
-- Student notifications
(5, 'Documents Verified', 'All your documents have been successfully verified. You now have full access to the dashboard.', 'success', FALSE, '/dashboard'),
(6, 'Document Pending', 'Your birth certificate is pending verification. Please check back later.', 'info', FALSE, '/documents'),
(7, 'Document Rejected', 'Your 10th mark sheet was rejected due to poor quality. Please upload a clear copy.', 'warning', FALSE, '/documents'),
(8, 'Document Uploaded', 'Your birth certificate has been uploaded successfully.', 'success', FALSE, '/documents'),

-- Faculty notifications
(2, 'New Task Submission', 'Priya Sharma has submitted the Web Development Assignment.', 'info', FALSE, '/tasks/submissions'),
(3, 'Document Verification', '3 documents are pending verification from students.', 'info', FALSE, '/documents/verify'),

-- Admin notifications
(1, 'New Student Registration', '4 new students have registered and are awaiting document verification.', 'info', FALSE, '/admin/students');

-- Insert sample audit logs
INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address, user_agent) VALUES
(5, 'LOGIN', 'users', 5, '{"last_login": "2026-02-21 09:00:00"}', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
(6, 'DOCUMENT_UPLOAD', 'student_documents', 10, '{"file_name": "birth_certificate_priya.pdf", "verification_status": "pending"}', '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'),
(1, 'DOCUMENT_VERIFY', 'student_documents', 6, '{"verification_status": "verified", "verified_by": 1}', '192.168.1.50', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
(2, 'TASK_ASSIGN', 'tasks', 2, '{"title": "Web Development Assignment", "assigned_to": 6}', '192.168.1.51', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

-- Update student verification status based on document verification
-- This should be automatically triggered by the database trigger, but we'll update manually for demo
UPDATE students SET 
    documents_verified = TRUE, 
    verification_status = 'verified', 
    verified_at = '2026-02-01 10:30:00',
    verified_by = 1
WHERE id = 1; -- Rahul Kumar (Student ID 1)

UPDATE students SET 
    documents_verified = FALSE, 
    verification_status = 'pending'
WHERE id = 2; -- Priya Sharma (Student ID 2)

UPDATE students SET 
    documents_verified = FALSE, 
    verification_status = 'rejected'
WHERE id = 3; -- Amit Patel (Student ID 3)

UPDATE students SET 
    documents_verified = FALSE, 
    verification_status = 'pending'
WHERE id = 4; -- Neha Singh (Student ID 4)

-- Create some additional sample data for testing

-- More tasks for department-wide assignments
INSERT INTO tasks (title, description, assigned_by, assigned_to, department_id, task_type, priority, due_date, max_marks, status) VALUES
('Semester Exam Preparation', 'Prepare for upcoming semester examinations. Study all covered topics and complete practice assignments.', 1, NULL, 1, 'exam', 'high', '2026-04-15 23:59:59', 200, 'published'),
('Industry Project Proposal', 'Submit a proposal for final year industry project with objectives and methodology.', 2, NULL, 1, 'project', 'medium', '2026-03-25 23:59:59', 50, 'published');

-- More task submissions
INSERT INTO task_submissions (task_id, student_id, submission_status, submitted_at) VALUES
(3, 1, 'submitted', '2026-03-07 16:00:00'),
(3, 2, 'submitted', '2026-03-07 17:30:00'),
(3, 3, 'submitted', '2026-03-08 09:15:00'),
(3, 4, 'late', '2026-03-09 10:45:00'),
(5, 4, 'submitted', '2026-03-11 14:20:00');

-- Grade the quiz submissions
UPDATE task_submissions SET 
    marks_obtained = 28, 
    feedback = 'Good performance. Review unsupervised learning algorithms.',
    graded_by = 3,
    graded_at = '2026-03-08 11:00:00',
    submission_status = 'graded'
WHERE task_id = 3 AND student_id = 1;

UPDATE task_submissions SET 
    marks_obtained = 30, 
    feedback = 'Excellent! All answers are correct.',
    graded_by = 3,
    graded_at = '2026-03-08 11:30:00',
    submission_status = 'graded'
WHERE task_id = 3 AND student_id = 2;

UPDATE task_submissions SET 
    marks_obtained = 25, 
    feedback = 'Good effort. Focus on understanding the mathematical foundations.',
    graded_by = 3,
    graded_at = '2026-03-08 12:00:00',
    submission_status = 'graded'
WHERE task_id = 3 AND student_id = 3;

UPDATE task_submissions SET 
    marks_obtained = 20, 
    feedback = 'Submitted late. Points deducted for delay. Content is good.',
    graded_by = 3,
    graded_at = '2026-03-09 13:00:00',
    submission_status = 'graded'
WHERE task_id = 3 AND student_id = 4;

-- Sample queries for testing the system (MySQL version)

-- 1. Check which students can access dashboard (verified documents)
SELECT 
    s.enrollment_number,
    s.first_name,
    s.last_name,
    s.documents_verified,
    s.verification_status,
    COUNT(sd.id) as total_documents,
    COUNT(CASE WHEN sd.verification_status = 'verified' THEN 1 END) as verified_docs
FROM students s
LEFT JOIN student_documents sd ON s.id = sd.student_id
GROUP BY s.id, s.enrollment_number, s.first_name, s.last_name, s.documents_verified, s.verification_status
ORDER BY s.enrollment_number;

-- 2. View pending document verifications for faculty
SELECT 
    s.enrollment_number,
    s.first_name,
    s.last_name,
    dt.name as document_type,
    sd.file_name,
    sd.uploaded_at
FROM student_documents sd
JOIN students s ON sd.student_id = s.id
JOIN document_types dt ON sd.document_type_id = dt.id
WHERE sd.verification_status = 'pending'
ORDER BY sd.uploaded_at;

-- 3. View tasks assigned to specific student
SELECT 
    t.title,
    t.description,
    t.priority,
    t.due_date,
    t.max_marks,
    ts.submission_status,
    ts.marks_obtained,
    ts.submitted_at
FROM tasks t
LEFT JOIN task_submissions ts ON t.id = ts.task_id AND ts.student_id = 1
WHERE t.assigned_to = 1 OR (t.assigned_to IS NULL AND t.department_id = 1)
ORDER BY t.due_date;

-- 4. View faculty workload
SELECT 
    f.id,
    f.employee_id,
    f.first_name,
    f.last_name,
    COUNT(t.id) as total_tasks,
    COUNT(CASE WHEN t.due_date >= CURDATE() THEN 1 END) as active_tasks,
    COUNT(ts.id) as pending_grades
FROM faculties f
LEFT JOIN tasks t ON f.id = t.assigned_by
LEFT JOIN task_submissions ts ON t.id = ts.task_id AND ts.submission_status = 'submitted' AND ts.graded_at IS NULL
WHERE f.is_active = TRUE
GROUP BY f.id, f.employee_id, f.first_name, f.last_name;

-- 5. View system statistics
SELECT 
    'Total Students' as metric,
    COUNT(*) as value
FROM students
UNION ALL
SELECT 
    'Verified Students',
    COUNT(*)
FROM students 
WHERE documents_verified = TRUE
UNION ALL
SELECT 
    'Total Faculty',
    COUNT(*)
FROM faculties 
WHERE is_active = TRUE
UNION ALL
SELECT 
    'Total Tasks',
    COUNT(*)
FROM tasks 
WHERE status = 'published'
UNION ALL
SELECT 
    'Pending Documents',
    COUNT(*)
FROM student_documents 
WHERE verification_status = 'pending';

-- Test stored procedures
-- Create a new student
CALL create_student_credentials(
    'new.student@university.edu.in',
    'password123',
    '2024CS005',
    'New',
    'Student',
    1,
    @student_id
);
SELECT @student_id as new_student_id;

-- Create a new faculty
CALL create_faculty_credentials(
    'new.faculty@university.edu.in',
    'password123',
    'FAC004',
    'New',
    'Faculty',
    1,
    @faculty_id
);
SELECT @faculty_id as new_faculty_id;

-- Test functions
SELECT can_access_dashboard(5) as rahul_can_access; -- Should return 1 (TRUE)
SELECT can_access_dashboard(6) as priya_can_access; -- Should return 0 (FALSE)
SELECT can_verify_documents(1) as admin_can_verify; -- Should return 0 (FALSE)
SELECT can_verify_documents(2) as faculty_can_verify; -- Should return 1 (TRUE)
SELECT can_assign_tasks(2) as faculty_can_assign; -- Should return 1 (TRUE)
