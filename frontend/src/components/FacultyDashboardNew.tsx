import React, { useState, useEffect } from 'react';
import { 
  // Navigation Icons
  Home,
  Users,
  BookOpen,
  Calendar,
  FileText,
  MessageSquare,
  Settings,
  LogOut,
  Bell,
  Search,
  Menu,
  X,
  
  // Dashboard Icons
  TrendingUp,
  Award,
  Clock,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  PieChart,
  Activity,
  
  // Task Management Icons
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
  Upload,
  Filter,
  RefreshCw,
  Target,
  Flag,
  Star,
  
  // Communication Icons
  Send,
  Reply,
  Forward,
  Paperclip,
  Phone,
  Mail,
  Video,
  UserCheck,
  
  // Class Management Icons
  UserPlus,
  UserMinus,
  GraduationCap,
  ClipboardList,
  CheckSquare,
  XSquare,
  
  // Document Icons
  FileCheck,
  FileX,
  FolderOpen,
  Archive,
  Stamp,
  
  // Other Icons
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Grid3x3,
  List,
  Zap,
  Shield,
  Database,
  Wifi
} from 'lucide-react';

// Import new components
import ClassManagement from './ClassManagement';
import FacultyCommunication from './FacultyCommunication';
import FacultyProfile from './FacultyProfile';

const API_BASE = process.env.REACT_APP_API_URL || API_BASE + '';

interface FacultyStats {
  total_students: number;
  active_classes: number;
  pending_tasks: number;
  unread_messages: number;
  pending_documents: number;
  today_classes: number;
  weekly_hours: number;
  avg_student_performance: number;
}

interface Student {
  id: number;
  enrollment_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  department: string;
  semester: number;
  gpa: number;
  attendance_percentage: number;
  last_active: string;
  status: 'active' | 'inactive' | 'on_leave';
}

interface Task {
  id: number;
  title: string;
  description: string;
  type: 'assignment' | 'quiz' | 'project' | 'exam' | 'lab';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'draft' | 'published' | 'closed';
  due_date: string;
  max_score: number;
  assigned_class: string;
  submissions_count: number;
  total_students: number;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: number;
  sender: string;
  sender_email: string;
  recipient: string;
  recipient_email: string;
  subject: string;
  content: string;
  timestamp: string;
  is_read: boolean;
  is_starred: boolean;
  is_archived: boolean;
  type: 'student' | 'faculty' | 'registrar' | 'admin' | 'system';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  has_attachment: boolean;
  attachments?: Attachment[];
  thread_id?: number;
  reply_count: number;
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'draft';
}

interface Class {
  id: number;
  name: string;
  code: string;
  department: string;
  semester: number;
  schedule: string;
  room: string;
  students_count: number;
  next_class: string;
  status: 'active' | 'inactive';
  faculty_name?: string;
  credits: number;
  description: string;
}

interface Document {
  id: number;
  student_name: string;
  student_id: number;
  document_type: string;
  file_name: string;
  uploaded_at: string;
  verification_status: 'pending' | 'verified' | 'rejected';
  priority: 'low' | 'medium' | 'high';
}

interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'message' | 'task' | 'grade' | 'system' | 'announcement';
  priority: 'low' | 'medium' | 'high';
  timestamp: string;
  is_read: boolean;
  action_url?: string;
  icon?: string;
}

interface Attachment {
  id: number;
  file_name: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
}

