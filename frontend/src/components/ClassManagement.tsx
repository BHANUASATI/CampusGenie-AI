import React, { useState, useEffect } from 'react';
import { 

const API_BASE_URL = process.env.REACT_APP_API_URL || API_BASE_URL + '';
  Users, 
  Calendar, 
  Clock, 
  MapPin, 
  BookOpen, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Award,
  Target,
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
  Upload,
  Search,
  Filter,
  RefreshCw,
  UserPlus,
  UserMinus,
  CheckSquare,
  XSquare,
  GraduationCap,
  ClipboardList,
  Video,
  Phone,
  Mail,
  MessageSquare
} from 'lucide-react';

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
  faculty_name: string;
  credits: number;
  description: string;
}

interface AttendanceRecord {
  id: number;
  student_id: number;
  student_name: string;
  enrollment_number: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  check_in_time?: string;
  notes?: string;
}

interface GradeEntry {
  id: number;
  student_id: number;
  student_name: string;
  enrollment_number: string;
  assignment_score: number;
  quiz_score: number;
  midterm_score: number;
  final_score: number;
  total_score: number;
  grade: string;
  gpa: number;
  attendance_percentage: number;
}

const ClassManagement: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [gradeEntries, setGradeEntries] = useState<GradeEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'grades' | 'schedule'>('overview');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchClassData();
  }, []);

  const fetchClassData = async () => {
    try {
      const token = localStorage.getItem('authToken');
      
      // Fetch classes
      const classesResponse = await fetch(API_BASE_URL + '/faculty/classes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (classesResponse.ok) {
        const classesData = await classesResponse.json();
        setClasses(classesData);
      }

      // Mock data for demo
      setMockData();
    } catch (error) {
      console.error('Error fetching class data:', error);
      setMockData();
    } finally {
      setLoading(false);
    }
  };

  const setMockData = () => {
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
      },
      {
        id: 2,
        name: "Database Management Systems",
        code: "CS302",
        department: "Computer Science",
        semester: 3,
        schedule: "Tue, Thu - 2:00 PM",
        room: "Room 205",
        students_count: 42,
        next_class: "2026-03-18 2:00 PM",
        status: "active",
        faculty_name: "Dr. Sarah Johnson",
        credits: 3,
        description: "Database design, implementation, and management"
      },
      {
        id: 3,
        name: "Web Development",
        code: "CS303",
        department: "Computer Science",
        semester: 5,
        schedule: "Mon, Wed - 3:00 PM",
        room: "Lab 401",
        students_count: 38,
        next_class: "2026-03-17 3:00 PM",
        status: "active",
        faculty_name: "Dr. Sarah Johnson",
        credits: 3,
        description: "Modern web development technologies and frameworks"
      }
    ]);

    setAttendanceRecords([
      {
        id: 1,
        student_id: 1,
        student_name: "Rahul Kumar",
        enrollment_number: "2024CS001",
        date: "2026-03-16",
        status: "present",
        check_in_time: "09:55 AM"
      },
      {
        id: 2,
        student_id: 2,
        student_name: "Priya Sharma",
        enrollment_number: "2024CS002",
        date: "2026-03-16",
        status: "late",
        check_in_time: "10:10 AM"
      },
      // Add more attendance records...
    ]);

    setGradeEntries([
      {
        id: 1,
        student_id: 1,
        student_name: "Rahul Kumar",
        enrollment_number: "2024CS001",
        assignment_score: 85,
        quiz_score: 90,
        midterm_score: 78,
        final_score: 82,
        total_score: 84.25,
        grade: "B+",
        gpa: 3.5,
        attendance_percentage: 92.5
      },
      // Add more grade entries...
    ]);
  };

  const handleMarkAttendance = async (studentId: number, status: 'present' | 'absent' | 'late' | 'excused') => {
    try {
      const token = localStorage.getItem('authToken');
      await fetch(`${API_BASE_URL}/faculty/attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          student_id: studentId,
          class_id: selectedClass?.id,
          date: selectedDate,
          status: status
        })
      });
      
      // Refresh attendance data
      fetchClassData();
    } catch (error) {
      console.error('Error marking attendance:', error);
    }
  };

  const renderClassOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map(cls => (
          <div key={cls.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
               onClick={() => setSelectedClass(cls)}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  cls.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {cls.status}
                </span>
              </div>
              
              <h3 className="font-semibold text-gray-900 mb-2">{cls.name}</h3>
              <p className="text-sm text-gray-600 mb-4">{cls.code} • {cls.credits} credits</p>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center text-gray-600">
                  <Users className="w-4 h-4 mr-2" />
                  {cls.students_count} students
                </div>
                <div className="flex items-center text-gray-600">
                  <Calendar className="w-4 h-4 mr-2" />
                  {cls.schedule}
                </div>
                <div className="flex items-center text-gray-600">
                  <MapPin className="w-4 h-4 mr-2" />
                  {cls.room}
                </div>
                <div className="flex items-center text-gray-600">
                  <Clock className="w-4 h-4 mr-2" />
                  Next: {cls.next_class}
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">{cls.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedClass && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{selectedClass.name}</h3>
                <p className="text-gray-600">{selectedClass.code} • {selectedClass.credits} credits</p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setActiveTab('attendance')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    activeTab === 'attendance' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <ClipboardList className="w-4 h-4 inline mr-2" />
                  Attendance
                </button>
                <button
                  onClick={() => setActiveTab('grades')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    activeTab === 'grades' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <BarChart3 className="w-4 h-4 inline mr-2" />
                  Grades
                </button>
                <button
                  onClick={() => setActiveTab('schedule')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    activeTab === 'schedule' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Schedule
                </button>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            {activeTab === 'attendance' && renderAttendanceTab()}
            {activeTab === 'grades' && renderGradesTab()}
            {activeTab === 'schedule' && renderScheduleTab()}
          </div>
        </div>
      )}
    </div>
  );

  const renderAttendanceTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => setShowAttendanceModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <CheckSquare className="w-4 h-4" />
            <span>Mark Attendance</span>
          </button>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <span className="text-sm text-gray-600">Present</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
            <span className="text-sm text-gray-600">Late</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
            <span className="text-sm text-gray-600">Absent</span>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">38</p>
            <p className="text-sm text-gray-600">Present</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600">3</p>
            <p className="text-sm text-gray-600">Late</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">4</p>
            <p className="text-sm text-gray-600">Absent</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">84.4%</p>
            <p className="text-sm text-gray-600">Attendance Rate</p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Enrollment</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check-in</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {attendanceRecords.map(record => (
              <tr key={record.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center mr-3">
                      <span className="text-xs font-medium">
                        {record.student_name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{record.student_name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {record.enrollment_number}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    record.status === 'present' ? 'bg-green-100 text-green-800' :
                    record.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                    record.status === 'excused' ? 'bg-blue-100 text-blue-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {record.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {record.check_in_time || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleMarkAttendance(record.student_id, 'present')}
                      className="text-green-600 hover:text-green-900"
                    >
                      <CheckSquare className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleMarkAttendance(record.student_id, 'absent')}
                      className="text-red-600 hover:text-red-900"
                    >
                      <XSquare className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderGradesTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowGradeModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Edit className="w-4 h-4" />
            <span>Update Grades</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Class Average</p>
              <p className="text-2xl font-bold text-gray-900">78.5%</p>
            </div>
            <TrendingUp className="w-6 h-6 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Highest Score</p>
              <p className="text-2xl font-bold text-gray-900">94%</p>
            </div>
            <Award className="w-6 h-6 text-yellow-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Lowest Score</p>
              <p className="text-2xl font-bold text-gray-900">65%</p>
            </div>
            <TrendingDown className="w-6 h-6 text-red-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pass Rate</p>
              <p className="text-2xl font-bold text-gray-900">92%</p>
            </div>
            <Target className="w-6 h-6 text-blue-500" />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assignments</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quizzes</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Midterm</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Final</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grade</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">GPA</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {gradeEntries.map(entry => (
              <tr key={entry.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{entry.student_name}</p>
                    <p className="text-xs text-gray-500">{entry.enrollment_number}</p>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {entry.assignment_score}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {entry.quiz_score}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {entry.midterm_score}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {entry.final_score}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {entry.total_score}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                    entry.grade.startsWith('A') ? 'bg-green-100 text-green-800' :
                    entry.grade.startsWith('B') ? 'bg-blue-100 text-blue-800' :
                    entry.grade.startsWith('C') ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {entry.grade}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {entry.gpa.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderScheduleTab = () => (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Class Schedule</h4>
          <div className="space-y-4">
            <div className="flex items-center p-4 bg-blue-50 rounded-lg">
              <div className="flex-shrink-0">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-blue-900">Today - Data Structures and Algorithms</p>
                <p className="text-sm text-blue-700">10:00 AM - 11:30 AM • Room 301</p>
              </div>
              <div className="ml-auto flex space-x-2">
                <button className="p-2 bg-blue-100 text-blue-600 rounded hover:bg-blue-200">
                  <Video className="w-4 h-4" />
                </button>
                <button className="p-2 bg-blue-100 text-blue-600 rounded hover:bg-blue-200">
                  <Phone className="w-4 h-4" />
                </button>
                <button className="p-2 bg-blue-100 text-blue-600 rounded hover:bg-blue-200">
                  <Mail className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="flex items-center p-4 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0">
                <Calendar className="w-6 h-6 text-gray-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-900">Tomorrow - Database Management Systems</p>
                <p className="text-sm text-gray-700">2:00 PM - 3:30 PM • Room 205</p>
              </div>
              <div className="ml-auto flex space-x-2">
                <button className="p-2 bg-gray-100 text-gray-600 rounded hover:bg-gray-200">
                  <Video className="w-4 h-4" />
                </button>
                <button className="p-2 bg-gray-100 text-gray-600 rounded hover:bg-gray-200">
                  <Phone className="w-4 h-4" />
                </button>
                <button className="p-2 bg-gray-100 text-gray-600 rounded hover:bg-gray-200">
                  <Mail className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Office Hours</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border border-gray-200 rounded-lg">
              <p className="font-medium text-gray-900">Monday & Wednesday</p>
              <p className="text-sm text-gray-600">2:00 PM - 4:00 PM</p>
              <p className="text-sm text-gray-600">Room 301</p>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg">
              <p className="font-medium text-gray-900">Friday</p>
              <p className="text-sm text-gray-600">10:00 AM - 12:00 PM</p>
              <p className="text-sm text-gray-600">Virtual (Zoom)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Class Management</h2>
        <p className="text-gray-600">Manage your classes, attendance, and grades</p>
      </div>

      {renderClassOverview()}
    </div>
  );
};

export default ClassManagement;
