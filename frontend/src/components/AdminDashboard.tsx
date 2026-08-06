import React, { useState, useEffect } from 'react';
import { adminService } from '../services/api';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Mail, 
  Phone, 
  Calendar,
  Shield,
  GraduationCap,
  BookOpen,
  LogOut,
  Menu,
  X,
  Home,
  Settings,
  Database,
  UserCheck,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  Brain
} from 'lucide-react';
import AIKnowledgeBase from './admin/AIKnowledgeBase';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'student' | 'faculty' | 'admin';
  phone?: string;
  enrollment_number?: string;
  school?: string;
  department?: string;
  course?: string;
  created_at: string;
  status: 'active' | 'inactive';
}

interface CreateUserForm {
  name: string;
  email: string;
  role: 'student' | 'faculty';
  phone: string;
  enrollment_number?: string;
  school_id: string;
  department_id: string;
  course_id: string;
  password: string;
  confirm_password: string;
}

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'faculty'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeMenuItem, setActiveMenuItem] = useState('dashboard');
  
  const [createForm, setCreateForm] = useState<CreateUserForm>({
    name: '',
    email: '',
    role: 'student',
    phone: '',
    enrollment_number: '',
    school_id: '',
    department_id: '',
    course_id: '',
    password: '',
    confirm_password: ''
  });

  const [schools, setSchools] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [filteredDepartments, setFilteredDepartments] = useState<any[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<any[]>([]);

  const [editForm, setEditForm] = useState<Partial<User>>({
    name: '',
    email: '',
    phone: '',
    department: '',
    status: 'active'
  });

  const [stats, setStats] = useState({
    total_users: 0,
    total_students: 0,
    total_faculty: 0,
    active_users: 0
  });

  // Update current time
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch users and stats
  useEffect(() => {
    fetchUsers();
    fetchStats();
    fetchSchools();
    fetchDepartments();
    fetchCourses();
  }, []);

  const fetchSchools = async () => {
    try {
      const response = await fetch('http://localhost:8002/schools/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      const data = await response.json();
      setSchools(data);
    } catch (error) {
      console.error('Error fetching schools:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch('http://localhost:8002/schools/departments', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      const data = await response.json();
      setDepartments(data);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await fetch('http://localhost:8002/schools/departments/courses', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      const data = await response.json();
      setCourses(data);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  // Update filtered departments when school changes
  useEffect(() => {
    if (createForm.school_id) {
      const filtered = departments.filter(dept => dept.school_id === parseInt(createForm.school_id));
      setFilteredDepartments(filtered);
      // Reset department and course when school changes
      setCreateForm(prev => ({
        ...prev,
        department_id: '',
        course_id: ''
      }));
      setFilteredCourses([]);
    } else {
      setFilteredDepartments([]);
      setFilteredCourses([]);
    }
  }, [createForm.school_id, departments]);

  // Update filtered courses when department changes
  useEffect(() => {
    if (createForm.department_id) {
      const filtered = courses.filter(course => course.department_id === parseInt(createForm.department_id));
      setFilteredCourses(filtered);
      // Reset course when department changes
      setCreateForm(prev => ({
        ...prev,
        course_id: ''
      }));
    } else {
      setFilteredCourses([]);
    }
  }, [createForm.department_id, courses]);

  const fetchUsers = async () => {
    try {
      console.log('Fetching users...');
      const data = await adminService.getUsers();
      console.log('Users fetched successfully:', data);
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
      console.log('Falling back to mock data...');
      // Mock data for demo
      const mockUsers: User[] = [
        {
          id: 1,
          name: 'John Doe',
          email: 'john.doe@university.edu.in',
          role: 'student',
          phone: '+1234567890',
          enrollment_number: 'ENR2024001',
          department: 'Computer Science',
          created_at: '2024-01-15T10:30:00Z',
          status: 'active'
        },
        {
          id: 2,
          name: 'Jane Smith',
          email: 'jane.smith@university.edu.in',
          role: 'faculty',
          phone: '+1234567891',
          department: 'Computer Science',
          created_at: '2024-01-10T09:15:00Z',
          status: 'active'
        },
        {
          id: 3,
          name: 'Alice Johnson',
          email: 'alice.johnson@university.edu.in',
          role: 'student',
          phone: '+1234567892',
          enrollment_number: 'ENR2024002',
          department: 'Mathematics',
          created_at: '2024-01-20T14:45:00Z',
          status: 'active'
        }
      ];
      setUsers(mockUsers);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await adminService.getStats();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Calculate stats from users
      const calculatedStats = {
        total_users: users.length,
        total_students: users.filter(u => u.role === 'student').length,
        total_faculty: users.filter(u => u.role === 'faculty').length,
        active_users: users.filter(u => u.status === 'active').length
      };
      setStats(calculatedStats);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (createForm.password !== createForm.confirm_password) {
      alert('Passwords do not match');
      return;
    }

    try {
      console.log('Creating user...', createForm);
      const result = await adminService.createUser(createForm);
      console.log('User created successfully:', result);
      fetchUsers();
      fetchStats();
      setShowCreateModal(false);
      resetCreateForm();
      alert('User created successfully!');
    } catch (error: any) {
      console.error('Error creating user:', error);
      alert(error.message || 'Failed to create user');
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUser) return;

    try {
      await adminService.updateUser(selectedUser.id.toString(), editForm);
      fetchUsers();
      setShowEditModal(false);
      setSelectedUser(null);
    } catch (error: any) {
      console.error('Error updating user:', error);
      alert(error.message || 'Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      await adminService.deleteUser(userId.toString());
      fetchUsers();
      fetchStats();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      alert(error.message || 'Failed to delete user');
    }
  };

  const resetCreateForm = () => {
    setCreateForm({
      name: '',
      email: '',
      role: 'student',
      phone: '',
      enrollment_number: '',
      school_id: '',
      department_id: '',
      course_id: '',
      password: '',
      confirm_password: ''
    });
    setFilteredDepartments([]);
    setFilteredCourses([]);
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      department: user.department || '',
      status: user.status
    });
    setShowEditModal(true);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.enrollment_number && user.enrollment_number.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
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
            
            {/* Right Section - Time, Profile */}
            <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-4">
              {/* Time Display */}
              <div className="hidden md:block text-right">
                <div className="text-xs sm:text-sm font-semibold text-gray-900 flex items-center">
                  <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1 text-blue-500" />
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
              
              {/* Profile */}
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">Admin</p>
                  <p className="text-xs text-gray-500">Online</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
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
        
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 ease-in-out bg-slate-900 border-r border-slate-700 overflow-hidden fixed h-full z-30`}>
          {/* Sidebar Header */}
          <div className="p-4 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Admin Panel</h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="p-3 space-y-2">
            <button
              onClick={() => setActiveMenuItem('dashboard')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                activeMenuItem === 'dashboard' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveMenuItem('users')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                activeMenuItem === 'users' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>User Management</span>
            </button>

            <button
              onClick={() => setActiveMenuItem('settings')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                activeMenuItem === 'settings' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>

            <button
              onClick={() => setActiveMenuItem('ai-knowledge')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                activeMenuItem === 'ai-knowledge'
                  ? 'bg-violet-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Brain className="w-4 h-4" />
              <span>AI Knowledge Base</span>
            </button>

            {/* Divider */}
            <div className="border-t border-slate-700 pt-2 mt-2"></div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors text-red-400 hover:bg-red-600/20 hover:text-red-300"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </nav>

          {/* Sidebar Footer */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Admin User</p>
                <p className="text-xs text-slate-400">Online</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6 pt-14 sm:pt-16 lg:pt-20 lg:ml-64">
          {/* AI Knowledge Base view */}
          {activeMenuItem === 'ai-knowledge' && (
            <AIKnowledgeBase />
          )}

          {/* Default dashboard + user management */}
          {activeMenuItem !== 'ai-knowledge' && (
            <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Users</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.total_users}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Students</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.total_students}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <GraduationCap className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Faculty</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.total_faculty}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <BookOpen className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Active Users</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.active_users}</p>
                </div>
                <div className="p-3 bg-emerald-100 rounded-lg">
                  <UserCheck className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </div>
          </div>

          {/* User Management Section */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h2 className="text-xl font-bold text-slate-900">User Management</h2>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
                    />
                  </div>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value as any)}
                    className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Roles</option>
                    <option value="student">Students</option>
                    <option value="faculty">Faculty</option>
                  </select>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium flex items-center space-x-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Add User</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Department</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-slate-900">{user.name}</div>
                            {user.enrollment_number && (
                              <div className="text-xs text-slate-500">{user.enrollment_number}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-900">{user.email}</div>
                        {user.phone && (
                          <div className="text-xs text-slate-500">{user.phone}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.role === 'student' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {user.department || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.status === 'active' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => openEditModal(user)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit User"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
            </>
          )}
        </main>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Create New User</h3>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm({...createForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => setCreateForm({...createForm, email: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({...createForm, role: e.target.value as 'student' | 'faculty'})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="student">Student</option>
                  <option value="faculty">Faculty</option>
                </select>
              </div>

              {createForm.role === 'student' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Enrollment Number</label>
                    <input
                      type="text"
                      value={createForm.enrollment_number}
                      onChange={(e) => setCreateForm({...createForm, enrollment_number: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">School</label>
                    <select
                      value={createForm.school_id}
                      onChange={(e) => setCreateForm({...createForm, school_id: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select School</option>
                      {schools.map((school) => (
                        <option key={school.id} value={school.id}>
                          {school.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                    <select
                      value={createForm.department_id}
                      onChange={(e) => setCreateForm({...createForm, department_id: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                      disabled={!createForm.school_id}
                    >
                      <option value="">Select Department</option>
                      {filteredDepartments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Course</label>
                    <select
                      value={createForm.course_id}
                      onChange={(e) => setCreateForm({...createForm, course_id: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                      disabled={!createForm.department_id}
                    >
                      <option value="">Select Course</option>
                      {filteredCourses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.name} ({course.duration_years} years) - {course.type}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({...createForm, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={createForm.password}
                    onChange={(e) => setCreateForm({...createForm, password: e.target.value})}
                    className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={createForm.confirm_password}
                    onChange={(e) => setCreateForm({...createForm, confirm_password: e.target.value})}
                    className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetCreateForm();
                  }}
                  className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Edit User</h3>
            </div>
            <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                <input
                  type="text"
                  required
                  value={editForm.department}
                  onChange={(e) => setEditForm({...editForm, department: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({...editForm, status: e.target.value as 'active' | 'inactive'})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedUser(null);
                  }}
                  className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200"
                >
                  Update User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