const FacultyDashboard: React.FC = () => {
  // Navigation State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  
  // Data State
  const [stats, setStats] = useState<FacultyStats>({
    total_students: 0,
    active_classes: 0,
    pending_tasks: 0,
    unread_messages: 0,
    pending_documents: 0,
    today_classes: 0,
    weekly_hours: 0,
    avg_student_performance: 0
  });
  const [students, setStudents] = useState<Student[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [facultyProfile, setFacultyProfile] = useState<any>(null);
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Form State
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    type: 'assignment' as const,
    priority: 'medium' as const,
    due_date: '',
    max_score: 100,
    assigned_class: ''
  });
  
  const [messageForm, setMessageForm] = useState({
    recipient: '',
    subject: '',
    content: '',
    type: 'student' as const
  });

  // Update current time
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch data
  useEffect(() => {
    fetchFacultyData();
    const interval = setInterval(fetchFacultyData, 30000); // Real-time updates
    return () => clearInterval(interval);
  }, []);

  const fetchFacultyData = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.error('No auth token found');
        setMockData();
        return;
      }

      // Fetch faculty profile first
      try {
        const profileResponse = await fetch(API_BASE + '/faculty/simple/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          setFacultyProfile(profileData);
          console.log('Real faculty profile:', profileData);
        } else {
          console.error('Profile API failed:', profileResponse.status);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }

      // Fetch stats from simple endpoint
      try {
        const statsResponse = await fetch(API_BASE + '/faculty/simple/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData);
          console.log('Real stats data:', statsData);
        } else {
          console.error('Stats API failed:', statsResponse.status);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      }

      // Fetch tasks from simple endpoint
      try {
        const tasksResponse = await fetch(API_BASE + '/faculty/simple/tasks', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (tasksResponse.ok) {
          const tasksData = await tasksResponse.json();
          setTasks(tasksData);
          console.log('Real tasks data:', tasksData);
        } else {
          console.error('Tasks API failed:', tasksResponse.status);
        }
      } catch (error) {
        console.error('Error fetching tasks:', error);
      }

      // Fetch pending documents from simple endpoint
      try {
        const documentsResponse = await fetch(API_BASE + '/faculty/simple/documents/pending', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (documentsResponse.ok) {
          const documentsData = await documentsResponse.json();
          setDocuments(documentsData);
          console.log('Real documents data:', documentsData);
        } else {
          console.error('Documents API failed:', documentsResponse.status);
        }
      } catch (error) {
        console.error('Error fetching documents:', error);
      }

      // Fetch students from simple endpoint
      try {
        const studentsResponse = await fetch(API_BASE + '/faculty/simple/students', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (studentsResponse.ok) {
          const studentsData = await studentsResponse.json();
          setStudents(studentsData);
          console.log('Real students data:', studentsData);
        } else {
          console.error('Students API failed:', studentsResponse.status);
        }
      } catch (error) {
        console.error('Error fetching students:', error);
      }

      // For messages and notifications, we'll need to create these endpoints
      // For now, set mock data for these
      setMockMessages();
      setMockNotifications();

    } catch (error) {
      console.error('Error in fetchFacultyData:', error);
      setMockData();
    } finally {
      setLoading(false);
    }
  };

  const setMockData = () => {
    // Set default stats - will be overridden by real API data
    setStats({
      total_students: 0,
      active_classes: 0,
      pending_tasks: 0,
      unread_messages: 0,
      pending_documents: 0,
      today_classes: 0,
      weekly_hours: 0,
      avg_student_performance: 0
    });

    setMockStudents();
    setMockTasks();
    setMockClasses();
    setMockMessages();
    setMockNotifications();
  };

  const setMockStudents = () => {
    setStudents([
      {
        id: 1,
        enrollment_number: "2024CS001",
        first_name: "Rahul",
        last_name: "Kumar",
        email: "rahul.kumar@university.edu.in",
        phone: "+91 9876543210",
        department: "Computer Science",
        semester: 3,
        gpa: 8.5,
        attendance_percentage: 92.5,
        last_active: "2 hours ago",
        status: "active"
      }
    ]);
  };

  const setMockTasks = () => {
    setTasks([
      {
        id: 1,
        title: "Data Structures Assignment",
        description: "Implement binary search tree and traversals",
        type: "assignment",
        priority: "high",
        status: "published",
        due_date: "2026-03-20",
        max_score: 100,
        assigned_class: "CS301",
        submissions_count: 45,
        total_students: 60,
        created_at: "2026-03-10",
        updated_at: "2026-03-15"
      }
    ]);
  };

  const setMockClasses = () => {
    setClasses([
      {
        id: 1,
        name: "Data Structures and Algorithms",
        code: "CS301",
        department: "Computer Science",
        semester: 3,
        schedule: "Mon, Wed, Fri - 10:00 AM",
        room: "Room 301",
        students_count: 45,
        next_class: "2026-03-17 10:00 AM",
        status: "active",
        faculty_name: "Dr. Sarah Johnson",
        credits: 4,
        description: "Fundamental data structures and algorithmic analysis"
      }
    ]);
  };

  const setMockMessages = () => {
    setMessages([
      {
        id: 1,
        sender: "Rahul Kumar",
        sender_email: "rahul.kumar@university.edu.in",
        recipient: "Dr. Sarah Johnson",
        recipient_email: "sarah.johnson@university.edu.in",
        subject: "Question about Assignment 3",
        content: "Hi Professor Johnson, I have a question about the third assignment.",
        timestamp: "2026-03-16T09:30:00",
        is_read: false,
        is_starred: false,
        is_archived: false,
        type: "student",
        priority: "medium",
        has_attachment: false,
        reply_count: 0,
        status: "read"
      }
    ]);
  };

  const setMockNotifications = () => {
    setNotifications([
      {
        id: 1,
        title: "New message from Rahul Kumar",
        message: "Question about Assignment 3",
        type: "message",
        priority: "medium",
        timestamp: "2026-03-16T09:30:00",
        is_read: false,
        action_url: "/messages/1",
        icon: "message"
      }
    ]);
  };

  const handleCreateTask = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(API_BASE + '/faculty/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(taskForm)
      });

      if (response.ok) {
        setShowTaskModal(false);
        setTaskForm({
          title: '',
          description: '',
          type: 'assignment',
          priority: 'medium',
          due_date: '',
          max_score: 100,
          assigned_class: ''
        });
        fetchFacultyData();
      }
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleSendMessage = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(API_BASE + '/faculty/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(messageForm)
      });

      if (response.ok) {
        setShowMessageModal(false);
        setMessageForm({
          recipient: '',
          subject: '',
          content: '',
          type: 'student'
        });
        fetchFacultyData();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const renderSidebar = () => (
    <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-gray-900 text-white transition-all duration-300 ease-in-out hidden lg:block`}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className={`font-bold text-xl ${!sidebarOpen && 'hidden'}`}>Faculty Portal</h1>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded hover:bg-gray-800 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        <nav className="space-y-2">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: Home },
            { id: 'students', label: 'Students', icon: Users },
            { id: 'tasks', label: 'Tasks', icon: FileText },
            { id: 'classes', label: 'Classes', icon: GraduationCap },
            { id: 'messages', label: 'Messages', icon: MessageSquare },
            { id: 'documents', label: 'Documents', icon: FileCheck },
            { id: 'calendar', label: 'Calendar', icon: Calendar },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                activeSection === item.id ? 'bg-blue-600 text-white' : 'hover:bg-gray-800'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
        <button className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors text-red-400">
          <LogOut className="w-5 h-5" />
          {sidebarOpen && <span>Logout</span>}
        </button>
      </div>
    </div>
  );

  const renderHeader = () => {
  // Get faculty name and initials from real data or fallback
  const facultyName = facultyProfile ? 
    `${facultyProfile.first_name || ''} ${facultyProfile.last_name || ''}`.trim() : 
    'Faculty Member';
  const facultyDesignation = facultyProfile?.designation || 'Professor';
  const facultyDepartment = facultyProfile?.department?.name || facultyProfile?.department || 'Computer Science';
  const initials = facultyProfile ? 
    `${facultyProfile.first_name?.[0] || ''}${facultyProfile.last_name?.[0] || ''}`.toUpperCase() : 
    'FM';

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded hover:bg-gray-100"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search students, tasks, or messages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">{facultyName}</p>
            <p className="text-xs text-gray-500">{facultyDesignation}, {facultyDepartment}</p>
          </div>
          
          {/* Profile Image */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
            <span className="text-white font-bold text-sm">{initials}</span>
          </div>
          
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="p-2 rounded-full hover:bg-gray-100 relative"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {notifications.filter(n => !n.is_read).length > 0 && (
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>
            
            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-semibold">Notifications</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.slice(0, 5).map(notification => (
                    <div key={notification.id} className="p-4 border-b border-gray-100 hover:bg-gray-50">
                      <p className="font-medium text-sm">{notification.title}</p>
                      <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
                      <p className="text-xs text-gray-400 mt-2">{notification.timestamp}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

  const renderDashboard = () => (
    <div className="p-6">
      <div className="mb-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
          Faculty Dashboard
        </h2>
        <p className="text-gray-600">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Colorful Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Students</p>
              <p className="text-3xl font-bold mt-2">{stats.total_students}</p>
              <p className="text-blue-100 text-xs mt-1">Active learners</p>
            </div>
            <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
              <Users className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Active Classes</p>
              <p className="text-3xl font-bold mt-2">{stats.active_classes}</p>
              <p className="text-green-100 text-xs mt-1">This semester</p>
            </div>
            <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Pending Tasks</p>
              <p className="text-3xl font-bold mt-2">{stats.pending_tasks}</p>
              <p className="text-purple-100 text-xs mt-1">Need attention</p>
            </div>
            <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
              <Clock className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Unread Messages</p>
              <p className="text-3xl font-bold mt-2">{stats.unread_messages}</p>
              <p className="text-orange-100 text-xs mt-1">New messages</p>
            </div>
            <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
              <MessageSquare className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-pink-100 text-sm font-medium">Pending Docs</p>
              <p className="text-3xl font-bold mt-2">{stats.pending_documents}</p>
              <p className="text-pink-100 text-xs mt-1">To verify</p>
            </div>
            <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
              <FileCheck className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-100 text-sm font-medium">Today's Classes</p>
              <p className="text-3xl font-bold mt-2">{stats.today_classes}</p>
              <p className="text-indigo-100 text-xs mt-1">Scheduled</p>
            </div>
            <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
              <Calendar className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-teal-100 text-sm font-medium">Weekly Hours</p>
              <p className="text-3xl font-bold mt-2">{stats.weekly_hours}</p>
              <p className="text-teal-100 text-xs mt-1">Teaching time</p>
            </div>
            <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
              <Clock className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm font-medium">Avg Performance</p>
              <p className="text-3xl font-bold mt-2">{stats.avg_student_performance.toFixed(1)}%</p>
              <p className="text-yellow-100 text-xs mt-1">Student scores</p>
            </div>
            <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
            <h3 className="text-xl font-semibold text-white flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Recent Tasks
            </h3>
          </div>
          <div className="p-6">
            {tasks.slice(0, 3).map(task => (
              <div key={task.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div>
                  <p className="font-medium text-gray-900">{task.title}</p>
                  <p className="text-sm text-gray-600">Due: {task.due_date}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                    task.priority === 'high' ? 'bg-red-100 text-red-800' :
                    task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {task.priority}
                  </span>
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <Eye className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            ))}
            {tasks.length === 0 && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500">No tasks yet</p>
                <button
                  onClick={() => setShowTaskModal(true)}
                  className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
                >
                  Create your first task
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-teal-600 p-6">
            <h3 className="text-xl font-semibold text-white flex items-center">
              <Zap className="w-5 h-5 mr-2" />
              Quick Actions
            </h3>
          </div>
          <div className="p-6 grid grid-cols-2 gap-4">
            <button
              onClick={() => setShowTaskModal(true)}
              className="group flex items-center justify-center space-x-2 p-4 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 rounded-xl hover:from-blue-100 hover:to-blue-200 transition-all transform hover:scale-105"
            >
              <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
              <span className="font-medium">Create Task</span>
            </button>
            
            <button
              onClick={() => setShowMessageModal(true)}
              className="group flex items-center justify-center space-x-2 p-4 bg-gradient-to-r from-green-50 to-green-100 text-green-700 rounded-xl hover:from-green-100 hover:to-green-200 transition-all transform hover:scale-105"
            >
              <Send className="w-5 h-5" />
              <span className="font-medium">Send Message</span>
            </button>
            
            <button className="group flex items-center justify-center space-x-2 p-4 bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 rounded-xl hover:from-purple-100 hover:to-purple-200 transition-all transform hover:scale-105">
              <Calendar className="w-5 h-5" />
              <span className="font-medium">Schedule</span>
            </button>
            
            <button className="group flex items-center justify-center space-x-2 p-4 bg-gradient-to-r from-orange-50 to-orange-100 text-orange-700 rounded-xl hover:from-orange-100 hover:to-orange-200 transition-all transform hover:scale-105">
              <FileCheck className="w-5 h-5" />
              <span className="font-medium">Documents</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStudents = () => (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Students</h2>
          <p className="text-gray-600">Manage and monitor your students</p>
        </div>
        <button
          onClick={() => setShowStudentModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Student</span>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search students..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
              />
            </div>
            <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Filter className="w-4 h-4" />
              <span>Filter</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Enrollment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  GPA
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Attendance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {students.map(student => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {student.first_name[0]}{student.last_name[0]}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {student.first_name} {student.last_name}
                        </div>
                        <div className="text-sm text-gray-500">{student.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {student.enrollment_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {student.department}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{student.gpa}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-sm text-gray-900">{student.attendance_percentage}%</div>
                      <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${student.attendance_percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      student.status === 'active' ? 'bg-green-100 text-green-800' :
                      student.status === 'inactive' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {student.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900 mr-3">View</button>
                    <button className="text-indigo-600 hover:text-indigo-900 mr-3">Message</button>
                    <button className="text-gray-600 hover:text-gray-900">More</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return renderDashboard();
      case 'students':
        return renderStudents();
      case 'classes':
        return <ClassManagement />;
      case 'messages':
        return <FacultyCommunication />;
      case 'tasks':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Tasks Management</h2>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="space-y-4">
                <p className="text-gray-600">Comprehensive task management system coming soon...</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Create Assignments</h4>
                    <p className="text-sm text-gray-600">Design and publish assignments with deadlines</p>
                  </div>
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Track Submissions</h4>
                    <p className="text-sm text-gray-600">Monitor student submissions and progress</p>
                  </div>
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Grade & Feedback</h4>
                    <p className="text-sm text-gray-600">Provide grades and detailed feedback</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'documents':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Document Verification</h2>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="space-y-4">
                <p className="text-gray-600">Document verification system coming soon...</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Pending Verifications</h4>
                    <p className="text-sm text-gray-600">Review and verify student documents</p>
                  </div>
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Verified Documents</h4>
                    <p className="text-sm text-gray-600">View all verified student documents</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'calendar':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Calendar & Schedule</h2>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="space-y-4">
                <p className="text-gray-600">Calendar and schedule management coming soon...</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Class Schedule</h4>
                    <p className="text-sm text-gray-600">View and manage your class schedule</p>
                  </div>
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Office Hours</h4>
                    <p className="text-sm text-gray-600">Set and manage office hours</p>
                  </div>
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Events</h4>
                    <p className="text-sm text-gray-600">Academic events and deadlines</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'analytics':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Analytics & Reports</h2>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="space-y-4">
                <p className="text-gray-600">Analytics and reporting system coming soon...</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Student Performance</h4>
                    <p className="text-sm text-gray-600">Track and analyze student performance metrics</p>
                  </div>
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Class Analytics</h4>
                    <p className="text-sm text-gray-600">Comprehensive class performance analytics</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'settings':
        return <FacultyProfile facultyData={facultyProfile} />;
      default:
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}</h2>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600">This section is under development...</p>
            </div>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {renderSidebar()}
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {renderHeader()}
        
        <main className="flex-1 overflow-y-auto">
          {renderContent()}
        </main>
      </div>

      {/* Task Creation Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Create New Task</h3>
              <button
                onClick={() => setShowTaskModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Task Title</label>
                <input
                  type="text"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({...taskForm, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter task title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({...taskForm, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="Enter task description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Task Type</label>
                  <select
                    value={taskForm.type}
                    onChange={(e) => setTaskForm({...taskForm, type: e.target.value as any})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="assignment">Assignment</option>
                    <option value="quiz">Quiz</option>
                    <option value="project">Project</option>
                    <option value="exam">Exam</option>
                    <option value="lab">Lab Work</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({...taskForm, priority: e.target.value as any})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                  <input
                    type="date"
                    value={taskForm.due_date}
                    onChange={(e) => setTaskForm({...taskForm, due_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Score</label>
                  <input
                    type="number"
                    value={taskForm.max_score}
                    onChange={(e) => setTaskForm({...taskForm, max_score: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowTaskModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTask}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Message Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Send Message</h3>
              <button
                onClick={() => setShowMessageModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Recipient</label>
                <select
                  value={messageForm.recipient}
                  onChange={(e) => setMessageForm({...messageForm, recipient: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select recipient</option>
                  <option value="registrar">Registrar Office</option>
                  <option value="all_students">All Students</option>
                  {students.map(student => (
                    <option key={student.id} value={student.email}>
                      {student.first_name} {student.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <input
                  type="text"
                  value={messageForm.subject}
                  onChange={(e) => setMessageForm({...messageForm, subject: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter subject"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                <textarea
                  value={messageForm.content}
                  onChange={(e) => setMessageForm({...messageForm, content: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={6}
                  placeholder="Enter your message"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowMessageModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendMessage}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Send Message
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyDashboard;
