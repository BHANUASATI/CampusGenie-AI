import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search, 
  Filter, 
  Download,
  Eye,
  EyeOff,
  User,
  UserX,
  Calendar,
  AlertTriangle,
  CheckSquare,
  XSquare,
  RefreshCw,
  Users,
  FileCheck,
  FileX,
  TrendingUp,
  Activity,
  BarChart3,
  PieChart,
  Zap,
  Shield,
  Award,
  BookOpen,
  ChevronDown,
  ChevronUp,
  FilterIcon,
  DownloadCloud,
  UploadCloud,
  Upload,
  Mail,
  Phone,
  MapPin,
  CalendarDays,
  FileSearch,
  ClipboardList,
  UserPlus,
  Edit,
  Trash2,
  UserCheck,
  Target,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  HelpCircle,
  Home,
  FolderOpen,
  FileSignature,
  Archive,
  MessageSquare,
  Star,
  Hash,
  Globe,
  Lock,
  Database,
  Cpu,
  HardDrive,
  Wifi,
  Monitor,
  Smartphone,
  Tablet,
  Cloud,
  Server,
  ShieldCheck,
  Fingerprint,
  Key,
  CreditCard,
  Receipt,
  Calculator,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  Grid3x3,
  List,
  LayoutGrid,
  Layers,
  Package,
  Truck,
  ShoppingBag,
  ShoppingCart,
  DollarSign,
  PiggyBank,
  Wallet,
  Building,
  Plus,
  GraduationCap,
  Briefcase,
  IdCard,
  Stamp
} from 'lucide-react';

interface StudentData {
  id: number;
  enrollment_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  school?: string;
  department?: string;
  course?: string;
  semester: number;
  batch?: string;
  admission_year?: number;
  gpa: number;
  attendance_percentage: number;
  documents_verified: boolean;
  verification_status: 'pending' | 'verified' | 'rejected';
  verified_at?: string;
  created_at: string;
}

interface StudentVerificationStats {
  total_students: number;
  verified_students: number;
  pending_students: number;
  rejected_students: number;
}

interface Department {
  id: number;
  name: string;
  school_id?: number;
}

interface School {
  id: number;
  name: string;
  code: string;
}

interface Course {
  id: number;
  name: string;
  code: string;
  duration_years: number;
  type: string;
  department_id: number;
}

interface NewStudent {
  enrollment_number: string;
  first_name: string;
  last_name: string;
  email: string;
  personal_email: string;  // For sending credentials, not stored in database
  phone: string;
  school_id: number;
  department_id: number;
  course_id: number;
  semester: number;
  batch: string;
  admission_year: number;
  password: string;
}

interface EditStudent {
  first_name: string;
  last_name: string;
  phone: string;
  department_id: number;
  semester: number;
  batch: string;
  admission_year: number;
  gpa: number;
  attendance_percentage: number;
}

interface StudentDocument {
  id: number;
  student_id: number;
  student_name: string;
  student_email: string;
  enrollment_number: string;
  document_type_name: string;
  file_name: string;
  file_size_mb: number;
  file_extension: string;
  verification_status: 'pending' | 'verified' | 'rejected';
  verification_date?: string;
  verification_remarks?: string;
  verified_by_name?: string;
  uploaded_at: string;
  file_path: string;
}

interface FacultyData {
  id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  personal_email: string;
  phone: string;
  designation: string;
  department: string;
  created_at: string;
}

interface NewFaculty {
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  personal_email: string;
  phone: string;
  designation: string;
  department_id: number;
  password: string;
}

interface VerificationStats {
  total_documents: number;
  pending_documents: number;
  verified_documents: number;
  rejected_documents: number;
  total_students: number;
}

interface DocumentType {
  id: number;
  name: string;
  description: string;
  max_file_size_mb: number;
  allowed_extensions: string;
}

