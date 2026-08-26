import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { facultyService } from '../services/api';
import { FacultyPersonalTasks } from '../components/faculty/FacultyPersonalTasks';
import { 
  Users, 
  BarChart3, 
  ListTodo, 
  Calendar,
  BookOpen,
  Settings,
  Search,
  Menu,
  X as CloseIcon,
  LogOut,
  UserCheck,
  Clock,
  TrendingUp,
  Target,
  GraduationCap,
  Building,
  Mail,
  Phone,
  MapPin,
  Star,
  ChevronRight,
  FileText,
  Award,
  MessageSquare,
  Briefcase,
  ThumbsUp,
  AlertCircle,
  CheckCircle,
  Plus,
  Filter,
  Download,
  Upload,
  Bell
} from 'lucide-react';

type FacultyView = 'dashboard' | 'students' | 'assignments' | 'courses' | 'analytics' | 'tasks' | 'office-hours' | 'research' | 'publications' | 'schedule';

interface FacultyProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  specialization: string[];
  experience: number;
  rating: number;
  totalStudents: number;
  coursesTeaching: number;
  publications: number;
  office: string;
  consultationHours: string;
}

interface Course {
  id: string;
  code: string;
  name: string;
  semester: string;
  credits: number;
  enrolledStudents: number;
  schedule: string;
  room: string;
  status: 'active' | 'completed' | 'upcoming';
  progress: number;
  nextClass: Date;
}

interface Assignment {
  id: string;
  courseId: string;
  courseName: string;
  title: string;
  description: string;
  dueDate: Date;
  totalPoints: number;
  submissions: number;
  graded: number;
  status: 'draft' | 'published' | 'closed';
}

interface StudentProgress {
  id: string;
  name: string;
  enrollmentNumber: string;
  course: string;
  attendance: number;
  assignmentsSubmitted: number;
  assignmentsTotal: number;
  averageGrade: number;
  lastActivity: Date;
}

interface QuickStats {
  totalStudents: number;
  activeCourses: number;
  pendingGrading: number;
  todayClasses: number;
  officeHoursToday: number;
  averageRating: number;
  researchProjects: number;
  totalPublications: number;
}

export const FacultyDashboard: React.FC = () => {
  const { state, logout } = useApp();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { currentUser } = state;
  const [activeView, setActiveView] = useState<FacultyView>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(true);

  // Real faculty data state
  const [facultyProfile, setFacultyProfile] = useState<any>(null);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [studentProgress, setStudentProgress] = useState<StudentProgress[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  // Fetch faculty data on component mount
  useEffect(() => {
    const fetchFacultyData = async () => {
      try {
        setLoading(true);
        
        // Fetch faculty profile
        const profileData = await facultyService.getProfile() as any;
        setFacultyProfile(profileData);
        
        // Fetch dashboard stats
        const statsData = await facultyService.getDashboardStats() as any;
        setDashboardStats(statsData);
        
        // Mock data for demonstration
        setStudentProgress([
          {
            id: '1',
            name: 'John Smith',
            enrollmentNumber: 'CS2024001',
            course: 'Data Structures & Algorithms',
            attendance: 85,
            assignmentsSubmitted: 4,
            assignmentsTotal: 5,
            averageGrade: 88,
            lastActivity: new Date()
          },
          {
            id: '2',
            name: 'Sarah Johnson',
            enrollmentNumber: 'CS2024002',
            course: 'Machine Learning',
            attendance: 92,
            assignmentsSubmitted: 3,
            assignmentsTotal: 4,
            averageGrade: 91,
            lastActivity: new Date()
          }
        ]);

        setAssignments([
          {
            id: '1',
            courseId: 'CS301',
            courseName: 'Data Structures & Algorithms',
            title: 'Binary Search Tree Implementation',
            description: 'Implement a BST with insert, delete, and search operations',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            totalPoints: 100,
            submissions: 38,
            graded: 25,
            status: 'published'
          },
          {
            id: '2',
            courseId: 'CS401',
            courseName: 'Machine Learning',
            title: 'Neural Network Project',
            description: 'Build a neural network for image classification',
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            totalPoints: 150,
            submissions: 28,
            graded: 10,
            status: 'published'
          }
        ]);

        setCourses([
          {
            id: 'CS301',
            code: 'CS301',
            name: 'Data Structures & Algorithms',
            semester: 'Fall 2024',
            credits: 4,
            enrolledStudents: 45,
            schedule: 'Mon, Wed, Fri - 10:00 AM',
            room: 'CS-201',
            status: 'active',
            progress: 65,
            nextClass: new Date(Date.now() + 2 * 60 * 60 * 1000)
          },
          {
            id: 'CS401',
            code: 'CS401',
            name: 'Machine Learning',
            semester: 'Fall 2024',
            credits: 3,
            enrolledStudents: 38,
            schedule: 'Tue, Thu - 2:00 PM',
            room: 'CS-301',
            status: 'active',
            progress: 72,
            nextClass: new Date(Date.now() + 24 * 60 * 60 * 1000)
          }
        ]);
        
      } catch (error: any) {
        console.error('Error fetching faculty data:', error);
        
        // Handle case where faculty profile doesn't exist
        if (error?.message?.includes('Faculty profile not found') || error?.detail === 'Faculty profile not found') {
          console.log('Faculty profile not found, using fallback data');
          setFacultyProfile({
            id: 'FAC001',
            first_name: 'Faculty',
            last_name: 'User',
            email: currentUser?.email || 'faculty@university.edu.in',
            phone: 'Not provided',
            designation: 'Faculty Member',
            specialization: 'General',
            office: 'Not assigned',
            can_assign_tasks: false
          });
          setDashboardStats({
            total_students: 0,
            total_tasks: 0,
            pending_grades: 0,
            verified_students: 0,
            can_assign_tasks: false
          });
        }
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchFacultyData();
    }
  }, [currentUser]);

  // Transform faculty profile data for display
  const transformedProfile: FacultyProfile = facultyProfile ? {
    id: facultyProfile.id?.toString() || '',
    name: `${facultyProfile.first_name} ${facultyProfile.last_name}` || 'Faculty Name',
    email: facultyProfile.user?.email || facultyProfile.email || '',
    phone: facultyProfile.phone || 'Not provided',
    department: facultyProfile.department?.name || 'Not assigned',
    designation: facultyProfile.designation || 'Faculty',
    specialization: facultyProfile.specialization ? [facultyProfile.specialization] : [],
    experience: 0,
    rating: 4.5,
    totalStudents: dashboardStats?.total_students || 0,
    coursesTeaching: courses.length,
    publications: 0,
    office: facultyProfile.office || 'Not assigned',
    consultationHours: 'Mon-Fri: 10:00 AM - 12:00 PM'
  } : {
    id: 'FAC001',
    name: 'Loading...',
    email: '',
    phone: '',
    department: '',
    designation: '',
    specialization: [],
    experience: 0,
    rating: 0,
    totalStudents: 0,
    coursesTeaching: 0,
    publications: 0,
    office: '',
    consultationHours: ''
  };

  // Transform dashboard stats for display
  const transformedStats: QuickStats = dashboardStats ? {
    totalStudents: dashboardStats.total_students || 0,
    activeCourses: courses.length,
    pendingGrading: dashboardStats.pending_grades || 0,
    todayClasses: courses.filter(c => c.status === 'active').length,
    officeHoursToday: 2,
    averageRating: 4.5,
    researchProjects: dashboardStats.total_tasks || 0,
    totalPublications: 0
  } : {
    totalStudents: 0,
    activeCourses: 0,
    pendingGrading: 0,
    todayClasses: 0,
    officeHoursToday: 0,
    averageRating: 0,
    researchProjects: 0,
    totalPublications: 0
  };

  // Navigation Items - Faculty specific, no document approvals
  const navigationItems = [
    { id: 'dashboard' as FacultyView, label: 'Dashboard', icon: BarChart3 },
    { id: 'students' as FacultyView, label: 'Student Progress', icon: Users },
    { id: 'assignments' as FacultyView, label: 'Assignments', icon: FileText },
    { id: 'courses' as FacultyView, label: 'Course Management', icon: BookOpen },
    { id: 'analytics' as FacultyView, label: 'Teaching Analytics', icon: TrendingUp },
    { id: 'tasks' as FacultyView, label: 'My Tasks', icon: ListTodo },
    { id: 'office-hours' as FacultyView, label: 'Office Hours', icon: Clock },
    { id: 'research' as FacultyView, label: 'Research', icon: Target },
    { id: 'publications' as FacultyView, label: 'Publications', icon: Award },
    { id: 'schedule' as FacultyView, label: 'Schedule', icon: Calendar },
  ];

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <div className="space-y-8">
            {/* Faculty Profile Header */}
            <div className={`${theme === 'dark' ? 'bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800' : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'} rounded-2xl p-6 lg:p-8 border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} shadow-xl relative overflow-hidden`}>
              <div className="absolute inset-0 opacity-5">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full blur-2xl"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-br from-green-500 to-teal-500 rounded-full blur-2xl"></div>
              </div>
              
              <div className="relative z-10">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  <div className="flex items-center gap-6">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                      <UserCheck className="w-12 h-12 text-white" />
                    </div>
                    <div>
                      <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-black'} mb-2`}>
                        {loading ? 'Loading...' : transformedProfile.name}
                      </h1>
                      <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} text-lg mb-1`}>
                        {transformedProfile.designation}
                      </p>
                      <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} flex items-center gap-2`}>
                        <Building className="w-4 h-4" />
                        {transformedProfile.department}
                      </p>
                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                          <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                            {transformedProfile.rating}
                          </span>
                        </div>
                        <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          {transformedProfile.experience} years experience
                        </div>
                        <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          {transformedProfile.publications} publications
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <div className={`flex items-center gap-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      <Mail className="w-4 h-4" />
                      <span className="text-sm">{transformedProfile.email}</span>
                    </div>
                    <div className={`flex items-center gap-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      <Phone className="w-4 h-4" />
                      <span className="text-sm">{transformedProfile.phone}</span>
                    </div>
                    <div className={`flex items-center gap-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">{transformedProfile.office}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-4">
                  {transformedProfile.specialization.map((spec: string, index: number) => (
                    <span 
                      key={index}
                      className={`px-3 py-1 ${theme === 'dark' ? 'bg-blue-900/20 text-blue-400 border-blue-800/30' : 'bg-blue-100 text-blue-700 border-blue-200'} rounded-full text-xs border`}
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { 
                  icon: Users, 
                  value: transformedStats.totalStudents, 
                  label: 'Total Students', 
                  change: '+12 this semester', 
                  color: 'from-blue-500 to-blue-600' 
                },
                { 
                  icon: BookOpen, 
                  value: transformedStats.activeCourses, 
                  label: 'Active Courses', 
                  change: 'All current semester', 
                  color: 'from-green-500 to-green-600' 
                },
                { 
                  icon: FileText, 
                  value: transformedStats.pendingGrading, 
                  label: 'Pending Grading', 
                  change: '3 urgent', 
                  color: 'from-orange-500 to-orange-600' 
                },
                { 
                  icon: Calendar, 
                  value: transformedStats.todayClasses, 
                  label: "Today's Classes", 
                  change: 'Next in 1 hour', 
                  color: 'from-purple-500 to-purple-600' 
                }
              ].map((stat, index) => (
                <div key={index} className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${stat.color} p-6 shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-xl hover:-translate-y-1`}>
                  <div className="absolute inset-0 bg-white/10 transform rotate-45 scale-150 group-hover:rotate-12 transition-transform duration-500"></div>
                  <div className="relative z-10">
                    <stat.icon className="w-8 h-8 text-white mb-4 transform transition-transform duration-300 group-hover:scale-110" />
                    <div className="text-2xl font-bold text-white mb-2">{stat.value}</div>
                    <div className="text-white/90 font-medium text-sm">{stat.label}</div>
                    <div className="text-white/75 text-xs mt-1">{stat.change}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Today's Schedule */}
            <div className={`${theme === 'dark' ? 'bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800' : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'} rounded-2xl p-6 lg:p-8 border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} shadow-xl`}>
              <div className="flex justify-between items-center mb-6">
                <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Today's Schedule</h2>
                <button 
                  onClick={() => setActiveView('schedule')}
                  className={`px-4 py-2 ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded-lg transition-colors flex items-center gap-2`}
                >
                  <Calendar className="w-4 h-4" />
                  View Full Schedule
                </button>
              </div>
              
              <div className="space-y-4">
                {courses
                  .filter(course => course.status === 'active')
                  .slice(0, 3)
                  .map((course) => (
                    <div key={course.id} className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'} border hover:shadow-lg transition-all duration-300`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                              {course.code}: {course.name}
                            </h3>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              course.progress > 70 ? 'bg-green-100 text-green-700' :
                              course.progress > 40 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {course.progress}% Complete
                            </span>
                          </div>
                          <div className={`flex items-center gap-4 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {course.schedule}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {course.room}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {course.enrolledStudents} students
                            </span>
                          </div>
                        </div>
                        <button className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors`}>
                          <ChevronRight className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Pending Grading */}
            <div className={`${theme === 'dark' ? 'bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800' : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'} rounded-2xl p-6 lg:p-8 border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} shadow-xl`}>
              <div className="flex justify-between items-center mb-6">
                <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Pending Grading</h2>
                <button 
                  onClick={() => setActiveView('assignments')}
                  className={`px-4 py-2 ${theme === 'dark' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-orange-500 hover:bg-orange-600'} text-white rounded-lg transition-colors flex items-center gap-2`}
                >
                  <FileText className="w-4 h-4" />
                  View All Assignments
                </button>
              </div>
              
              <div className="space-y-4">
                {assignments.slice(0, 3).map((assignment) => (
                  <div key={assignment.id} className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'} border hover:shadow-lg transition-all duration-300`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                            {assignment.title}
                          </h3>
                          <span className={`px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-700`}>
                            {assignment.submissions - assignment.graded} pending
                          </span>
                        </div>
                        <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          {assignment.courseName} • Due {assignment.dueDate.toLocaleDateString()}
                        </div>
                        <div className="mt-2">
                          <div className="flex justify-between text-xs mb-1">
                            <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Grading Progress</span>
                            <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                              {assignment.graded}/{assignment.submissions}
                            </span>
                          </div>
                          <div className={`w-full h-2 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded-full overflow-hidden`}>
                            <div 
                              className="h-full bg-orange-500 rounded-full transition-all duration-300"
                              style={{ width: `${(assignment.graded / assignment.submissions) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <button className={`px-3 py-2 text-sm rounded-lg ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white transition-colors`}>
                        Start Grading
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'students':
        return (
          <div className="space-y-6">
            <div className={`${theme === 'dark' ? 'bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800' : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'} rounded-2xl p-6 lg:p-8 border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} shadow-xl`}>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-black'} mb-2`}>Student Progress</h2>
                  <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Monitor your students' academic performance
                  </p>
                </div>
                <div className="flex gap-2">
                  <div className={`relative`}>
                    <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                    <input
                      type="text"
                      placeholder="Search students..."
                      className={`pl-10 pr-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-black'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                  </div>
                  <button className={`px-4 py-2 ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} rounded-lg transition-colors flex items-center gap-2`}>
                    <Filter className="w-4 h-4" />
                    Filter
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={`${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} border-b`}>
                      <th className={`text-left py-3 px-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} font-medium`}>Student</th>
                      <th className={`text-left py-3 px-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} font-medium`}>Enrollment</th>
                      <th className={`text-left py-3 px-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} font-medium`}>Course</th>
                      <th className={`text-left py-3 px-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} font-medium`}>Attendance</th>
                      <th className={`text-left py-3 px-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} font-medium`}>Assignments</th>
                      <th className={`text-left py-3 px-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} font-medium`}>Avg Grade</th>
                      <th className={`text-left py-3 px-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} font-medium`}>Last Activity</th>
                      <th className={`text-left py-3 px-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} font-medium`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentProgress.map((student) => (
                      <tr key={student.id} className={`${theme === 'dark' ? 'border-gray-700 hover:bg-gray-800/50' : 'border-gray-200 hover:bg-gray-50'} border-b transition-colors`}>
                        <td className={`py-4 px-4 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center`}>
                              <UserCheck className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <div className="font-medium">{student.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className={`py-4 px-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{student.enrollmentNumber}</td>
                        <td className={`py-4 px-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{student.course}</td>
                        <td className={`py-4 px-4`}>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            student.attendance >= 75 ? 'bg-green-100 text-green-700' :
                            student.attendance >= 60 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {student.attendance}%
                          </span>
                        </td>
                        <td className={`py-4 px-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          {student.assignmentsSubmitted}/{student.assignmentsTotal}
                        </td>
                        <td className={`py-4 px-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          <span className={`font-medium ${student.averageGrade >= 80 ? 'text-green-600' : student.averageGrade >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {student.averageGrade}%
                          </span>
                        </td>
                        <td className={`py-4 px-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          {student.lastActivity.toLocaleDateString()}
                        </td>
                        <td className={`py-4 px-4`}>
                          <button className={`px-3 py-1 text-sm rounded-lg ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white transition-colors`}>
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'assignments':
        return (
          <div className="space-y-6">
            <div className={`${theme === 'dark' ? 'bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800' : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'} rounded-2xl p-6 lg:p-8 border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} shadow-xl`}>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-black'} mb-2`}>Assignments</h2>
                  <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Create, manage, and grade student assignments
                  </p>
                </div>
                <button className={`px-4 py-2 ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded-lg transition-colors flex items-center gap-2`}>
                  <Plus className="w-4 h-4" />
                  Create Assignment
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {assignments.map((assignment) => (
                  <div key={assignment.id} className={`p-6 rounded-xl ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'} border hover:shadow-lg transition-all duration-300`}>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-black'} mb-1`}>
                          {assignment.title}
                        </h3>
                        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          {assignment.courseName}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        assignment.status === 'published' ? 'bg-green-100 text-green-700' :
                        assignment.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {assignment.status}
                      </span>
                    </div>
                    
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-4 line-clamp-2`}>
                      {assignment.description}
                    </p>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Due Date</span>
                        <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          {assignment.dueDate.toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Total Points</span>
                        <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          {assignment.totalPoints}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Submissions</span>
                        <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          {assignment.submissions}
                        </span>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex justify-between text-xs mb-1">
                        <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Grading Progress</span>
                        <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          {assignment.graded}/{assignment.submissions}
                        </span>
                      </div>
                      <div className={`w-full h-2 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded-full overflow-hidden`}>
                        <div 
                          className="h-full bg-blue-500 rounded-full transition-all duration-300"
                          style={{ width: `${(assignment.graded / assignment.submissions) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button className={`flex-1 px-3 py-2 text-sm rounded-lg ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white transition-colors`}>
                        Grade Submissions
                      </button>
                      <button className={`px-3 py-2 text-sm rounded-lg ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} transition-colors`}>
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'courses':
        return (
          <div className="space-y-6">
            <div className={`${theme === 'dark' ? 'bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800' : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'} rounded-2xl p-6 lg:p-8 border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} shadow-xl`}>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-black'} mb-2`}>Course Management</h2>
                  <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Manage your courses, content, and materials
                  </p>
                </div>
                <button className={`px-4 py-2 ${theme === 'dark' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-purple-500 hover:bg-purple-600'} text-white rounded-lg transition-colors flex items-center gap-2`}>
                  <Plus className="w-4 h-4" />
                  Add Course
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {courses.map((course) => (
                  <div key={course.id} className={`p-6 rounded-xl ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'} border hover:shadow-lg transition-all duration-300`}>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-black'} mb-1`}>
                          {course.code}
                        </h3>
                        <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          {course.name}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        course.status === 'active' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {course.status}
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Progress</span>
                        <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{course.progress}%</span>
                      </div>
                      <div className={`w-full h-2 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded-full overflow-hidden`}>
                        <div 
                          className={`h-full ${
                            course.progress > 70 ? 'bg-green-500' :
                            course.progress > 40 ? 'bg-yellow-500' :
                            'bg-red-500'
                          } rounded-full transition-all duration-300`}
                          style={{ width: `${course.progress}%` }}
                        />
                      </div>
                      <div className={`flex justify-between text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        <span>{course.enrolledStudents} students</span>
                        <span>{course.credits} credits</span>
                      </div>
                      <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {course.schedule}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <MapPin className="w-4 h-4" />
                          {course.room}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <button className={`flex-1 px-3 py-2 text-sm rounded-lg ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white transition-colors`}>
                        Manage Content
                      </button>
                      <button className={`px-3 py-2 text-sm rounded-lg ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} transition-colors`}>
                        View Students
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'analytics':
        return (
          <div className="space-y-6">
            <div className={`${theme === 'dark' ? 'bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800' : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'} rounded-2xl p-6 lg:p-8 border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} shadow-xl`}>
              <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-black'} mb-2`}>Teaching Analytics</h2>
              <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Comprehensive insights on your teaching performance
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
                {[
                  { label: 'Student Satisfaction', value: '4.5/5', change: '+0.3 this semester', color: 'from-green-500 to-emerald-600' },
                  { label: 'Average Grade', value: '78%', change: '+5% improvement', color: 'from-blue-500 to-indigo-600' },
                  { label: 'Assignment Completion', value: '92%', change: '+8% improvement', color: 'from-purple-500 to-pink-600' },
                  { label: 'Office Hour Attendance', value: '65%', change: '+12% increase', color: 'from-orange-500 to-red-600' }
                ].map((stat, index) => (
                  <div key={index} className={`p-6 rounded-xl bg-gradient-to-br ${stat.color} text-white`}>
                    <div className="text-3xl font-bold mb-2">{stat.value}</div>
                    <div className="text-sm opacity-90 mb-1">{stat.label}</div>
                    <div className="text-xs opacity-75">{stat.change}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'tasks':
        return (
          <div className="space-y-6">
            <div className={`${theme === 'dark' ? 'bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800' : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'} rounded-2xl p-6 lg:p-8 border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} shadow-xl`}>
              <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-black'} mb-2`}>My Tasks</h2>
              <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Manage your teaching, research, and administrative tasks
              </p>
              <div className="mt-6">
                <FacultyPersonalTasks theme={theme} />
              </div>
            </div>
          </div>
        );

      case 'office-hours':
        return (
          <div className="space-y-6">
            <div className={`${theme === 'dark' ? 'bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800' : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'} rounded-2xl p-6 lg:p-8 border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} shadow-xl`}>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-black'} mb-2`}>Office Hours</h2>
                  <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Manage your consultation hours and student appointments
                  </p>
                </div>
                <button className={`px-4 py-2 ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded-lg transition-colors flex items-center gap-2`}>
                  <Plus className="w-4 h-4" />
                  Set Office Hours
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { day: 'Monday', time: '10:00 AM - 12:00 PM', location: 'Office 301', available: true },
                  { day: 'Wednesday', time: '2:00 PM - 4:00 PM', location: 'Office 301', available: true },
                  { day: 'Friday', time: '11:00 AM - 1:00 PM', location: 'Office 301', available: false }
                ].map((slot, index) => (
                  <div key={index} className={`p-6 rounded-xl ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'} border`}>
                    <div className="flex justify-between items-start mb-4">
                      <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>{slot.day}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${slot.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {slot.available ? 'Available' : 'Booked'}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className={`flex items-center gap-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        <Clock className="w-4 h-4" />
                        {slot.time}
                      </div>
                      <div className={`flex items-center gap-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        <MapPin className="w-4 h-4" />
                        {slot.location}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'research':
        return (
          <div className="space-y-6">
            <div className={`${theme === 'dark' ? 'bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800' : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'} rounded-2xl p-6 lg:p-8 border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} shadow-xl`}>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-black'} mb-2`}>Research Projects</h2>
                  <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Manage your research projects and collaborations
                  </p>
                </div>
                <button className={`px-4 py-2 ${theme === 'dark' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-indigo-500 hover:bg-indigo-600'} text-white rounded-lg transition-colors flex items-center gap-2`}>
                  <Plus className="w-4 h-4" />
                  New Project
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { title: 'AI in Education', status: 'Ongoing', progress: 65, funding: '$50,000' },
                  { title: 'Machine Learning Optimization', status: 'Planning', progress: 20, funding: '$75,000' }
                ].map((project, index) => (
                  <div key={index} className={`p-6 rounded-xl ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'} border`}>
                    <div className="flex justify-between items-start mb-4">
                      <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>{project.title}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        project.status === 'Ongoing' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {project.status}
                      </span>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Progress</span>
                          <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{project.progress}%</span>
                        </div>
                        <div className={`w-full h-2 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded-full overflow-hidden`}>
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${project.progress}%` }} />
                        </div>
                      </div>
                      <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        Funding: {project.funding}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'publications':
        return (
          <div className="space-y-6">
            <div className={`${theme === 'dark' ? 'bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800' : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'} rounded-2xl p-6 lg:p-8 border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} shadow-xl`}>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-black'} mb-2`}>Publications</h2>
                  <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Track your research publications and citations
                  </p>
                </div>
                <button className={`px-4 py-2 ${theme === 'dark' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-emerald-500 hover:bg-emerald-600'} text-white rounded-lg transition-colors flex items-center gap-2`}>
                  <Plus className="w-4 h-4" />
                  Add Publication
                </button>
              </div>
              
              <div className="space-y-4">
                {[
                  { title: 'Deep Learning in Education', journal: 'IEEE Transactions on Education', year: 2024, citations: 15 },
                  { title: 'Optimizing Neural Networks', journal: 'Journal of Machine Learning', year: 2023, citations: 28 }
                ].map((pub, index) => (
                  <div key={index} className={`p-6 rounded-xl ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'} border`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-black'} mb-2`}>{pub.title}</h3>
                        <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          <p>{pub.journal}</p>
                          <p className="mt-1">{pub.year} • {pub.citations} citations</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className={`px-3 py-2 text-sm rounded-lg ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} transition-colors`}>
                          <Download className="w-4 h-4" />
                        </button>
                        <button className={`px-3 py-2 text-sm rounded-lg ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white transition-colors`}>
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'schedule':
        return (
          <div className="space-y-6">
            <div className={`${theme === 'dark' ? 'bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800' : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'} rounded-2xl p-6 lg:p-8 border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} shadow-xl`}>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-black'} mb-2`}>Teaching Schedule</h2>
                  <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    View and manage your teaching schedule
                  </p>
                </div>
                <button className={`px-4 py-2 ${theme === 'dark' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-purple-500 hover:bg-purple-600'} text-white rounded-lg transition-colors flex items-center gap-2`}>
                  <Calendar className="w-4 h-4" />
                  Sync with Calendar
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {courses.map((course) => (
                  <div key={course.id} className={`p-6 rounded-xl ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'} border`}>
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center`}>
                        <BookOpen className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>{course.code}</h3>
                        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{course.name}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className={`flex items-center gap-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        <Clock className="w-4 h-4" />
                        {course.schedule}
                      </div>
                      <div className={`flex items-center gap-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        <MapPin className="w-4 h-4" />
                        {course.room}
                      </div>
                      <div className={`flex items-center gap-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        <Users className="w-4 h-4" />
                        {course.enrolledStudents} students enrolled
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`min-h-screen w-full relative overflow-hidden ${theme === 'dark' ? 'bg-black' : 'bg-white'} flex`}>
      {/* Background Effects */}
      <div className="fixed inset-0 z-0">
        <div className={`absolute inset-0 ${theme === 'dark' 
          ? 'bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900' 
          : 'bg-gradient-to-br from-blue-50 via-indigo-50/50 to-purple-50'}`}>
        </div>
        
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-20 left-1/2 w-80 h-80 bg-teal-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Sidebar Navigation */}
      <div className={`relative z-10 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 w-64 ${theme === 'dark' ? 'bg-gray-900/90 backdrop-blur-xl' : 'bg-white/90 backdrop-blur-xl'} border-r ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'} transition-all duration-300 ease-in-out`}>
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Faculty Portal</h1>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Academic Excellence</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveView(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    activeView === item.id
                      ? `bg-gradient-to-r ${
                          theme === 'dark' 
                            ? 'from-blue-600/20 to-purple-600/20 text-blue-400 border-l-4 border-blue-500' 
                            : 'from-blue-50 to-purple-50 text-blue-600 border-l-4 border-blue-500'
                        }`
                      : `${theme === 'dark' 
                        ? 'text-gray-400 hover:bg-gray-800 hover:text-white' 
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-800">
            <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-black'} truncate`}>
                    {transformedProfile.name}
                  </p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} truncate`}>
                    {transformedProfile.designation}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => logout()}
                className={`w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  theme === 'dark' 
                    ? 'text-red-400 hover:bg-red-900/20' 
                    : 'text-red-600 hover:bg-red-50'
                }`}
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative z-10 flex flex-col">
        {/* Top Navigation */}
        <header className={`sticky top-0 z-20 ${theme === 'dark' ? 'bg-gray-900/90 backdrop-blur-xl border-gray-800' : 'bg-white/90 backdrop-blur-xl border-gray-200'} border-b`}>
          <div className="flex items-center justify-between px-6 py-4">
            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`lg:hidden p-2 rounded-lg transition-colors ${
                theme === 'dark' 
                  ? 'text-gray-400 hover:bg-gray-800 hover:text-white' 
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {mobileMenuOpen ? <CloseIcon className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Search Bar */}
            <div className="hidden md:flex flex-1 max-w-lg mx-8">
              <div className={`relative w-full`}>
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                <input
                  type="text"
                  placeholder={`Search ${activeView}...`}
                  className={`w-full pl-10 pr-4 py-2 rounded-xl border ${
                    theme === 'dark' 
                      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500' 
                      : 'bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all`}
                />
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`relative p-2 rounded-lg transition-colors ${
                  theme === 'dark' 
                    ? 'text-gray-400 hover:bg-gray-800 hover:text-white' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Bell className="w-5 h-5" />
                {transformedStats.pendingGrading > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>

              {/* User Profile */}
              <div className={`hidden sm:flex items-center space-x-3 px-3 py-2 rounded-xl ${
                theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
              }`}>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <UserCheck className="w-4 h-4 text-white" />
                </div>
                <div className="hidden md:block">
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                    {transformedProfile.name}
                  </p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {transformedProfile.designation}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 lg:p-8">
            {renderContent()}
          </div>
        </main>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-10 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        ></div>
      )}
    </div>
  );
};