const RegistrarDashboard: React.FC = () => {
  const [documents, setDocuments] = useState<StudentDocument[]>([]);
  const [stats, setStats] = useState<VerificationStats>({
    total_documents: 0,
    pending_documents: 0,
    verified_documents: 0,
    rejected_documents: 0,
    total_students: 0
  });
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all');
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string>('all');
  const [facultySearchTerm, setFacultySearchTerm] = useState('');
  const [facultyDepartmentFilter, setFacultyDepartmentFilter] = useState<string>('all');
  const [selectedDocuments, setSelectedDocuments] = useState<number[]>([]);
  const [showBulkVerifyModal, setShowBulkVerifyModal] = useState(false);
  const [bulkVerificationStatus, setBulkVerificationStatus] = useState<'verified' | 'rejected'>('verified');
  const [bulkRemarks, setBulkRemarks] = useState('');
  const [showSingleVerifyModal, setShowSingleVerifyModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<StudentDocument | null>(null);
  const [singleVerificationStatus, setSingleVerificationStatus] = useState<'verified' | 'rejected'>('verified');
  const [singleRemarks, setSingleRemarks] = useState('');
  const [previewDocument, setPreviewDocument] = useState<StudentDocument | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeMenuItem, setActiveMenuItem] = useState('dashboard');
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    main: false,
    management: false,
    system: false
  });
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<StudentDocument[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [showStudentDetail, setShowStudentDetail] = useState(false);
  const [studentDocuments, setStudentDocuments] = useState<StudentDocument[]>([]);
  const [allDocuments, setAllDocuments] = useState<StudentDocument[]>([]);
  
  // Student verification states
  const [studentData, setStudentData] = useState<StudentData[]>([]);
  const [studentStats, setStudentStats] = useState<StudentVerificationStats>({
    total_students: 0,
    verified_students: 0,
    pending_students: 0,
    rejected_students: 0
  });
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [studentStatusFilter, setStudentStatusFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all');
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [showBulkStudentVerifyModal, setShowBulkStudentVerifyModal] = useState(false);
  const [bulkStudentVerificationStatus, setBulkStudentVerificationStatus] = useState<'verified' | 'rejected'>('verified');
  const [verificationRemarks, setVerificationRemarks] = useState('');
  const [showStudentVerifyModal, setShowStudentVerifyModal] = useState(false);
  const [showStudentRejectModal, setShowStudentRejectModal] = useState(false);
  const [selectedStudentForVerification, setSelectedStudentForVerification] = useState<StudentData | null>(null);
  
  // Student management states
  const [departments, setDepartments] = useState<Department[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredDepartments, setFilteredDepartments] = useState<Department[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showEditStudentModal, setShowEditStudentModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState<StudentData | null>(null);
  const [selectedStudentForDelete, setSelectedStudentForDelete] = useState<StudentData | null>(null);
  
  // Faculty management states
  const [showAddFacultyModal, setShowAddFacultyModal] = useState(false);
  const [faculty, setFaculty] = useState<FacultyData[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState({
    employee_id: '',
    email: '',
    password: ''
  });
  const [newFaculty, setNewFaculty] = useState<NewFaculty>({
    employee_id: '',
    first_name: '',
    last_name: '',
    email: '',
    personal_email: '',
    phone: '',
    designation: '',
    department_id: 0,
    password: ''
  });
  const [newStudent, setNewStudent] = useState<NewStudent>({
    enrollment_number: '',
    first_name: '',
    last_name: '',
    email: '',
    personal_email: '',
    phone: '',
    school_id: 0,
    department_id: 0,
    course_id: 0,
    semester: 1,
    batch: '',
    admission_year: new Date().getFullYear(),
    password: ''
  });

  // Function to generate enrollment number based on department and year
  const generateEnrollmentNumber = (departmentId: number, admissionYear: number) => {
    const departmentCodes: { [key: number]: string } = {
      1: 'CS',  // Computer Science
      2: 'EC',  // Electronics
      3: 'ME',  // Mechanical
      4: 'CE',  // Civil
      5: 'EE',  // Electrical
      6: 'MA'   // Mathematics
    };
    
    const deptCode = departmentCodes[departmentId] || 'UN';
    const yearSuffix = admissionYear.toString().slice(-2);
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${yearSuffix}${deptCode}${randomNum}`;
  };

  // Function to generate random password
  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  // Handle school change
  const handleSchoolChange = (schoolId: number) => {
    setNewStudent(prev => ({
      ...prev,
      school_id: schoolId,
      department_id: 0,
      course_id: 0,
      enrollment_number: '',
      password: '',
      email: ''
    }));
  };

  // Handle department change to auto-generate enrollment number, password, and email
  const handleDepartmentChange = (departmentId: number) => {
    const enrollmentNumber = generateEnrollmentNumber(departmentId, newStudent.admission_year);
    const generatedPassword = generatePassword();
    const generatedEmail = `${enrollmentNumber}@university.edu.in`;
    
    setNewStudent({
      ...newStudent,
      department_id: departmentId,
      course_id: 0,
      enrollment_number: enrollmentNumber,
      password: generatedPassword,
      email: generatedEmail,
      personal_email: newStudent.personal_email  // Preserve existing personal email
    });
  };

  // Handle course change
  const handleCourseChange = (courseId: number) => {
    setNewStudent(prev => ({
      ...prev,
      course_id: courseId
    }));
  };
  const [editStudentData, setEditStudentData] = useState<EditStudent>({
    first_name: '',
    last_name: '',
    phone: '',
    department_id: 0,
    semester: 1,
    batch: '',
    admission_year: new Date().getFullYear(),
    gpa: 0,
    attendance_percentage: 0
  });
  const [bulkStudentRemarks, setBulkStudentRemarks] = useState('');
  const [currentView, setCurrentView] = useState<'documents' | 'students' | 'faculty'>('documents');

  // Update current time
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch data
  useEffect(() => {
    // Always try to fetch data first, authentication will be handled by individual fetch functions
    fetchDocuments();
    fetchStats();
    fetchDocumentTypes();
    fetchStudents();
    fetchRecentActivity();
    fetchStudentData();
    fetchStudentStats();
    fetchDepartments();
    fetchSchools();
    fetchCourses();
    fetchFaculty();
    
    // Set up real-time updates
    const interval = setInterval(() => {
      fetchStudentData();
      fetchStudentStats();
    }, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Update filtered departments when school changes
  useEffect(() => {
    if (newStudent.school_id && newStudent.school_id > 0) {
      const filtered = departments.filter(dept => dept.school_id === newStudent.school_id);
      setFilteredDepartments(filtered);
      // Reset department and course when school changes
      setNewStudent(prev => ({
        ...prev,
        department_id: 0,
        course_id: 0
      }));
      setFilteredCourses([]);
    } else {
      setFilteredDepartments([]);
      setFilteredCourses([]);
    }
  }, [newStudent.school_id, departments]);

  // Update filtered courses when department changes
  useEffect(() => {
    if (newStudent.department_id && newStudent.department_id > 0) {
      const filtered = courses.filter(course => course.department_id === newStudent.department_id);
      setFilteredCourses(filtered);
      // Reset course when department changes
      setNewStudent(prev => ({
        ...prev,
        course_id: 0
      }));
    } else {
      setFilteredCourses([]);
    }
  }, [newStudent.department_id, courses]);

  const fetchSchools = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:8002/schools/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSchools(data);
      } else {
        // Set mock schools if API fails
        setSchools([
          { id: 1, name: "School of Engineering and Technology", code: "SOET" },
          { id: 2, name: "School of Management Studies", code: "SOMS" },
          { id: 3, name: "School of Sciences", code: "SOS" }
        ]);
      }
    } catch (error) {
      console.error('Error fetching schools:', error);
      // Set mock schools on error
      setSchools([
        { id: 1, name: "School of Engineering and Technology", code: "SOET" },
        { id: 2, name: "School of Management Studies", code: "SOMS" },
        { id: 3, name: "School of Sciences", code: "SOS" }
      ]);
    }
  };

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:8002/schools/courses', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCourses(data);
        console.log('Courses fetched successfully:', data);
      } else {
        console.error('Failed to fetch courses:', response.status, response.statusText);
        // Set mock courses if API fails
        setCourses([
          { id: 1, name: "Bachelor of Computer Applications", code: "BCA", duration_years: 3, type: "undergraduate", department_id: 1 },
          { id: 2, name: "Master of Computer Applications", code: "MCA", duration_years: 2, type: "postgraduate", department_id: 1 },
          { id: 3, name: "B.Tech Computer Science", code: "BTech_CS", duration_years: 4, type: "undergraduate", department_id: 1 },
          { id: 4, name: "M.Tech Computer Science", code: "MTech_CS", duration_years: 2, type: "postgraduate", department_id: 1 },
          { id: 5, name: "Bachelor of Business Administration", code: "BBA", duration_years: 3, type: "undergraduate", department_id: 6 }
        ]);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      // Set mock courses on error
      setCourses([
        { id: 1, name: "Bachelor of Computer Applications", code: "BCA", duration_years: 3, type: "undergraduate", department_id: 1 },
        { id: 2, name: "Master of Computer Applications", code: "MCA", duration_years: 2, type: "postgraduate", department_id: 1 },
        { id: 3, name: "B.Tech Computer Science", code: "BTech_CS", duration_years: 4, type: "undergraduate", department_id: 1 },
        { id: 4, name: "M.Tech Computer Science", code: "MTech_CS", duration_years: 2, type: "postgraduate", department_id: 1 },
        { id: 5, name: "Bachelor of Business Administration", code: "BBA", duration_years: 3, type: "undergraduate", department_id: 6 }
      ]);
    }
  };

  const fetchDocuments = async () => {
    try {
      const token = localStorage.getItem('authToken');
      
      // Try to fetch all documents from multiple endpoints
      const endpoints = [
        '/registrar/documents/all',
        '/faculty/documents/pending',
        '/documents/all'
      ];

      let documentsData: StudentDocument[] = [];

      // Try each endpoint until we get data
      for (const endpoint of endpoints) {
        try {
          const headers: { [key: string]: string } = {
            'Content-Type': 'application/json'
          };
          
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
          
          const response = await fetch(`http://localhost:8002${endpoint}`, {
            headers: headers
          });
          
          if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data) && data.length > 0) {
              documentsData = data;
              console.log(`Successfully fetched ${data.length} documents from ${endpoint}`);
              break;
            }
          } else if (response.status === 401 || response.status === 403) {
            console.log(`Authentication required for ${endpoint}`);
            continue;
          }
        } catch (endpointError) {
          console.log(`Failed to fetch from ${endpoint}:`, endpointError);
          continue;
        }
      }

      // If no data from endpoints, set empty array instead of mock data
      if (documentsData.length === 0) {
        console.log('No documents found in database - showing empty state');
        documentsData = [];
      }

      setDocuments(documentsData);
      setAllDocuments(documentsData);
      setFilteredDocuments(documentsData);
      
    } catch (error) {
      console.error('Error fetching documents:', error);
      // Set empty array on error instead of mock data
      setDocuments([]);
      setAllDocuments([]);
      setFilteredDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const headers: { [key: string]: string } = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('http://localhost:8002/registrar/stats', {
        headers: headers
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else if (response.status === 401 || response.status === 403) {
        console.log('Authentication required for stats - using calculated stats from documents');
        // Calculate stats from documents if authentication fails
        const calculatedStats = {
          total_documents: documents.length,
          pending_documents: documents.filter(d => d.verification_status === 'pending').length,
          verified_documents: documents.filter(d => d.verification_status === 'verified').length,
          rejected_documents: documents.filter(d => d.verification_status === 'rejected').length,
          total_students: new Set(documents.map(d => d.student_id)).size
        };
        setStats(calculatedStats);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Set default stats
      const defaultStats = {
        total_documents: documents.length || 0,
        pending_documents: documents.filter(d => d.verification_status === 'pending').length || 0,
        verified_documents: documents.filter(d => d.verification_status === 'verified').length || 0,
        rejected_documents: documents.filter(d => d.verification_status === 'rejected').length || 0,
        total_students: new Set(documents.map(d => d.student_id)).size || 0
      };
      setStats(defaultStats);
    }
  };

  const fetchDocumentTypes = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:8002/documents/types', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setDocumentTypes(data);
      } else {
        // Set mock document types
        setDocumentTypes([
          { id: 1, name: "Mark Sheet", description: "Academic mark sheets", max_file_size_mb: 5, allowed_extensions: "pdf,jpg,png" },
          { id: 2, name: "Transfer Certificate", description: "Transfer certificates", max_file_size_mb: 3, allowed_extensions: "pdf,jpg,png" },
          { id: 3, name: "Birth Certificate", description: "Birth certificates", max_file_size_mb: 2, allowed_extensions: "pdf,jpg,png" },
          { id: 4, name: "Aadhar Card", description: "Aadhar identity cards", max_file_size_mb: 2, allowed_extensions: "pdf,jpg,png" },
          { id: 5, name: "Passport", description: "Passport copies", max_file_size_mb: 3, allowed_extensions: "pdf,jpg,png" },
          { id: 6, name: "Degree Certificate", description: "Degree certificates", max_file_size_mb: 5, allowed_extensions: "pdf,jpg,png" }
        ]);
      }
    } catch (error) {
      console.error('Error fetching document types:', error);
      // Set mock document types
      setDocumentTypes([
        { id: 1, name: "Mark Sheet", description: "Academic mark sheets", max_file_size_mb: 5, allowed_extensions: "pdf,jpg,png" },
        { id: 2, name: "Transfer Certificate", description: "Transfer certificates", max_file_size_mb: 3, allowed_extensions: "pdf,jpg,png" },
        { id: 3, name: "Birth Certificate", description: "Birth certificates", max_file_size_mb: 2, allowed_extensions: "pdf,jpg,png" },
        { id: 4, name: "Aadhar Card", description: "Aadhar identity cards", max_file_size_mb: 2, allowed_extensions: "pdf,jpg,png" },
        { id: 5, name: "Passport", description: "Passport copies", max_file_size_mb: 3, allowed_extensions: "pdf,jpg,png" },
        { id: 6, name: "Degree Certificate", description: "Degree certificates", max_file_size_mb: 5, allowed_extensions: "pdf,jpg,png" }
      ]);
    }
  };

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:8002/registrar/students/all', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setStudents(data);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:8002/registrar/recent-activity', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setRecentActivity(data);
      }
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  const fetchStudentData = async () => {
    try {
      console.log('Fetching student data...');
      
      // Validate token first
      if (!validateToken()) {
        console.log('Token validation failed - clearing and redirecting');
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return;
      }
      
      const token = localStorage.getItem('authToken');
      console.log('Token from localStorage:', token ? 'exists' : 'not found');
      console.log('Token length:', token ? token.length : 0);
      
      const headers: { [key: string]: string } = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log('Using token for authentication');
        console.log('Authorization header:', `Bearer ${token.substring(0, 20)}...`);
      } else {
        console.log('No token found in localStorage');
        console.log('Available localStorage keys:', Object.keys(localStorage));
      }
      
      const response = await fetch('http://localhost:8002/registrar/students/all', {
        headers: headers
      });
      
      console.log('Student data response status:', response.status);
      console.log('Response headers:', response.headers);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Student data received:', data);
        console.log('Number of students:', data.length);
        setStudentData(data);
      } else if (response.status === 401 || response.status === 403) {
        console.log('Authentication required for student data - showing empty state');
        const errorText = await response.text();
        console.error('Authentication error details:', errorText);
        
        // Token is invalid, clear and redirect
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
      } else {
        const errorText = await response.text();
        console.error('Student data error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error fetching student data:', error);
      // Use empty array on error instead of mock data
      setStudentData([]);
    }
  };

  const fetchStudentStats = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:8002/registrar/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStudentStats(data);
      } else {
        // Calculate stats from student data if API fails
        const calculatedStats = {
          total_students: studentData.length,
          verified_students: studentData.filter(s => s.verification_status === 'verified').length,
          pending_students: studentData.filter(s => s.verification_status === 'pending').length,
          rejected_students: studentData.filter(s => s.verification_status === 'rejected').length
        };
        setStudentStats(calculatedStats);
      }
    } catch (error) {
      console.error('Error fetching student stats:', error);
      // Calculate stats from student data on error
      const calculatedStats = {
        total_students: studentData.length,
        verified_students: studentData.filter(s => s.verification_status === 'verified').length,
        pending_students: studentData.filter(s => s.verification_status === 'pending').length,
        rejected_students: studentData.filter(s => s.verification_status === 'rejected').length
      };
      setStudentStats(calculatedStats);
    }
  };

  const fetchDepartments = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:8002/schools/departments', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDepartments(data);
      } else {
        // Set mock departments if API fails
        setDepartments([
          { id: 1, name: "Computer Science", school_id: 1 },
          { id: 2, name: "Electrical Engineering", school_id: 1 },
          { id: 3, name: "Mechanical Engineering", school_id: 1 },
          { id: 4, name: "Civil Engineering", school_id: 1 },
          { id: 5, name: "Business Administration", school_id: 2 }
        ]);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      // Set mock departments on error
      setDepartments([
        { id: 1, name: "Computer Science", school_id: 1 },
        { id: 2, name: "Electrical Engineering", school_id: 1 },
        { id: 3, name: "Mechanical Engineering", school_id: 1 },
        { id: 4, name: "Civil Engineering", school_id: 1 },
        { id: 5, name: "Business Administration", school_id: 2 }
      ]);
    }
  };

  // Enhanced search functionality
  const handleSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setFilteredDocuments(documents);
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`http://localhost:8002/registrar/search?q=${encodeURIComponent(searchTerm)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setFilteredDocuments(data);
      } else {
        // Fallback to client-side search
        const filtered = documents.filter(doc => 
          doc.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          doc.enrollment_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          doc.student_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          doc.document_type_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          doc.file_name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredDocuments(filtered);
      }
    } catch (error) {
      console.error('Error searching:', error);
      // Fallback to client-side search
      const filtered = documents.filter(doc => 
        doc.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.enrollment_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.student_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.document_type_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.file_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredDocuments(filtered);
    }
  };

  // Real-time search
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      handleSearch(searchTerm);
    }, 300);
    
    return () => clearTimeout(debounceTimer);
  }, [searchTerm, documents]);

  // Filter documents
  useEffect(() => {
    let filtered = documents;
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(doc => doc.verification_status === statusFilter);
    }
    
    if (documentTypeFilter !== 'all') {
      filtered = filtered.filter(doc => doc.document_type_name === documentTypeFilter);
    }
    
    setFilteredDocuments(filtered);
  }, [statusFilter, documentTypeFilter, documents]);

  // Student detail functionality
  const handleStudentClick = (student: any) => {
    setSelectedStudent(student);
    setShowStudentDetail(true);
    fetchStudentDocuments(student.student_id);
  };

  const fetchStudentDocuments = async (studentId: number) => {
    try {
      const token = localStorage.getItem('authToken');
      
      // Try to fetch student-specific documents
      const endpoints = [
        `http://localhost:8002/registrar/student/${studentId}/documents`,
        `http://localhost:8002/faculty/student/${studentId}/documents`
      ];

      let studentDocs: StudentDocument[] = [];

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data)) {
              studentDocs = data;
              console.log(`Successfully fetched ${data.length} documents for student ${studentId} from ${endpoint}`);
              break;
            }
          }
        } catch (endpointError) {
          console.log(`Failed to fetch student documents from ${endpoint}:`, endpointError);
          continue;
        }
      }

      // If no data from endpoints, filter from all documents
      if (studentDocs.length === 0) {
        studentDocs = allDocuments.filter(doc => doc.student_id === studentId);
        console.log(`Filtered ${studentDocs.length} documents for student ${studentId} from all documents`);
      }

      setStudentDocuments(studentDocs);
      
    } catch (error) {
      console.error('Error fetching student documents:', error);
      // Fallback to filtering from all documents
      const filteredDocs = allDocuments.filter(doc => doc.student_id === studentId);
      setStudentDocuments(filteredDocs);
    }
  };

  const handleBackToDashboard = () => {
    setShowStudentDetail(false);
    setSelectedStudent(null);
    setStudentDocuments([]);
  };

  const getStudentStats = (studentId: number) => {
    const studentDocs = allDocuments.filter(doc => doc.student_id === studentId);
    return {
      total: studentDocs.length,
      pending: studentDocs.filter(doc => doc.verification_status === 'pending').length,
      verified: studentDocs.filter(doc => doc.verification_status === 'verified').length,
      rejected: studentDocs.filter(doc => doc.verification_status === 'rejected').length
    };
  };

  // Handle document selection
  const toggleDocumentSelection = (documentId: number) => {
    setSelectedDocuments(prev => 
      prev.includes(documentId) 
        ? prev.filter(id => id !== documentId)
        : [...prev, documentId]
    );
  };

  const toggleAllDocuments = () => {
    if (selectedDocuments.length === filteredDocuments.length) {
      setSelectedDocuments([]);
    } else {
      setSelectedDocuments(filteredDocuments.map(doc => doc.id));
    }
  };

  // Single document verification
  const handleSingleVerification = async () => {
    if (!selectedDocument) return;

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`http://localhost:8002/registrar/documents/${selectedDocument.id}/verify`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          verification_status: singleVerificationStatus,
          remarks: singleRemarks
        })
      });

      if (response.ok) {
        fetchDocuments();
        fetchStats();
        setShowSingleVerifyModal(false);
        setSelectedDocument(null);
        setSingleRemarks('');
      } else {
        console.error('Verification failed:', response.statusText);
      }
    } catch (error) {
      console.error('Error verifying document:', error);
    }
  };

  // Bulk verification
  const handleBulkVerification = async () => {
    if (selectedDocuments.length === 0) return;

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:8002/registrar/documents/bulk-verify', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          document_ids: selectedDocuments,
          verification_status: bulkVerificationStatus,
          remarks: bulkRemarks
        })
      });

      if (response.ok) {
        fetchDocuments();
        fetchStats();
        setShowBulkVerifyModal(false);
        setSelectedDocuments([]);
        setBulkRemarks('');
      } else {
        console.error('Bulk verification failed:', response.statusText);
      }
    } catch (error) {
      console.error('Error in bulk verification:', error);
    }
  };

  // Check if token is valid and not expired
  const validateToken = () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      console.log('No token found');
      return false;
    }
    
    try {
      // Simple JWT token validation (check if it's properly formatted)
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.log('Invalid token format');
        return false;
      }
      
      // Decode the payload to check expiration
      const payload = JSON.parse(atob(parts[1]));
      const now = Date.now() / 1000;
      
      if (payload.exp && payload.exp < now) {
        console.log('Token expired at:', new Date(payload.exp * 1000));
        return false;
      }
      
      console.log('Token appears valid, expires at:', payload.exp ? new Date(payload.exp * 1000) : 'no expiration');
      return true;
    } catch (error) {
      console.error('Error validating token:', error);
      return false;
    }
  };

  // Enhanced document preview with actual file URL
  const getDocumentUrl = (document: StudentDocument) => {
    // For preview, we'll need to use a different approach since download endpoint returns file directly
    // For now, let's use the download endpoint and handle it appropriately
    return null; // We'll handle preview differently
  };

  // Get document preview URL (if available)
  const getDocumentPreviewUrl = (document: StudentDocument) => {
    // Try to construct a preview URL - this might need backend support
    // For now, we'll show a message that download is needed for preview
    return null;
  };

  // Download document
  const handleDownload = async (document: StudentDocument) => {
    try {
      const token = localStorage.getItem('authToken');
      console.log('Download - Token from localStorage:', token ? 'exists' : 'not found');
      console.log('Download - Token length:', token ? token.length : 0);
      
      // Use the registrar download endpoint
      const downloadUrl = `http://localhost:8002/registrar/documents/download/${document.id}`;
      
      const headers: { [key: string]: string } = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log('Download - Using token for authentication');
        console.log('Download - Authorization header:', `Bearer ${token.substring(0, 20)}...`);
      } else {
        console.log('Download - No token found in localStorage');
        console.log('Download - Available localStorage keys:', Object.keys(localStorage));
      }
      
      console.log('Attempting download from:', downloadUrl);
      
      const response = await fetch(downloadUrl, { headers });
      
      console.log('Download response status:', response.status);
      console.log('Download response headers:', response.headers);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const anchor = window.document.createElement('a');
        anchor.href = url;
        anchor.download = document.file_name;
        anchor.click();
        window.URL.revokeObjectURL(url);
        console.log('Download successful');
      } else {
        console.error('Download failed:', response.status, response.statusText);
        
        // Try to get more error details
        const errorText = await response.text();
        console.error('Download error details:', errorText);
        
        if (response.status === 401) {
          alert('Authentication failed. Please log out and log back in.');
        } else {
          alert(`Download failed: ${response.statusText}. Please check console for details.`);
        }
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Download failed. Please try again later.');
    }
  };

  // Logout function
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  // Preview document
  const handlePreview = (document: StudentDocument) => {
    setPreviewDocument(document);
  };

  // Student verification functions
  const handleVerifyStudent = async (student: StudentData) => {
    setSelectedStudentForVerification(student);
    setShowStudentVerifyModal(true);
  };

  const handleRejectStudent = async (student: StudentData) => {
    setSelectedStudentForVerification(student);
    setShowStudentRejectModal(true);
  };

  const confirmStudentVerification = async () => {
    if (!selectedStudentForVerification) return;

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`http://localhost:8002/registrar/students/${selectedStudentForVerification.id}/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          remarks: verificationRemarks
        })
      });

      if (response.ok) {
        fetchStudentData();
        fetchStudentStats();
        setShowStudentVerifyModal(false);
        setSelectedStudentForVerification(null);
        setVerificationRemarks('');
      }
    } catch (error) {
      console.error('Error verifying student:', error);
    }
  };

  const confirmStudentRejection = async () => {
    if (!selectedStudentForVerification) return;

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`http://localhost:8002/registrar/students/${selectedStudentForVerification.id}/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          rejection_reason: verificationRemarks
        })
      });

      if (response.ok) {
        fetchStudentData();
        fetchStudentStats();
        setShowStudentRejectModal(false);
        setSelectedStudentForVerification(null);
        setVerificationRemarks('');
      }
    } catch (error) {
      console.error('Error rejecting student:', error);
    }
  };

  const handleBulkStudentVerification = async () => {
    if (selectedStudents.length === 0) return;

    try {
      const token = localStorage.getItem('authToken');
      const endpoint = bulkStudentVerificationStatus === 'verified' 
        ? 'http://localhost:8002/registrar/students/bulk-verify' 
        : 'http://localhost:8002/registrar/students/bulk-verify';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          student_ids: selectedStudents
        })
      });

      if (response.ok) {
        fetchStudentData();
        fetchStudentStats();
        setShowBulkStudentVerifyModal(false);
        setSelectedStudents([]);
        setBulkStudentRemarks('');
      }
    } catch (error) {
      console.error('Error in bulk student verification:', error);
    }
  };

  const toggleStudentSelection = (studentId: number) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const toggleAllStudents = () => {
    const filteredStudents = getFilteredStudents();
    if (selectedStudents.length === filteredStudents.length && filteredStudents.length > 0) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map(s => s.id));
    }
  };

  const getFilteredStudents = () => {
    let filtered = studentData;
    
    if (studentStatusFilter !== 'all') {
      filtered = filtered.filter(student => student.verification_status === studentStatusFilter);
    }
    
    if (studentSearchTerm.trim()) {
      filtered = filtered.filter(student =>
        student.first_name.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
        student.last_name.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
        student.enrollment_number.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(studentSearchTerm.toLowerCase())
      );
    }
    
    return filtered;
  };

  const getFilteredFaculty = () => {
    let filtered = faculty;
    
    if (facultyDepartmentFilter !== 'all') {
      filtered = filtered.filter(faculty => faculty.department === facultyDepartmentFilter);
    }
    
    if (facultySearchTerm.trim()) {
      filtered = filtered.filter(faculty =>
        (faculty.first_name?.toLowerCase() || '').includes(facultySearchTerm.toLowerCase()) ||
        (faculty.last_name?.toLowerCase() || '').includes(facultySearchTerm.toLowerCase()) ||
        (faculty.employee_id?.toLowerCase() || '').includes(facultySearchTerm.toLowerCase()) ||
        (faculty.email?.toLowerCase() || '').includes(facultySearchTerm.toLowerCase()) ||
        (faculty.designation?.toLowerCase() || '').includes(facultySearchTerm.toLowerCase()) ||
        (faculty.department?.toLowerCase() || '').includes(facultySearchTerm.toLowerCase())
      );
    }
    
    return filtered;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'verified': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'verified': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  // Student Management Functions
  const handleAddStudent = async () => {
    // Validate all required fields
    if (newStudent.school_id === 0) {
      alert('Please select a school');
      return;
    }
    if (newStudent.department_id === 0) {
      alert('Please select a department');
      return;
    }
    if (newStudent.course_id === 0) {
      alert('Please select a course');
      return;
    }
    if (!newStudent.enrollment_number) {
      alert('Please select a department to generate enrollment number');
      return;
    }
    if (!newStudent.first_name.trim()) {
      alert('Please enter first name');
      return;
    }
    if (!newStudent.last_name.trim()) {
      alert('Please enter last name');
      return;
    }
    if (!newStudent.email.trim()) {
      alert('Please select a department to generate email');
      return;
    }
    if (!newStudent.phone.trim()) {
      alert('Please enter phone number');
      return;
    }
    if (!newStudent.personal_email.trim()) {
      alert('Please enter personal email');
      return;
    }
    if (!newStudent.batch.trim()) {
      alert('Please enter batch');
      return;
    }
    if (!newStudent.password) {
      alert('Please select a department to generate password');
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:8002/registrar/students/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          enrollment_number: newStudent.enrollment_number,
          first_name: newStudent.first_name,
          last_name: newStudent.last_name,
          email: newStudent.email,
          personal_email: newStudent.personal_email,
          phone: newStudent.phone,
          school_id: newStudent.school_id,
          department_id: newStudent.department_id,
          course_id: newStudent.course_id,
          semester: newStudent.semester,
          batch: newStudent.batch,
          admission_year: newStudent.admission_year,
          password: newStudent.password
        })
      });

      if (response.ok) {
        const responseData = await response.json();
        const message = responseData.message || "Student added successfully";
        const emailStatus = responseData.email_sent ? 
          "\n✅ Login credentials have been sent to the student's personal email." : 
          "\n⚠️ Failed to send credentials email. Please manually provide the credentials.";
        
        alert(`${message}${emailStatus}\n\nStudent Details:\nName: ${newStudent.first_name} ${newStudent.last_name}\nLogin Email: ${newStudent.email}\nPersonal Email: ${newStudent.personal_email}\nEnrollment Number: ${newStudent.enrollment_number}\nPassword: ${newStudent.password}\nSchool: ${schools.find(s => s.id === newStudent.school_id)?.name}\nDepartment: ${filteredDepartments.find(d => d.id === newStudent.department_id)?.name}\nCourse: ${filteredCourses.find(c => c.id === newStudent.course_id)?.name}`);
        setShowAddStudentModal(false);
        setNewStudent({
          enrollment_number: '',
          first_name: '',
          last_name: '',
          email: '',
          personal_email: '',
          phone: '',
          school_id: 0,
          department_id: 0,
          course_id: 0,
          semester: 1,
          batch: '',
          admission_year: new Date().getFullYear(),
          password: ''
        });
        fetchStudents();
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.detail || 'Failed to add student'}`);
      }
    } catch (error) {
      console.error('Error adding student:', error);
      alert('Failed to add student');
    }
  };

  const handleEditStudent = async () => {
    if (!selectedStudentForEdit) return;

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`http://localhost:8002/registrar/students/${selectedStudentForEdit.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editStudentData)
      });

      if (response.ok) {
        setShowEditStudentModal(false);
        fetchStudentData();
        fetchStudents();
        setSelectedStudentForEdit(null);
        alert('Student updated successfully!');
      } else {
        const error = await response.json();
        alert(`Error updating student: ${error.detail}`);
      }
    } catch (error) {
      console.error('Error updating student:', error);
      alert('Error updating student. Please try again.');
    }
  };

  const handleDeleteStudent = async () => {
    if (!selectedStudentForDelete) return;

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`http://localhost:8002/registrar/students/${selectedStudentForDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setShowDeleteConfirmModal(false);
        fetchStudentData();
        fetchStudents();
        setSelectedStudentForDelete(null);
        alert('Student deleted successfully!');
      } else {
        const error = await response.json();
        alert(`Error deleting student: ${error.detail}`);
      }
    } catch (error) {
      console.error('Error deleting student:', error);
      alert('Error deleting student. Please try again.');
    }
  };

  // Faculty Management Functions
  const generateEmployeeId = () => {
    const year = new Date().getFullYear();
    let randomNum: string;
    let newId: string;
    
    // Keep generating until we find a unique ID
    do {
      randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      newId = `FAC${year}${randomNum}`;
    } while (faculty.some(f => f.employee_id === newId));
    
    return newId;
  };

  const generateFacultyPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const generateFacultyEmail = (firstName: string, lastName: string) => {
    const cleanName = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`.replace(/[^a-z0-9.]/g, '');
    const domain = 'university.edu.in';  // ✅ Correct domain
    return `${cleanName}@${domain}`;
  };

  const generateFacultyCredentials = (firstName: string, lastName: string) => {
    if (!firstName || !lastName) return;
    
    const employeeId = generateEmployeeId();
    const email = generateFacultyEmail(firstName, lastName);
    const password = generateFacultyPassword();
    
    setGeneratedCredentials({
      employee_id: employeeId,
      email: email,
      password: password
    });
  };

  const handleDesignationChange = (designation: string) => {
    setNewFaculty({...newFaculty, designation});
    
    // Generate credentials only when designation is selected and name is provided
    if (designation && newFaculty.first_name && newFaculty.last_name) {
      generateFacultyCredentials(newFaculty.first_name, newFaculty.last_name);
    }
  };

  const handleFacultyNameChange = (field: 'first_name' | 'last_name', value: string) => {
    const updatedFaculty = {...newFaculty, [field]: value};
    setNewFaculty(updatedFaculty);
    
    // Generate credentials only when both names and designation are provided
    if (updatedFaculty.first_name && updatedFaculty.last_name && updatedFaculty.designation) {
      generateFacultyCredentials(updatedFaculty.first_name, updatedFaculty.last_name);
    }
  };

  const handleAddFaculty = async () => {
    // Validate all required fields
    if (!newFaculty.first_name || !newFaculty.last_name || !newFaculty.personal_email || !newFaculty.designation || !newFaculty.department_id) {
      alert('Please fill all required fields');
      return;
    }

    // Use generated credentials
    const employeeId = generatedCredentials.employee_id;
    const email = generatedCredentials.email;
    const password = generatedCredentials.password;

    // Ensure credentials are generated
    if (!employeeId || !email || !password) {
      alert('Please ensure all fields are filled to generate credentials');
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:8002/registrar/faculty', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          employee_id: employeeId,
          first_name: newFaculty.first_name,
          last_name: newFaculty.last_name,
          email: email,
          personal_email: newFaculty.personal_email,
          phone: newFaculty.phone,
          designation: newFaculty.designation,
          department_id: newFaculty.department_id,
          password: password
        })
      });

      if (response.ok) {
        const responseData = await response.json();
        const message = responseData.message || "Faculty added successfully";
        const emailStatus = responseData.email_sent ? 
          "\n✅ Login credentials have been sent to the faculty's personal email." : 
          "\n⚠️ Failed to send credentials email. Please manually provide the credentials.";
        
        alert(`${message}${emailStatus}\n\nFaculty Details:\nName: ${newFaculty.first_name} ${newFaculty.last_name}\nLogin Email: ${email}\nPersonal Email: ${newFaculty.personal_email}\nEmployee ID: ${employeeId}\nPassword: ${password}\nDesignation: ${newFaculty.designation}\nDepartment: ${newFaculty.department_id === 1 ? 'Computer Science' : 'Unknown'}`);
        setShowAddFacultyModal(false);
        setNewFaculty({
          employee_id: '',
          first_name: '',
          last_name: '',
          email: '',
          personal_email: '',
          phone: '',
          designation: '',
          department_id: 0,
          password: ''
        });
        setGeneratedCredentials({
          employee_id: '',
          email: '',
          password: ''
        });
        setShowPassword(false);
        // Refresh faculty list
        fetchFaculty();
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.detail || 'Failed to add faculty'}`);
      }
    } catch (error) {
      console.error('Error adding faculty:', error);
      alert('Failed to add faculty');
    }
  };

  const fetchFaculty = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:8002/registrar/faculty', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFaculty(data);
      }
    } catch (error) {
      console.error('Error fetching faculty:', error);
    }
  };

  const openEditModal = (student: StudentData) => {
    setSelectedStudentForEdit(student);
    setEditStudentData({
      first_name: student.first_name,
      last_name: student.last_name,
      phone: student.phone || '',
      department_id: 0, // This would need to be mapped from department name
      semester: student.semester,
      batch: student.batch || '',
      admission_year: student.admission_year || new Date().getFullYear(),
      gpa: Number(student.gpa),
      attendance_percentage: Number(student.attendance_percentage)
    });
    setShowEditStudentModal(true);
  };

  const openDeleteModal = (student: StudentData) => {
    setSelectedStudentForDelete(student);
    setShowDeleteConfirmModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Enhanced Header */}
      <header className="bg-white shadow-xl border-b border-slate-200 sticky top-0 z-40">
        <div className="px-2 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-12 sm:h-14 lg:h-16">
            {/* Left Section - Logo and Menu */}
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-all duration-200"
              >
                {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
              <div className="flex items-center ml-0 lg:ml-2">
                <div className="ml-2">
                  <h1 className="text-sm sm:text-base lg:text-lg xl:text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">CampusGenie</h1>
                </div>
              </div>
            </div>
            
            {/* Right Section - Time, Notifications, Profile */}
            <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-4">
              {/* Time Display - Responsive */}
              <div className="hidden md:block text-right">
                <div className="text-xs sm:text-sm font-semibold text-gray-900 flex items-center">
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1 text-blue-500" />
                  <span className="hidden lg:inline">
                    {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                  <span className="lg:hidden">
                    {currentTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <div className="text-xs text-gray-500 font-medium">
                  <span className="hidden sm:inline">
                    {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <span className="sm:hidden">
                    {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
              
              {/* Mobile Time */}
              <div className="md:hidden">
                <div className="text-xs text-gray-500 font-medium">
                  {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-1.5 sm:p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-lg transition-all duration-200 group"
                >
                  <Bell className="w-4 h-4 sm:w-5 sm:h-5 group-hover:animate-pulse" />
                  {stats.pending_documents > 0 && (
                    <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse border-2 border-white"></span>
                  )}
                </button>
                
                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3">
                      <h3 className="text-white font-semibold flex items-center">
                        <Bell className="w-4 h-4 mr-2" />
                        Notifications
                      </h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {stats.pending_documents > 0 ? (
                        <div className="p-4">
                          <div className="flex items-start space-x-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div className="p-2 bg-yellow-100 rounded-full">
                              <Clock className="w-4 h-4 text-yellow-600" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">Pending Documents</p>
                              <p className="text-xs text-gray-600">You have {stats.pending_documents} documents waiting for verification</p>
                              <p className="text-xs text-yellow-600 mt-1">Requires attention</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 text-center">
                          <div className="p-3 bg-green-100 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                          </div>
                          <p className="text-sm text-gray-600">All caught up!</p>
                          <p className="text-xs text-gray-500">No pending documents</p>
                        </div>
                      )}
                    </div>
                    <div className="border-t border-slate-200 p-3">
                      <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">View all notifications</button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowProfile(!showProfile)}
                  className="flex items-center space-x-1 sm:space-x-2 p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 transition-all duration-200 group"
                >
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                    <User className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                  </div>
                  <div className="hidden sm:block text-right">
                    <p className="text-xs sm:text-sm font-medium text-gray-900">Registrar</p>
                    <p className="text-xs text-gray-500 hidden lg:block">Online</p>
                  </div>
                  <ChevronDown className={`w-3 h-3 sm:w-4 sm:h-4 text-gray-400 transition-transform duration-200 ${showProfile ? 'rotate-180' : ''}`} />
                </button>
                
                {/* Profile Dropdown Menu */}
                {showProfile && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50">
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="text-white font-semibold">Registrar Admin</p>
                          <p className="text-blue-100 text-sm">registrar@university.edu.in</p>
                        </div>
                      </div>
                    </div>
                    <div className="py-2">
                      <button className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center space-x-3">
                        <User className="w-4 h-4 text-gray-400" />
                        <span>My Profile</span>
                      </button>
                      <button className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center space-x-3">
                        <Settings className="w-4 h-4 text-gray-400" />
                        <span>Settings</span>
                      </button>
                      <button className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center space-x-3">
                        <HelpCircle className="w-4 h-4 text-gray-400" />
                        <span>Help & Support</span>
                      </button>
                      <div className="border-t border-slate-200 my-2"></div>
                      <button 
                        onClick={handleLogout}
                        className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center space-x-3"
                      >
                        <LogOut className="w-4 h-4 text-red-500" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex relative">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        {/* Enhanced Sidebar */}
        <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 ease-in-out bg-gradient-to-b from-slate-900 to-slate-800 border-r border-slate-700 overflow-hidden fixed h-full z-30 shadow-2xl`}>
          {/* Sidebar Header */}
          <div className="p-6 border-b border-slate-700 bg-gradient-to-r from-blue-600/20 to-purple-600/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">CampusGenie</h2>
                  <p className="text-xs text-blue-300">Registrar Portal</p>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Compact Navigation Menu */}
          <nav className="p-4 space-y-2">
            {/* Main Dropdown */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(dropdownOpen === 'main' ? null : 'main')}
                onMouseEnter={() => setHoveredItem('main')}
                onMouseLeave={() => setHoveredItem(null)}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                  dropdownOpen === 'main' || activeMenuItem.startsWith('main-')
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/25' 
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Home className="w-5 h-5" />
                  <span>Main</span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${dropdownOpen === 'main' ? 'rotate-180' : ''}`} />
              </button>
              
              {dropdownOpen === 'main' && (
                <div className="absolute left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-10 overflow-hidden">
                  <button
                    onClick={() => {setActiveMenuItem('dashboard'); setDropdownOpen(null);}}
                    className={`w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium transition-all duration-200 ${
                      activeMenuItem === 'dashboard' 
                        ? 'bg-blue-600 text-white' 
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <Home className="w-4 h-4" />
                    <span className="flex-1 text-left">Dashboard</span>
                  </button>
                  <button
                    onClick={() => {setActiveMenuItem('documents'); setDropdownOpen(null);}}
                    className={`w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium transition-all duration-200 ${
                      activeMenuItem === 'documents' 
                        ? 'bg-blue-600 text-white' 
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span className="flex-1 text-left">Documents</span>
                    <span className="bg-blue-500/20 text-blue-300 text-xs px-2 py-1 rounded-full font-medium">{stats.pending_documents || 0}</span>
                  </button>
                  <button
                    onClick={() => {setActiveMenuItem('students'); setDropdownOpen(null);}}
                    className={`w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium transition-all duration-200 ${
                      activeMenuItem === 'students' 
                        ? 'bg-blue-600 text-white' 
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span className="flex-1 text-left">Students</span>
                    <span className="bg-green-500/20 text-green-300 text-xs px-2 py-1 rounded-full font-medium">{studentStats.total_students || 0}</span>
                  </button>
                  <button
                    onClick={() => {setActiveMenuItem('verification'); setDropdownOpen(null);}}
                    className={`w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium transition-all duration-200 ${
                      activeMenuItem === 'verification' 
                        ? 'bg-blue-600 text-white' 
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <FileCheck className="w-4 h-4" />
                    <span className="flex-1 text-left">Verification</span>
                    <span className="bg-yellow-500/20 text-yellow-300 text-xs px-2 py-1 rounded-full font-medium">{studentStats.pending_students || 0}</span>
                  </button>
                  <button
                    onClick={() => {setActiveMenuItem('faculty'); setDropdownOpen(null);}}
                    className={`w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium transition-all duration-200 ${
                      activeMenuItem === 'faculty' 
                        ? 'bg-blue-600 text-white' 
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <Briefcase className="w-4 h-4" />
                    <span className="flex-1 text-left">Faculty</span>
                    <span className="bg-purple-500/20 text-purple-300 text-xs px-2 py-1 rounded-full font-medium">{faculty.length}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Management Dropdown */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(dropdownOpen === 'management' ? null : 'management')}
                onMouseEnter={() => setHoveredItem('management')}
                onMouseLeave={() => setHoveredItem(null)}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                  dropdownOpen === 'management' || activeMenuItem.startsWith('management-')
                    ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-500/25' 
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Settings className="w-5 h-5" />
                  <span>Management</span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${dropdownOpen === 'management' ? 'rotate-180' : ''}`} />
              </button>
              
              {dropdownOpen === 'management' && (
                <div className="absolute left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-10 overflow-hidden">
                  <button
                    onClick={() => {setActiveMenuItem('uploads'); setDropdownOpen(null);}}
                    className={`w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium transition-all duration-200 ${
                      activeMenuItem === 'uploads' 
                        ? 'bg-purple-600 text-white' 
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <Upload className="w-4 h-4" />
                    <span className="flex-1 text-left">Uploads</span>
                    <UploadCloud className="w-4 h-4 text-slate-400" />
                  </button>
                  <button
                    onClick={() => {setActiveMenuItem('archive'); setDropdownOpen(null);}}
                    className={`w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium transition-all duration-200 ${
                      activeMenuItem === 'archive' 
                        ? 'bg-purple-600 text-white' 
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <Archive className="w-4 h-4" />
                    <span className="flex-1 text-left">Archive</span>
                    <Package className="w-4 h-4 text-slate-400" />
                  </button>
                  <button
                    onClick={() => {setActiveMenuItem('reports'); setDropdownOpen(null);}}
                    className={`w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium transition-all duration-200 ${
                      activeMenuItem === 'reports' 
                        ? 'bg-purple-600 text-white' 
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span className="flex-1 text-left">Reports</span>
                    <PieChart className="w-4 h-4 text-slate-400" />
                  </button>
                  <button
                    onClick={() => {setActiveMenuItem('analytics'); setDropdownOpen(null);}}
                    className={`w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium transition-all duration-200 ${
                      activeMenuItem === 'analytics' 
                        ? 'bg-purple-600 text-white' 
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4" />
                    <span className="flex-1 text-left">Analytics</span>
                    <Activity className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              )}
            </div>

            {/* System Dropdown */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(dropdownOpen === 'system' ? null : 'system')}
                onMouseEnter={() => setHoveredItem('system')}
                onMouseLeave={() => setHoveredItem(null)}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                  dropdownOpen === 'system' || activeMenuItem.startsWith('system-')
                    ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg shadow-green-500/25' 
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Shield className="w-5 h-5" />
                  <span>System</span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${dropdownOpen === 'system' ? 'rotate-180' : ''}`} />
              </button>
              
              {dropdownOpen === 'system' && (
                <div className="absolute left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-10 overflow-hidden">
                  <button
                    onClick={() => {setActiveMenuItem('settings'); setDropdownOpen(null);}}
                    className={`w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium transition-all duration-200 ${
                      activeMenuItem === 'settings' 
                        ? 'bg-green-600 text-white' 
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <Settings className="w-4 h-4" />
                    <span className="flex-1 text-left">Settings</span>
                    <Shield className="w-4 h-4 text-slate-400" />
                  </button>
                  <button
                    onClick={() => {setActiveMenuItem('users'); setDropdownOpen(null);}}
                    className={`w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium transition-all duration-200 ${
                      activeMenuItem === 'users' 
                        ? 'bg-green-600 text-white' 
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <UserCheck className="w-4 h-4" />
                    <span className="flex-1 text-left">User Management</span>
                    <Users className="w-4 h-4 text-slate-400" />
                  </button>
                  <button
                    onClick={() => {setActiveMenuItem('help'); setDropdownOpen(null);}}
                    className={`w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium transition-all duration-200 ${
                      activeMenuItem === 'help' 
                        ? 'bg-green-600 text-white' 
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <HelpCircle className="w-4 h-4" />
                    <span className="flex-1 text-left">Help & Support</span>
                    <MessageSquare className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              )}
            </div>

            {/* Enhanced Logout Button */}
            <div className="pt-4 mt-4 border-t border-slate-700">
              <button
                onClick={handleLogout}
                onMouseEnter={() => setHoveredItem('logout')}
                onMouseLeave={() => setHoveredItem(null)}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                  hoveredItem === 'logout' 
                    ? 'bg-red-600/20 text-red-300 border border-red-500/30' 
                    : 'text-red-400/70 hover:bg-red-600/10 hover:text-red-300'
                }`}
              >
                <LogOut className="w-5 h-5" />
                <span className="flex-1 text-left">Logout</span>
                {hoveredItem === 'logout' && (
                  <ArrowUpRight className="w-4 h-4 rotate-180" />
                )}
              </button>
            </div>
          </nav>

          {/* Enhanced Sidebar Footer */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700 bg-gradient-to-t from-slate-900 to-slate-800/50">
            <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-800"></div>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">Registrar Admin</p>
                <p className="text-xs text-green-400 flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                  Online
                </p>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setShowProfile(!showProfile)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                  title="Profile"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-600/20 rounded-lg transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* System Status */}
            <div className="mt-3 p-2 rounded-lg bg-slate-800/30 border border-slate-700">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">System Status</span>
                <span className="text-green-400 flex items-center">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></div>
                  Healthy
                </span>
              </div>
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-slate-400">Last Sync</span>
                <span className="text-slate-300">{new Date().toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6 pt-4 sm:pt-6 lg:pt-8 lg:ml-64">
          {/* Student Detail View */}
          {showStudentDetail && selectedStudent && (
            <div className="mb-6">
              {/* Back Button and Student Header */}
              <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl shadow-xl p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={handleBackToDashboard}
                    className="flex items-center space-x-2 text-white hover:bg-white/20 px-4 py-2 rounded-lg transition-colors"
                  >
                    <ArrowUpRight className="w-4 h-4 rotate-180" />
                    <span>Back to Dashboard</span>
                  </button>
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">{selectedStudent.student_name}</h2>
                      <p className="text-blue-100">{selectedStudent.enrollment_number}</p>
                    </div>
                  </div>
                </div>

                {/* Student Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {(() => {
                    const studentStats = getStudentStats(selectedStudent.student_id);
                    return (
                      <>
                        <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-blue-100 text-sm">Total Documents</p>
                              <p className="text-2xl font-bold text-white">{studentStats.total}</p>
                            </div>
                            <div className="p-3 bg-white/20 rounded-lg">
                              <FileText className="w-5 h-5 text-white" />
                            </div>
                          </div>
                        </div>
                        <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-blue-100 text-sm">Pending</p>
                              <p className="text-2xl font-bold text-yellow-300">{studentStats.pending}</p>
                            </div>
                            <div className="p-3 bg-yellow-500/20 rounded-lg">
                              <Clock className="w-5 h-5 text-yellow-300" />
                            </div>
                          </div>
                        </div>
                        <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-blue-100 text-sm">Verified</p>
                              <p className="text-2xl font-bold text-green-300">{studentStats.verified}</p>
                            </div>
                            <div className="p-3 bg-green-500/20 rounded-lg">
                              <CheckCircle className="w-5 h-5 text-green-300" />
                            </div>
                          </div>
                        </div>
                        <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-blue-100 text-sm">Rejected</p>
                              <p className="text-2xl font-bold text-red-300">{studentStats.rejected}</p>
                            </div>
                            <div className="p-3 bg-red-500/20 rounded-lg">
                              <XCircle className="w-5 h-5 text-red-300" />
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Student Documents Table */}
              <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Student Documents</h3>
                      <p className="text-sm text-gray-600 mt-1">All documents for {selectedStudent.student_name}</p>
                    </div>
                    {selectedDocuments.length > 0 && (
                      <div className="flex items-center space-x-3">
                        <span className="text-sm text-gray-600">
                          {selectedDocuments.length} document{selectedDocuments.length > 1 ? 's' : ''} selected
                        </span>
                        <button
                          onClick={() => {
                            setBulkVerificationStatus('verified');
                            setShowBulkVerifyModal(true);
                          }}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                        >
                          Approve Selected
                        </button>
                        <button
                          onClick={() => {
                            setBulkVerificationStatus('rejected');
                            setShowBulkVerifyModal(true);
                          }}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                        >
                          Reject Selected
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <tr>
                        <th className="px-6 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={selectedDocuments.length === studentDocuments.length && studentDocuments.length > 0}
                            onChange={() => {
                              if (selectedDocuments.length === studentDocuments.length) {
                                setSelectedDocuments([]);
                              } else {
                                setSelectedDocuments(studentDocuments.map((doc: StudentDocument) => doc.id));
                              }
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Document Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          File Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Uploaded
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {studentDocuments.map((doc: StudentDocument) => (
                        <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={selectedDocuments.includes(doc.id)}
                              onChange={() => toggleDocumentSelection(doc.id)}
                              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              <div className="p-2 bg-blue-100 rounded-lg">
                                <FileText className="w-4 h-4 text-blue-600" />
                              </div>
                              <span className="font-medium text-gray-900">{doc.document_type_name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-gray-900">{doc.file_name}</span>
                              <span className="text-xs text-gray-500">({doc.file_size_mb} MB)</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {(() => {
                              const statusConfig = {
                                pending: { color: 'yellow', icon: Clock, text: 'Pending' },
                                verified: { color: 'green', icon: CheckCircle, text: 'Verified' },
                                rejected: { color: 'red', icon: XCircle, text: 'Rejected' }
                              };
                              const config = statusConfig[doc.verification_status];
                              const Icon = config.icon;
                              return (
                                <div className={`flex items-center space-x-2 px-3 py-1 bg-${config.color}-100 text-${config.color}-800 rounded-full text-xs font-medium`}>
                                  <Icon className="w-3 h-3" />
                                  <span>{config.text}</span>
                                </div>
                              );
                            })()}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              {new Date(doc.uploaded_at).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(doc.uploaded_at).toLocaleTimeString()}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handlePreview(doc)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Preview"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDownload(doc)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Download"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              {doc.verification_status === 'pending' && (
                                <button
                                  onClick={() => {
                                    setSelectedDocument(doc);
                                    setShowSingleVerifyModal(true);
                                  }}
                                  className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                  title="Verify"
                                >
                                  <FileCheck className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {studentDocuments.length === 0 && (
                    <div className="text-center py-12">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No documents found for this student</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Main Dashboard (shown when not in student detail view) */}
          {!showStudentDetail && (
            <div>
              {/* View Toggle Buttons */}
              <div className="bg-white rounded-2xl shadow-xl p-4 mb-6 border border-gray-200">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex items-center space-x-4">
                    <h3 className="text-lg font-semibold text-gray-900">View Mode:</h3>
                    <div className="flex bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => setCurrentView('documents')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          currentView === 'documents'
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-700 hover:text-gray-900'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <FileText className="w-4 h-4" />
                          <span>Documents</span>
                        </div>
                      </button>
                      <button
                        onClick={() => setCurrentView('students')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          currentView === 'students'
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-700 hover:text-gray-900'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4" />
                          <span>Students</span>
                        </div>
                      </button>
                      <button
                        onClick={() => setCurrentView('faculty')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          currentView === 'faculty'
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-700 hover:text-gray-900'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <Briefcase className="w-4 h-4" />
                          <span>Faculty</span>
                        </div>
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 flex justify-end">
                    <div className="text-sm text-gray-500">
                      {currentView === 'documents' 
                        ? `Showing ${filteredDocuments.length} documents`
                        : currentView === 'students'
                        ? `Showing ${getFilteredStudents().length} students`
                        : `Showing ${getFilteredFaculty().length} faculty`
                      }
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6 mb-6 lg:mb-8">
                {currentView === 'documents' && (
                  <>
                    {/* Total Documents Card */}
                    <div className="group bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-lg hover:shadow-2xl p-6 border border-blue-200 transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-4 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300">
                          <FileText className="w-7 h-7 text-white" />
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{stats.total_documents}</p>
                          <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide">Total</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-sm text-blue-700 font-medium">
                          <TrendingUp className="w-4 h-4 mr-1" />
                          <span>All documents</span>
                        </div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                    
                    {/* Pending Documents Card */}
                    <div className="group bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl shadow-lg hover:shadow-2xl p-6 border border-yellow-200 transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-4 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300">
                          <Clock className="w-7 h-7 text-white" />
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">{stats.pending_documents}</p>
                          <p className="text-xs text-yellow-600 font-semibold uppercase tracking-wide">Pending</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-sm text-yellow-700 font-medium">
                          <Zap className="w-4 h-4 mr-1" />
                          <span>Need attention</span>
                        </div>
                        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                    
                    {/* Verified Documents Card */}
                    <div className="group bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-lg hover:shadow-2xl p-6 border border-green-200 transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300">
                          <FileCheck className="w-7 h-7 text-white" />
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">{stats.verified_documents}</p>
                          <p className="text-xs text-green-600 font-semibold uppercase tracking-wide">Verified</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-sm text-green-700 font-medium">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          <span>Completed</span>
                        </div>
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                    
                    {/* Rejected Documents Card */}
                    <div className="group bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl shadow-lg hover:shadow-2xl p-6 border border-red-200 transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-4 bg-gradient-to-r from-red-500 to-pink-600 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300">
                          <FileX className="w-7 h-7 text-white" />
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">{stats.rejected_documents}</p>
                          <p className="text-xs text-red-600 font-semibold uppercase tracking-wide">Rejected</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-sm text-red-700 font-medium">
                          <XCircle className="w-4 h-4 mr-1" />
                          <span>Not approved</span>
                        </div>
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                    
                    {/* Total Students Card */}
                    <div className="group bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl shadow-lg hover:shadow-2xl p-6 border border-purple-200 transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-4 bg-gradient-to-r from-purple-500 to-violet-600 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300">
                          <Users className="w-7 h-7 text-white" />
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">{stats.total_students}</p>
                          <p className="text-xs text-purple-600 font-semibold uppercase tracking-wide">Students</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-sm text-purple-700 font-medium">
                          <Award className="w-4 h-4 mr-1" />
                          <span>Total enrolled</span>
                        </div>
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                  </>
                )}
                
                {currentView === 'students' && (
                  <>
                    {/* Total Students Card */}
                    <div className="group bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl shadow-lg hover:shadow-2xl p-6 border border-purple-200 transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-4 bg-gradient-to-r from-purple-500 to-violet-600 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300">
                          <Users className="w-7 h-7 text-white" />
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">{studentStats.total_students}</p>
                          <p className="text-xs text-purple-600 font-semibold uppercase tracking-wide">Total</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-sm text-purple-700 font-medium">
                          <Award className="w-4 h-4 mr-1" />
                          <span>All students</span>
                        </div>
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                    
                    {/* Pending Students Card */}
                    <div className="group bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl shadow-lg hover:shadow-2xl p-6 border border-yellow-200 transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-4 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300">
                          <Clock className="w-7 h-7 text-white" />
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">{studentStats.pending_students}</p>
                          <p className="text-xs text-yellow-600 font-semibold uppercase tracking-wide">Pending</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-sm text-yellow-700 font-medium">
                          <Zap className="w-4 h-4 mr-1" />
                          <span>Need verification</span>
                        </div>
                        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                    
                    {/* Verified Students Card */}
                    <div className="group bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-lg hover:shadow-2xl p-6 border border-green-200 transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300">
                          <UserCheck className="w-7 h-7 text-white" />
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">{studentStats.verified_students}</p>
                          <p className="text-xs text-green-600 font-semibold uppercase tracking-wide">Verified</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-sm text-green-700 font-medium">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          <span>Approved</span>
                        </div>
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                    
                    {/* Rejected Students Card */}
                    <div className="group bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl shadow-lg hover:shadow-2xl p-6 border border-red-200 transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-4 bg-gradient-to-r from-red-500 to-pink-600 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300">
                          <UserX className="w-7 h-7 text-white" />
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">{studentStats.rejected_students}</p>
                          <p className="text-xs text-red-600 font-semibold uppercase tracking-wide">Rejected</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-sm text-red-700 font-medium">
                          <XCircle className="w-4 h-4 mr-1" />
                          <span>Not approved</span>
                        </div>
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                    
                    {/* Documents per Student Card */}
                    <div className="group bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-lg hover:shadow-2xl p-6 border border-blue-200 transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-4 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300">
                          <FileText className="w-7 h-7 text-white" />
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{studentStats.total_students > 0 ? Math.round(stats.total_documents / studentStats.total_students) : 0}</p>
                          <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide">Avg Docs</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-sm text-blue-700 font-medium">
                          <BarChart3 className="w-4 h-4 mr-1" />
                          <span>Per student</span>
                        </div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                  </>
                )}
                
                {currentView === 'faculty' && (
                  <>
                    {/* Total Faculty Card */}
                    <div className="group bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-lg hover:shadow-2xl p-6 border border-blue-200 transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-4 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300">
                          <Briefcase className="w-7 h-7 text-white" />
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{faculty.length}</p>
                          <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide">Total</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-sm text-blue-700 font-medium">
                          <Users className="w-4 h-4 mr-1" />
                          <span>All faculty</span>
                        </div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                    
                    {/* Active Faculty Card */}
                    <div className="group bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-lg hover:shadow-2xl p-6 border border-green-200 transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300">
                          <UserCheck className="w-7 h-7 text-white" />
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">{faculty.filter(f => f.id).length}</p>
                          <p className="text-xs text-green-600 font-semibold uppercase tracking-wide">Active</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-sm text-green-700 font-medium">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          <span>Currently active</span>
                        </div>
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                    
                    {/* Departments Card */}
                    <div className="group bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl shadow-lg hover:shadow-2xl p-6 border border-purple-200 transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-4 bg-gradient-to-r from-purple-500 to-violet-600 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300">
                          <Building className="w-7 h-7 text-white" />
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">{new Set(faculty.map(f => f.department)).size}</p>
                          <p className="text-xs text-purple-600 font-semibold uppercase tracking-wide">Depts</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-sm text-purple-700 font-medium">
                          <MapPin className="w-4 h-4 mr-1" />
                          <span>Departments</span>
                        </div>
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                    
                    {/* Add Faculty Button */}
                    <div className="group bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-lg hover:shadow-2xl p-6 border border-blue-200 transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
                      <button
                        onClick={() => setShowAddFacultyModal(true)}
                        className="w-full h-full flex flex-col items-center justify-center text-center"
                      >
                        <div className="p-4 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300 mb-3">
                          <Plus className="w-7 h-7 text-white" />
                        </div>
                        <p className="text-sm font-medium text-blue-700">Add Faculty</p>
                        <p className="text-xs text-blue-600">New member</p>
                      </button>
                    </div>
                  </>
                )}
              </div>

          {/* Enhanced Filters Section */}
          {currentView === 'documents' ? (
            <div className="bg-gradient-to-r from-white via-blue-50 to-white rounded-2xl shadow-xl p-4 lg:p-6 mb-6 border border-blue-200 backdrop-blur-sm">
              <div className="flex flex-col xl:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search by student name, enrollment number, or document type..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="block w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/80 backdrop-blur-sm placeholder-gray-400"
                    />
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative group">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                      className="appearance-none w-full sm:w-auto px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/80 backdrop-blur-sm cursor-pointer hover:bg-white"
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="verified">Verified</option>
                      <option value="rejected">Rejected</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                  
                  <div className="relative group">
                    <select
                      value={documentTypeFilter}
                      onChange={(e) => setDocumentTypeFilter(e.target.value)}
                      className="appearance-none w-full sm:w-auto px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/80 backdrop-blur-sm cursor-pointer hover:bg-white"
                    >
                      <option value="all">All Document Types</option>
                      {documentTypes.map(type => (
                        <option key={type.id} value={type.name}>{type.name}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                  
                  <button
                    onClick={fetchDocuments}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span className="hidden sm:inline">Refresh</span>
                  </button>
                </div>
              </div>
            </div>
          ) : currentView === 'students' ? (
            <div className="bg-gradient-to-r from-white via-purple-50 to-white rounded-2xl shadow-xl p-4 lg:p-6 mb-6 border border-purple-200 backdrop-blur-sm">
              <div className="flex flex-col xl:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search by student name, enrollment number, or email..."
                      value={studentSearchTerm}
                      onChange={(e) => setStudentSearchTerm(e.target.value)}
                      className="block w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white/80 backdrop-blur-sm placeholder-gray-400"
                    />
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative group">
                    <select
                      value={studentStatusFilter}
                      onChange={(e) => setStudentStatusFilter(e.target.value as any)}
                      className="appearance-none w-full sm:w-auto px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white/80 backdrop-blur-sm cursor-pointer hover:bg-white"
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="verified">Verified</option>
                      <option value="rejected">Rejected</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                  
                  <button
                    onClick={fetchStudentData}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl hover:from-purple-700 hover:to-violet-700 transition-all duration-200 font-medium flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span className="hidden sm:inline">Refresh</span>
                  </button>
                </div>
              </div>
            </div>
          ) : currentView === 'faculty' ? (
            <div className="bg-gradient-to-r from-white via-blue-50 to-white rounded-2xl shadow-xl p-4 lg:p-6 mb-6 border border-blue-200 backdrop-blur-sm">
              <div className="flex flex-col xl:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search by faculty name, employee ID, email, designation, or department..."
                      value={facultySearchTerm}
                      onChange={(e) => setFacultySearchTerm(e.target.value)}
                      className="block w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/80 backdrop-blur-sm placeholder-gray-400"
                    />
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative group">
                    <select
                      value={facultyDepartmentFilter}
                      onChange={(e) => setFacultyDepartmentFilter(e.target.value)}
                      className="appearance-none w-full sm:w-auto px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/80 backdrop-blur-sm cursor-pointer hover:bg-white"
                    >
                      <option value="all">All Departments</option>
                      <option value="Computer Science">Computer Science</option>
                      <option value="Information Technology">Information Technology</option>
                      <option value="Electronics & Communication">Electronics & Communication</option>
                      <option value="Electrical Engineering">Electrical Engineering</option>
                      <option value="Mechanical Engineering">Mechanical Engineering</option>
                      <option value="Civil Engineering">Civil Engineering</option>
                      <option value="Chemical Engineering">Chemical Engineering</option>
                      <option value="Business Administration">Business Administration</option>
                      <option value="Physics">Physics</option>
                      <option value="Chemistry">Chemistry</option>
                      <option value="Mathematics">Mathematics</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                  
                  <button
                    onClick={fetchFaculty}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span className="hidden sm:inline">Refresh</span>
                  </button>
                </div>
              </div>
            </div>
          ) : null
          }

          {/* Bulk Actions Enhanced */}
          {currentView === 'documents' && selectedDocuments.length > 0 && (
            <div className="bg-gradient-to-r from-blue-100 via-indigo-100 to-purple-100 border-2 border-blue-300 rounded-3xl p-6 mb-6 shadow-xl animate-pulse backdrop-blur-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg">
                    <ClipboardList className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <span className="text-blue-900 font-bold text-lg">
                      {selectedDocuments.length} document(s) selected
                    </span>
                    <p className="text-blue-700 text-sm">Ready for bulk verification</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      setBulkVerificationStatus('verified');
                      setShowBulkVerifyModal(true);
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-medium flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <CheckSquare className="w-5 h-5" />
                    <span>Verify All</span>
                  </button>
                  <button
                    onClick={() => {
                      setBulkVerificationStatus('rejected');
                      setShowBulkVerifyModal(true);
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl hover:from-red-700 hover:to-pink-700 transition-all duration-200 font-medium flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <XSquare className="w-5 h-5" />
                    <span>Reject All</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Student Bulk Actions */}
          {currentView === 'students' && selectedStudents.length > 0 && (
            <div className="bg-gradient-to-r from-purple-100 via-violet-100 to-pink-100 border-2 border-purple-300 rounded-3xl p-6 mb-6 shadow-xl animate-pulse backdrop-blur-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-gradient-to-r from-purple-600 to-violet-600 rounded-2xl shadow-lg">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <span className="text-purple-900 font-bold text-lg">
                      {selectedStudents.length} student(s) selected
                    </span>
                    <p className="text-purple-700 text-sm">Ready for bulk verification</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      setBulkStudentVerificationStatus('verified');
                      setShowBulkStudentVerifyModal(true);
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-medium flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <CheckSquare className="w-5 h-5" />
                    <span>Verify All</span>
                  </button>
                  <button
                    onClick={() => {
                      setBulkStudentVerificationStatus('rejected');
                      setShowBulkStudentVerifyModal(true);
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl hover:from-red-700 hover:to-pink-700 transition-all duration-200 font-medium flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <XSquare className="w-5 h-5" />
                    <span>Reject All</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Documents Table */}
          {currentView === 'documents' ? (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-blue-200">
            <div className="px-4 lg:px-6 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 border-b border-blue-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-3">
                  <div className="p-2 bg-white/20 backdrop-blur rounded-xl">
                    <FileSearch className="w-5 h-5 text-white" />
                  </div>
                  Document Verification Queue
                </h2>
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-2 bg-white/20 backdrop-blur px-3 py-1 rounded-full">
                    <span className="text-white font-medium">{filteredDocuments.length}</span>
                    <span className="text-blue-100">documents</span>
                  </div>
                  {selectedDocuments.length > 0 && (
                    <div className="flex items-center space-x-2 bg-green-500/20 backdrop-blur px-3 py-1 rounded-full">
                      <span className="text-white font-medium">{selectedDocuments.length}</span>
                      <span className="text-green-100">selected</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-gray-100">
                <thead className="bg-gradient-to-r from-gray-50 to-blue-50">
                  <tr>
                    <th className="px-1 lg:px-2 py-2 text-left">
                      <input
                        type="checkbox"
                        checked={selectedDocuments.length === filteredDocuments.length && filteredDocuments.length > 0}
                        onChange={toggleAllDocuments}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
                      />
                    </th>
                    <th className="px-1 lg:px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Students
                    </th>
                    <th className="px-1 lg:px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Documents
                    </th>
                    <th className="px-1 lg:px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-1 lg:px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {(() => {
                    // Group documents by student
                    const studentsWithDocuments = filteredDocuments.reduce((acc, doc) => {
                      if (!acc[doc.student_id]) {
                        acc[doc.student_id] = {
                          student_id: doc.student_id,
                          student_name: doc.student_name,
                          student_email: doc.student_email,
                          enrollment_number: doc.enrollment_number,
                          documents: []
                        };
                      }
                      acc[doc.student_id].documents.push(doc);
                      return acc;
                    }, {} as Record<number, any>);

                    const studentList = Object.values(studentsWithDocuments);
                    
                    if (studentList.length === 0) {
                      return (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center">
                            <div className="flex flex-col items-center">
                              <FileText className="w-12 h-12 text-gray-400 mb-4" />
                              <p className="text-gray-500 text-lg font-medium">No documents found</p>
                              <p className="text-gray-400 text-sm mt-1">No student documents are pending verification</p>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return studentList.map((student, index) => (
                      <tr key={student.student_id} className={`hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className="px-1 lg:px-2 py-3">
                          <input
                            type="checkbox"
                            checked={student.documents.every((doc: StudentDocument) => selectedDocuments.includes(doc.id))}
                            onChange={() => {
                              const allDocIds = student.documents.map((doc: StudentDocument) => doc.id);
                              const allSelected = allDocIds.every((id: number) => selectedDocuments.includes(id));
                              
                              if (allSelected) {
                                // Deselect all documents for this student
                                setSelectedDocuments(prev => prev.filter((id: number) => !allDocIds.includes(id)));
                              } else {
                                // Select all documents for this student
                                setSelectedDocuments(prev => Array.from(new Set([...prev, ...allDocIds])));
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-1 lg:px-2 py-3">
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
                              <User className="w-3 h-3 text-white" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-medium text-gray-900 truncate cursor-pointer hover:text-blue-600" 
                                   onClick={() => handleStudentClick(student)}
                                   title={student.student_name}>
                                {student.student_name}
                              </div>
                              <div className="text-xs text-gray-500 truncate">{student.enrollment_number}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-1 lg:px-2 py-3">
                          <div className="text-xs text-gray-600">
                            {student.documents.length} document{student.documents.length > 1 ? 's' : ''}
                          </div>
                          <div className="text-xs text-gray-400">
                            {student.documents.filter((d: StudentDocument) => d.verification_status === 'pending').length} pending
                          </div>
                        </td>
                        <td className="px-1 lg:px-2 py-3">
                          <div className="flex flex-col space-y-1">
                            {student.documents.slice(0, 2).map((doc: StudentDocument, docIndex: number) => (
                              <div key={docIndex} className="flex items-center space-x-1">
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(doc.verification_status)}`}>
                                  {getStatusIcon(doc.verification_status)}
                                  <span className="ml-0.5 text-xs">{doc.verification_status}</span>
                                </span>
                                <span className="text-xs text-gray-500 truncate">{doc.document_type_name}</span>
                              </div>
                            ))}
                            {student.documents.length > 2 && (
                              <div className="text-xs text-gray-400">+{student.documents.length - 2} more</div>
                            )}
                          </div>
                        </td>
                        <td className="px-1 lg:px-2 py-3">
                          <div className="flex items-center space-x-0.5">
                            <button
                              onClick={() => handleStudentClick(student)}
                              className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded transition-colors"
                              title="View All Documents"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {student.documents.some((d: StudentDocument) => d.verification_status === 'pending') && (
                              <button
                                onClick={() => handleStudentClick(student)}
                                className="p-1 text-purple-600 hover:text-purple-800 hover:bg-purple-100 rounded transition-colors"
                                title="Review Documents"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        ) : currentView === 'students' ? (
          /* Enhanced Students Table */
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-purple-200">
            <div className="px-4 lg:px-6 py-4 bg-gradient-to-r from-purple-600 via-violet-600 to-pink-600 border-b border-purple-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-3">
                  <div className="p-2 bg-white/20 backdrop-blur rounded-xl">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  Student Management
                </h2>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setShowAddStudentModal(true)}
                    className="px-4 py-2 bg-white/20 backdrop-blur text-white rounded-lg hover:bg-white/30 transition-colors font-medium flex items-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Add Student
                  </button>
                  <div className="flex items-center space-x-2 bg-white/20 backdrop-blur px-3 py-1 rounded-full">
                    <span className="text-white font-medium">{getFilteredStudents().length}</span>
                    <span className="text-purple-100">students</span>
                  </div>
                  {selectedStudents.length > 0 && (
                    <div className="flex items-center space-x-2 bg-green-500/20 backdrop-blur px-3 py-1 rounded-full">
                      <span className="text-white font-medium">{selectedStudents.length}</span>
                      <span className="text-green-100">selected</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-gray-100">
                <thead className="bg-gradient-to-r from-gray-50 to-purple-50">
                  <tr>
                    <th className="px-4 lg:px-6 py-4 text-left">
                      <input
                        type="checkbox"
                        checked={selectedStudents.length === getFilteredStudents().length && getFilteredStudents().length > 0}
                        onChange={toggleAllStudents}
                        className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 focus:ring-2"
                      />
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Student Information
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden lg:table-cell">
                      Academic Details
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Verification Status
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden sm:table-cell">
                      Performance
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {getFilteredStudents().length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <Users className="w-12 h-12 text-gray-400 mb-4" />
                          <p className="text-gray-500 text-lg font-medium">No students found</p>
                          <p className="text-gray-400 text-sm mt-1">
                            {studentData.length === 0 
                              ? 'No student data available. Please check your connection or try refreshing.'
                              : 'Try adjusting your filters or search criteria.'
                            }
                          </p>
                          <button
                            onClick={fetchStudentData}
                            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center gap-2"
                          >
                            <RefreshCw className="w-4 h-4" />
                            Refresh Data
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    getFilteredStudents().map((student, index) => (
                      <tr key={student.id} className={`hover:bg-purple-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student.id)}
                          onChange={() => toggleStudentSelection(student.id)}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-violet-500 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {student.first_name} {student.last_name}
                            </div>
                            <div className="text-sm text-gray-500">{student.enrollment_number}</div>
                            <div className="flex items-center text-xs text-gray-400">
                              <Mail className="w-3 h-3 mr-1" />
                              {student.email}
                            </div>
                            {student.phone && (
                              <div className="flex items-center text-xs text-gray-400 mt-1">
                                <Phone className="w-3 h-3 mr-1" />
                                {student.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">{student.department}</div>
                          <div className="text-gray-500">Semester {student.semester}</div>
                          <div className="text-xs text-gray-400">
                            Joined: {new Date(student.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {(() => {
                          const statusConfig = {
                            pending: { color: 'yellow', icon: Clock, text: 'Pending' },
                            verified: { color: 'green', icon: UserCheck, text: 'Verified' },
                            rejected: { color: 'red', icon: UserX, text: 'Rejected' }
                          };
                          const config = statusConfig[student.verification_status];
                          const Icon = config.icon;
                          return (
                            <div className={`flex items-center space-x-2 px-3 py-1 bg-${config.color}-100 text-${config.color}-800 rounded-full text-xs font-medium`}>
                              <Icon className="w-3 h-3" />
                              <span>{config.text}</span>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 hidden sm:table-cell">
                        <div className="text-sm">
                          <div className="flex items-center space-x-4">
                            <div>
                              <div className="font-medium text-gray-900">GPA: {Number(student.gpa).toFixed(2)}</div>
                              <div className="text-xs text-gray-500">Grade Point Average</div>
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{Number(student.attendance_percentage).toFixed(1)}%</div>
                              <div className="text-xs text-gray-500">Attendance</div>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          {student.verification_status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleVerifyStudent(student)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Verify Student"
                              >
                                <UserCheck className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleRejectStudent(student)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Reject Student"
                              >
                                <UserX className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => {
                              setSelectedStudent({
                                student_id: student.id,
                                student_name: `${student.first_name} ${student.last_name}`,
                                student_email: student.email,
                                enrollment_number: student.enrollment_number
                              });
                              setShowStudentDetail(true);
                            }}
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(student)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Student"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(student)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Student"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Enhanced Faculty Table */
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-blue-200">
            <div className="px-4 lg:px-6 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 border-b border-blue-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-3">
                  <div className="p-2 bg-white/20 backdrop-blur rounded-xl">
                    <Briefcase className="w-5 h-5 text-white" />
                  </div>
                  Faculty Management
                </h2>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setShowAddFacultyModal(true)}
                    className="px-4 py-2 bg-white/20 backdrop-blur text-white rounded-lg hover:bg-white/30 transition-colors font-medium flex items-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Add Faculty
                  </button>
                  <div className="flex items-center space-x-2 bg-white/20 backdrop-blur px-3 py-1 rounded-full">
                    <span className="text-white font-medium">{faculty.length}</span>
                    <span className="text-blue-100">faculty</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Faculty</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Details</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Designation</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Department</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {faculty.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <Briefcase className="w-12 h-12 text-gray-400 mb-4" />
                          <p className="text-gray-500 text-lg font-medium">No faculty found</p>
                          <p className="text-gray-400 text-sm mt-1">Get started by adding your first faculty member</p>
                          <button
                            onClick={() => setShowAddFacultyModal(true)}
                            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
                          >
                            <UserPlus className="w-4 h-4" />
                            Add Faculty
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    getFilteredFaculty().map((facultyMember) => (
                      <tr key={facultyMember.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                              <Briefcase className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {facultyMember.first_name} {facultyMember.last_name}
                              </div>
                              <div className="text-sm text-gray-500">{facultyMember.employee_id}</div>
                              <div className="flex items-center text-xs text-gray-400">
                                <Mail className="w-3 h-3 mr-1" />
                                {facultyMember.email}
                              </div>
                              {facultyMember.phone && (
                                <div className="flex items-center text-xs text-gray-400 mt-1">
                                  <Phone className="w-3 h-3 mr-1" />
                                  {facultyMember.phone}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 hidden lg:table-cell">
                          <div className="text-sm">
                            <div className="flex items-center text-xs text-gray-400">
                              <Mail className="w-3 h-3 mr-1" />
                              {facultyMember.personal_email}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              Joined: {new Date(facultyMember.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            {facultyMember.designation}
                          </span>
                        </td>
                        <td className="px-6 py-4 hidden lg:table-cell">
                          <div className="text-sm text-gray-900">{facultyMember.department}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <button
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Edit Faculty"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Faculty"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
            </div>
          )}
        </main>

        {/* Enhanced Bulk Verification Modal */}
        {showBulkVerifyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${bulkVerificationStatus === 'verified' ? 'bg-green-100' : 'bg-red-100'}`}>
                    {bulkVerificationStatus === 'verified' ? 
                      <CheckSquare className="w-5 h-5 text-green-600" /> : 
                      <XSquare className="w-5 h-5 text-red-600" />
                    }
                  </div>
                  {bulkVerificationStatus === 'verified' ? 'Verify' : 'Reject'} {selectedDocuments.length} Document(s)
                </h3>
                <button
                  onClick={() => setShowBulkVerifyModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-800">
                    You are about to {bulkVerificationStatus} {selectedDocuments.length} document(s). This action cannot be undone.
                  </p>
                </div>
                
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Verification Remarks (Optional)
                </label>
                <textarea
                  value={bulkRemarks}
                  onChange={(e) => setBulkRemarks(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Add any remarks or comments for this verification..."
                />
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowBulkVerifyModal(false)}
                  className="px-6 py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkVerification}
                  className={`px-6 py-3 text-white rounded-xl transition-all duration-200 font-medium shadow-lg hover:shadow-xl ${
                    bulkVerificationStatus === 'verified' 
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700' 
                      : 'bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700'
                  }`}
                >
                  {bulkVerificationStatus === 'verified' ? 'Verify Documents' : 'Reject Documents'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Single Verification Modal */}
        {showSingleVerifyModal && selectedDocument && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold mb-4">
                {singleVerificationStatus === 'verified' ? 'Verify' : 'Reject'} Document
              </h3>
              <div className="mb-4">
                <div className="text-sm text-gray-600">
                  <div><strong>Student:</strong> {selectedDocument.student_name}</div>
                  <div><strong>Document:</strong> {selectedDocument.document_type_name}</div>
                  <div><strong>File:</strong> {selectedDocument.file_name}</div>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Verification Status
                </label>
                <select
                  value={singleVerificationStatus}
                  onChange={(e) => setSingleVerificationStatus(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="verified">Verified</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Remarks (Optional)
                </label>
                <textarea
                  value={singleRemarks}
                  onChange={(e) => setSingleRemarks(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add any remarks..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowSingleVerifyModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSingleVerification}
                  className={`px-4 py-2 text-white rounded-lg ${
                    singleVerificationStatus === 'verified' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {singleVerificationStatus === 'verified' ? 'Verify Document' : 'Reject Document'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Document Preview Modal */}
        {previewDocument && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-6 border border-slate-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-blue-600" />
                  Document Preview - {previewDocument.file_name}
                </h3>
                <button
                  onClick={() => setPreviewDocument(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Document Info */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div><strong>Student:</strong> {previewDocument.student_name} ({previewDocument.enrollment_number})</div>
                  <div><strong>Document Type:</strong> {previewDocument.document_type_name}</div>
                  <div><strong>File Name:</strong> {previewDocument.file_name}</div>
                  <div><strong>File Size:</strong> {previewDocument.file_size_mb} MB</div>
                  <div><strong>Uploaded:</strong> {new Date(previewDocument.uploaded_at).toLocaleString()}</div>
                  <div><strong>Status:</strong> 
                    <span className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(previewDocument.verification_status)}`}>
                      {getStatusIcon(previewDocument.verification_status)}
                      <span className="ml-1">{previewDocument.verification_status}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Document Preview Area */}
              <div className="border border-gray-200 rounded-lg p-8 bg-gray-50 mb-6 text-center">
                <div className="bg-white rounded-lg p-8 shadow-sm">
                  <FileText className="w-20 h-20 mx-auto mb-4 text-blue-600" />
                  <p className="text-lg font-medium text-gray-900 mb-2">Document Ready for Review</p>
                  <p className="text-sm text-gray-600 mb-6">
                    {previewDocument.file_extension.toUpperCase()} file: {previewDocument.document_type_name}
                  </p>
                  
                  <div className="bg-gray-50 rounded p-4 text-left mb-6 max-w-md mx-auto">
                    <p className="text-xs text-gray-500 mb-2">Document details:</p>
                    <p className="text-sm mb-1">• File type: {previewDocument.file_extension.toUpperCase()}</p>
                    <p className="text-sm mb-1">• Content: {previewDocument.document_type_name}</p>
                    <p className="text-sm mb-1">• Size: {previewDocument.file_size_mb} MB</p>
                    <p className="text-sm">• Uploaded: {new Date(previewDocument.uploaded_at).toLocaleDateString()}</p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={() => handleDownload(previewDocument)}
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium flex items-center gap-2 shadow-lg hover:shadow-xl"
                    >
                      <DownloadCloud className="w-4 h-4" />
                      Download to View Document
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="flex gap-3">
                  <button
                    onClick={() => handleDownload(previewDocument)}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium flex items-center gap-2 shadow-lg hover:shadow-xl"
                  >
                    <DownloadCloud className="w-4 h-4" />
                    Download Document
                  </button>
                </div>
                
                {previewDocument.verification_status === 'pending' && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setSelectedDocument(previewDocument);
                        setSingleVerificationStatus('rejected');
                        setShowSingleVerifyModal(true);
                        setPreviewDocument(null);
                      }}
                      className="px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl hover:from-red-700 hover:to-pink-700 transition-all duration-200 font-medium flex items-center gap-2 shadow-lg hover:shadow-xl"
                    >
                      <XSquare className="w-4 h-4" />
                      Reject Document
                    </button>
                    <button
                      onClick={() => {
                        setSelectedDocument(previewDocument);
                        setSingleVerificationStatus('verified');
                        setShowSingleVerifyModal(true);
                        setPreviewDocument(null);
                      }}
                      className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-medium flex items-center gap-2 shadow-lg hover:shadow-xl"
                    >
                      <CheckSquare className="w-4 h-4" />
                      Approve Document
                    </button>
                  </div>
                )}
                
                <button
                  onClick={() => setPreviewDocument(null)}
                  className="px-6 py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Student Verification Modal */}
        {showStudentVerifyModal && selectedStudentForVerification && (
          <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <UserCheck className="w-5 h-5 text-green-600" />
                  </div>
                  Verify Student
                </h3>
                <button
                  onClick={() => setShowStudentVerifyModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="mb-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-green-800">
                    You are about to verify {selectedStudentForVerification.first_name} {selectedStudentForVerification.last_name}. This action will approve the student's verification status.
                  </p>
                </div>
                
                <div className="space-y-3 text-sm text-gray-600">
                  <div><strong>Name:</strong> {selectedStudentForVerification.first_name} {selectedStudentForVerification.last_name}</div>
                  <div><strong>Enrollment:</strong> {selectedStudentForVerification.enrollment_number}</div>
                  <div><strong>Email:</strong> {selectedStudentForVerification.email}</div>
                  <div><strong>Department:</strong> {selectedStudentForVerification.department}</div>
                  <div><strong>Semester:</strong> {selectedStudentForVerification.semester}</div>
                </div>
                
                <label className="block text-sm font-medium text-gray-700 mb-2 mt-4">
                  Verification Remarks (Optional)
                </label>
                <textarea
                  value={verificationRemarks}
                  onChange={(e) => setVerificationRemarks(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Add any remarks or comments for this verification..."
                />
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowStudentVerifyModal(false)}
                  className="px-6 py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmStudentVerification}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                >
                  Verify Student
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Student Rejection Modal */}
        {showStudentRejectModal && selectedStudentForVerification && (
          <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <UserX className="w-5 h-5 text-red-600" />
                  </div>
                  Reject Student
                </h3>
                <button
                  onClick={() => setShowStudentRejectModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="mb-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-red-800">
                    You are about to reject {selectedStudentForVerification.first_name} {selectedStudentForVerification.last_name}. This action cannot be undone.
                  </p>
                </div>
                
                <div className="space-y-3 text-sm text-gray-600">
                  <div><strong>Name:</strong> {selectedStudentForVerification.first_name} {selectedStudentForVerification.last_name}</div>
                  <div><strong>Enrollment:</strong> {selectedStudentForVerification.enrollment_number}</div>
                  <div><strong>Email:</strong> {selectedStudentForVerification.email}</div>
                  <div><strong>Department:</strong> {selectedStudentForVerification.department}</div>
                  <div><strong>Semester:</strong> {selectedStudentForVerification.semester}</div>
                </div>
                
                <label className="block text-sm font-medium text-gray-700 mb-2 mt-4">
                  Rejection Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={verificationRemarks}
                  onChange={(e) => setVerificationRemarks(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Please provide a reason for rejection..."
                  required
                />
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowStudentRejectModal(false)}
                  className="px-6 py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmStudentRejection}
                  className="px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl hover:from-red-700 hover:to-pink-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                >
                  Reject Student
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Student Verification Modal */}
        {showBulkStudentVerifyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${bulkStudentVerificationStatus === 'verified' ? 'bg-green-100' : 'bg-red-100'}`}>
                    {bulkStudentVerificationStatus === 'verified' ? 
                      <CheckSquare className="w-5 h-5 text-green-600" /> : 
                      <XSquare className="w-5 h-5 text-red-600" />
                    }
                  </div>
                  {bulkStudentVerificationStatus === 'verified' ? 'Verify' : 'Reject'} {selectedStudents.length} Student(s)
                </h3>
                <button
                  onClick={() => setShowBulkStudentVerifyModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="mb-6">
                <div className={`bg-${bulkStudentVerificationStatus === 'verified' ? 'green' : 'red'}-50 border border-${bulkStudentVerificationStatus === 'verified' ? 'green' : 'red'}-200 rounded-lg p-4 mb-4`}>
                  <p className={`text-sm text-${bulkStudentVerificationStatus === 'verified' ? 'green' : 'red'}-800`}>
                    You are about to {bulkStudentVerificationStatus} {selectedStudents.length} student(s). This action cannot be undone.
                  </p>
                </div>
                
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {bulkStudentVerificationStatus === 'verified' ? 'Verification' : 'Rejection'} Remarks (Optional)
                </label>
                <textarea
                  value={bulkStudentRemarks}
                  onChange={(e) => setBulkStudentRemarks(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder={`Add any remarks or comments for this ${bulkStudentVerificationStatus}...`}
                />
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowBulkStudentVerifyModal(false)}
                  className="px-6 py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkStudentVerification}
                  className={`px-6 py-3 text-white rounded-xl transition-all duration-200 font-medium shadow-lg hover:shadow-xl ${
                    bulkStudentVerificationStatus === 'verified' 
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700' 
                      : 'bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700'
                  }`}
                >
                  {bulkStudentVerificationStatus === 'verified' ? 'Verify Students' : 'Reject Students'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Student Modal */}
        {showAddStudentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-green-600" />
                  Add New Student
                </h3>
                <button
                  onClick={() => setShowAddStudentModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Enrollment Number</label>
                  <input
                    type="text"
                    value={newStudent.enrollment_number}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Auto-generated when department is selected"
                  />
                  <p className="text-xs text-gray-500 mt-1">Automatically generated based on department and year</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={newStudent.email}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Auto-generated when department is selected"
                  />
                  <p className="text-xs text-gray-500 mt-1">Automatically generated as enrollment_number@university.edu.in</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    value={newStudent.first_name}
                    onChange={(e) => setNewStudent({...newStudent, first_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    value={newStudent.last_name}
                    onChange={(e) => setNewStudent({...newStudent, last_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                  <input
                    type="text"
                    value={newStudent.phone}
                    onChange={(e) => setNewStudent({...newStudent, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+91 9876543210"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Personal Email *</label>
                  <input
                    type="email"
                    value={newStudent.personal_email}
                    onChange={(e) => setNewStudent({...newStudent, personal_email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="student.personal@gmail.com"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Student's personal email to receive login credentials</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">School *</label>
                  <select
                    value={newStudent.school_id}
                    onChange={(e) => handleSchoolChange(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value={0}>Select School</option>
                    {schools.map(school => (
                      <option key={school.id} value={school.id}>{school.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Select school first to enable department selection</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
                  <select
                    value={newStudent.department_id}
                    onChange={(e) => handleDepartmentChange(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={newStudent.school_id === 0}
                  >
                    <option value={0}>Select Department</option>
                    {filteredDepartments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Selecting department will auto-generate enrollment number, email, and password</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Course *</label>
                  <select
                    value={newStudent.course_id}
                    onChange={(e) => handleCourseChange(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={newStudent.department_id === 0}
                  >
                    <option value={0}>Select Course</option>
                    {filteredCourses.map(course => (
                      <option key={course.id} value={course.id}>
                        {course.name} ({course.duration_years} years) - {course.type}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Select the specific course the student wants to pursue</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Semester *</label>
                  <input
                    type="number"
                    value={newStudent.semester}
                    onChange={(e) => setNewStudent({...newStudent, semester: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                    max="8"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Batch *</label>
                  <input
                    type="text"
                    value={newStudent.batch}
                    onChange={(e) => setNewStudent({...newStudent, batch: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 2024-2028"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Admission Year *</label>
                  <input
                    type="number"
                    value={newStudent.admission_year}
                    onChange={(e) => setNewStudent({...newStudent, admission_year: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="2020"
                    max="2030"
                    required
                  />
                </div>
                                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="text"
                    value={newStudent.password}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Auto-generated when department is selected"
                  />
                  <p className="text-xs text-gray-500 mt-1">System-generated password (8 characters). Please save this password for the student.</p>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowAddStudentModal(false)}
                  className="px-6 py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddStudent}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                >
                  Add Student
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Faculty Modal */}
        {showAddFacultyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-blue-600" />
                  Add New Faculty
                </h3>
                <button
                  onClick={() => setShowAddFacultyModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                  <input
                    type="text"
                    value={generatedCredentials.employee_id || ''}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Select designation and enter name to generate"
                  />
                  <p className="text-xs text-gray-500 mt-1">Automatically generated when designation and name are provided</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={generatedCredentials.email || ''}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Select designation and enter name to generate"
                  />
                  <p className="text-xs text-gray-500 mt-1">Automatically generated as firstname.lastname@faculty.university.edu</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    value={newFaculty.first_name}
                    onChange={(e) => handleFacultyNameChange('first_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    value={newFaculty.last_name}
                    onChange={(e) => handleFacultyNameChange('last_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                  <input
                    type="text"
                    value={newFaculty.phone}
                    onChange={(e) => setNewFaculty({...newFaculty, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+91 9876543210"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Personal Email *</label>
                  <input
                    type="email"
                    value={newFaculty.personal_email}
                    onChange={(e) => setNewFaculty({...newFaculty, personal_email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="faculty.personal@gmail.com"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Faculty's personal email to receive login credentials</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Designation *</label>
                  <select
                    value={newFaculty.designation}
                    onChange={(e) => handleDesignationChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Designation</option>
                    <option value="Professor">Professor</option>
                    <option value="Associate Professor">Associate Professor</option>
                    <option value="Assistant Professor">Assistant Professor</option>
                    <option value="Lecturer">Lecturer</option>
                    <option value="Lab Instructor">Lab Instructor</option>
                    <option value="Teaching Assistant">Teaching Assistant</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Selecting designation will generate faculty credentials</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
                  <select
                    value={newFaculty.department_id}
                    onChange={(e) => setNewFaculty({...newFaculty, department_id: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value={0}>Select Department</option>
                    <option value={1}>Computer Science</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Select the department where faculty will be assigned</p>
                </div>
                                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={generatedCredentials.password || ''}
                      readOnly
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Select designation and enter name to generate"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">System-generated password (12 characters). Click eye icon to {showPassword ? 'hide' : 'show'} password. Will be sent to faculty's personal email.</p>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowAddFacultyModal(false)}
                  className="px-6 py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddFaculty}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                >
                  Add Faculty
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Student Modal */}
        {showEditStudentModal && selectedStudentForEdit && (
          <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Edit className="w-5 h-5 text-blue-600" />
                  Edit Student: {selectedStudentForEdit.first_name} {selectedStudentForEdit.last_name}
                </h3>
                <button
                  onClick={() => setShowEditStudentModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={editStudentData.first_name}
                    onChange={(e) => setEditStudentData({...editStudentData, first_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={editStudentData.last_name}
                    onChange={(e) => setEditStudentData({...editStudentData, last_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={editStudentData.phone}
                    onChange={(e) => setEditStudentData({...editStudentData, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <select
                    value={editStudentData.department_id}
                    onChange={(e) => setEditStudentData({...editStudentData, department_id: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={0}>Select Department</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                  <input
                    type="number"
                    value={editStudentData.semester}
                    onChange={(e) => setEditStudentData({...editStudentData, semester: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                    max="8"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Batch</label>
                  <input
                    type="text"
                    value={editStudentData.batch}
                    onChange={(e) => setEditStudentData({...editStudentData, batch: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Admission Year</label>
                  <input
                    type="number"
                    value={editStudentData.admission_year}
                    onChange={(e) => setEditStudentData({...editStudentData, admission_year: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="2020"
                    max="2030"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GPA</label>
                  <input
                    type="number"
                    value={editStudentData.gpa}
                    onChange={(e) => setEditStudentData({...editStudentData, gpa: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="10"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Attendance %</label>
                  <input
                    type="number"
                    value={editStudentData.attendance_percentage}
                    onChange={(e) => setEditStudentData({...editStudentData, attendance_percentage: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowEditStudentModal(false)}
                  className="px-6 py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditStudent}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                >
                  Update Student
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirmModal && selectedStudentForDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-red-600" />
                  Delete Student
                </h3>
                <button
                  onClick={() => setShowDeleteConfirmModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 font-medium mb-2">Are you sure you want to delete this student?</p>
                  <div className="text-sm text-red-600">
                    <p><strong>Name:</strong> {selectedStudentForDelete.first_name} {selectedStudentForDelete.last_name}</p>
                    <p><strong>Email:</strong> {selectedStudentForDelete.email}</p>
                    <p><strong>Enrollment:</strong> {selectedStudentForDelete.enrollment_number}</p>
                  </div>
                  <p className="text-red-600 text-sm mt-3">This action cannot be undone. All associated documents and data will be permanently deleted.</p>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirmModal(false)}
                  className="px-6 py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteStudent}
                  className="px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl hover:from-red-700 hover:to-pink-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                >
                  Delete Student
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegistrarDashboard;
