import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/api';
import { UserPlus, User, Lock, Eye, EyeOff, GraduationCap, Mail, AlertCircle, ChevronRight, CheckCircle2, XCircle, Zap, Shield, ChevronDown, Users, Briefcase } from 'lucide-react';

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<'student' | 'faculty'>('student');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    enrollmentNumber: '',
    employeeId: '',
    department: '',
    semester: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthError, setOauthError] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const validateEmail = (email: string): boolean => {
    const universityEmailRegex = /^[a-zA-Z0-9._%+-]+@university\.edu\.in$/;
    return universityEmailRegex.test(email);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'email') setEmailError('');
    if (name === 'password' || name === 'confirmPassword') setPasswordError('');
    setFormData({ ...formData, [name]: value });
  };

  const validateForm = (): boolean => {
    let isValid = true;
    if (!validateEmail(formData.email)) {
      setEmailError('Only university email addresses ending with @university.edu.in are allowed');
      isValid = false;
    }
    if (formData.password.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
      isValid = false;
    }
    if (formData.password !== formData.confirmPassword) {
      setPasswordError('Passwords do not match');
      isValid = false;
    }
    if (userRole === 'student' && !formData.enrollmentNumber) {
      setEmailError('Enrollment number is required for students');
      isValid = false;
    }
    if (userRole === 'faculty' && !formData.employeeId) {
      setEmailError('Employee ID is required for faculty');
      isValid = false;
    }
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      if (userRole === 'faculty') {
        await authService.registerFaculty({
          email: formData.email,
          password: formData.password,
          first_name: formData.firstName,
          last_name: formData.lastName,
          employee_id: formData.employeeId,
          department: formData.department,
          phone: '',
          specialization: '',
          designation: 'Faculty',
          can_verify_documents: true,
          can_assign_tasks: true,
        });
      } else {
        await authService.registerStudent({
          email: formData.email,
          password: formData.password,
          first_name: formData.firstName,
          last_name: formData.lastName,
          enrollment_number: formData.enrollmentNumber,
          phone: '',
          date_of_birth: '',
          gender: '',
          blood_group: '',
          address: '',
          city: '',
          state: '',
          pincode: '',
          department_id: 1,
          semester: parseInt(formData.semester) || 1,
          batch: '2024-2028',
          admission_year: 2024,
        });
      }
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (error: any) {
      console.error('Registration error:', error);
      setEmailError(error.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMicrosoftLogin = async () => {
    setOauthLoading(true);
    setOauthError('');
    try {
      const response = await authService.getMicrosoftAuthUrl() as any;
      if (response.auth_url) {
        window.location.href = response.auth_url;
      } else {
        setOauthError('Failed to get OAuth URL');
        setOauthLoading(false);
      }
    } catch (error: any) {
      console.error('Microsoft OAuth error:', error);
      setOauthError(error.message || 'Failed to initiate Microsoft login');
      setOauthLoading(false);
    }
  };

  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    if (code && state) {
      handleOAuthCallback(code, state);
    }
  }, []);

  const handleOAuthCallback = async (code: string, state: string) => {
    setOauthLoading(true);
    setOauthError('');
    try {
      const response = await authService.handleMicrosoftCallback(code, state) as any;
      if (response.is_new_user) {
        setSuccess(true);
        setTimeout(() => navigate('/login'), 2000);
      } else {
        navigate('/dashboard');
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error: any) {
      console.error('OAuth callback error:', error);
      setOauthError(error.message || 'OAuth authentication failed');
      setOauthLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 text-center max-w-md mx-auto">
          <div className="inline-flex p-4 bg-green-500 rounded-full mb-4 animate-bounce">
            <CheckCircle2 className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Registration Successful!</h2>
          <p className="text-purple-200">Redirecting to login page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl mx-auto">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
          <div className="text-center mb-8">
            <div className="inline-flex p-4 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl shadow-xl mb-4">
              <UserPlus className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white">Create Account</h2>
            <p className="text-purple-200 mt-2">Join CampusGenie to transform your academic journey</p>
          </div>

          {/* Role Selection */}
          <div className="space-y-2 mb-6 relative z-40">
            <label htmlFor="userRole" className="block text-sm font-medium text-purple-200">
              Select Your Role
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full pl-4 pr-10 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm transition-all duration-300 flex items-center justify-between"
              >
                <div className="flex items-center">
                  {userRole === 'student' && <GraduationCap className="w-5 h-5 text-blue-400 mr-2" />}
                  {userRole === 'faculty' && <Users className="w-5 h-5 text-purple-400 mr-2" />}
                  <span style={{ textTransform: 'capitalize' }}>{userRole}</span>
                </div>
                <ChevronDown className={`w-5 h-5 text-purple-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {dropdownOpen && (
                <div className="absolute z-50 w-full mt-2 bg-gray-900/95 backdrop-blur-xl border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => { setUserRole('student'); setDropdownOpen(false); }}
                    className={`w-full px-4 py-3 text-left flex items-center space-x-3 transition-colors ${
                      userRole === 'student' ? 'bg-blue-600/30 text-blue-300' : 'text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    <GraduationCap className="w-5 h-5" />
                    <span>Student</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setUserRole('faculty'); setDropdownOpen(false); }}
                    className={`w-full px-4 py-3 text-left flex items-center space-x-3 transition-colors ${
                      userRole === 'faculty' ? 'bg-purple-600/30 text-purple-300' : 'text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    <Users className="w-5 h-5" />
                    <span>Faculty</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* OAuth Button */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/20"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-transparent text-purple-300">Or sign up with</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleMicrosoftLogin}
            disabled={oauthLoading}
            className="w-full bg-white text-gray-800 py-3 px-4 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-300 transform hover:scale-[1.02] shadow-lg flex items-center justify-center space-x-3 border border-gray-200 mb-6"
          >
            {oauthLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
                  <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                  <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                  <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                  <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
                </svg>
                <span>Microsoft / Outlook</span>
              </>
            )}
          </button>

          {oauthError && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6">
              <div className="flex items-center space-x-2 text-red-200 text-sm">
                <XCircle className="w-4 h-4" />
                <span>{oauthError}</span>
              </div>
            </div>
          )}

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/20"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-transparent text-purple-300">Or sign up with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="firstName" className="block text-sm font-medium text-purple-200">
                  First Name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="block w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl placeholder-purple-300 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm transition-all duration-300"
                  placeholder="John"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="lastName" className="block text-sm font-medium text-purple-200">
                  Last Name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="block w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl placeholder-purple-300 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm transition-all duration-300"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-purple-200">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className={`h-5 w-5 transition-colors ${focusedField === 'email' ? 'text-blue-400' : 'text-purple-400'}`} />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  className={`block w-full pl-10 pr-4 py-3 bg-white/10 border rounded-xl placeholder-purple-300 text-white focus:outline-none focus:ring-2 focus:border-transparent backdrop-blur-sm transition-all duration-300 ${
                    emailError 
                      ? 'border-red-500 focus:ring-red-500' 
                      : focusedField === 'email'
                      ? 'border-blue-500 focus:ring-blue-500 shadow-lg shadow-blue-500/20'
                      : 'border-white/20 focus:ring-blue-500'
                  }`}
                  placeholder={userRole === 'faculty' ? "staff@university.edu.in" : "student@university.edu.in"}
                />
                {formData.email && !emailError && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                  </div>
                )}
              </div>
              {emailError && (
                <div className="flex items-center space-x-2 text-red-300 text-sm bg-red-500/10 rounded-lg p-2">
                  <XCircle className="w-4 h-4" />
                  <span>{emailError}</span>
                </div>
              )}
            </div>

            {userRole === 'student' && (
              <div className="space-y-2">
                <label htmlFor="enrollmentNumber" className="block text-sm font-medium text-purple-200">
                  Enrollment Number
                </label>
                <input
                  id="enrollmentNumber"
                  name="enrollmentNumber"
                  type="text"
                  required
                  value={formData.enrollmentNumber}
                  onChange={handleInputChange}
                  className="block w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl placeholder-purple-300 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm transition-all duration-300"
                  placeholder="2024CS001"
                />
              </div>
            )}

            {userRole === 'faculty' && (
              <div className="space-y-2">
                <label htmlFor="employeeId" className="block text-sm font-medium text-purple-200">
                  Employee ID
                </label>
                <input
                  id="employeeId"
                  name="employeeId"
                  type="text"
                  required
                  value={formData.employeeId}
                  onChange={handleInputChange}
                  className="block w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl placeholder-purple-300 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm transition-all duration-300"
                  placeholder="FAC001"
                />
              </div>
            )}

            {userRole === 'student' && (
              <div className="space-y-2">
                <label htmlFor="semester" className="block text-sm font-medium text-purple-200">
                  Semester
                </label>
                <select
                  id="semester"
                  name="semester"
                  required
                  value={formData.semester}
                  onChange={handleInputChange}
                  className="block w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm transition-all duration-300"
                >
                  <option value="" className="bg-gray-800">Select Semester</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                    <option key={sem} value={sem} className="bg-gray-800">Semester {sem}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-purple-200">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className={`h-5 w-5 transition-colors ${focusedField === 'password' ? 'text-blue-400' : 'text-purple-400'}`} />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  className={`block w-full pl-10 pr-12 py-3 bg-white/10 border rounded-xl placeholder-purple-300 text-white focus:outline-none focus:ring-2 focus:border-transparent backdrop-blur-sm transition-all duration-300 ${
                    focusedField === 'password'
                      ? 'border-blue-500 focus:ring-blue-500 shadow-lg shadow-blue-500/20'
                      : 'border-white/20 focus:ring-blue-500'
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-purple-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-purple-200">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className={`h-5 w-5 transition-colors ${focusedField === 'confirmPassword' ? 'text-blue-400' : 'text-purple-400'}`} />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  onFocus={() => setFocusedField('confirmPassword')}
                  onBlur={() => setFocusedField(null)}
                  className={`block w-full pl-10 pr-12 py-3 bg-white/10 border rounded-xl placeholder-purple-300 text-white focus:outline-none focus:ring-2 focus:border-transparent backdrop-blur-sm transition-all duration-300 ${
                    focusedField === 'confirmPassword'
                      ? 'border-blue-500 focus:ring-blue-500 shadow-lg shadow-blue-500/20'
                      : 'border-white/20 focus:ring-blue-500'
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-purple-400 hover:text-white transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
                {formData.confirmPassword && formData.password === formData.confirmPassword && (
                  <div className="absolute inset-y-0 right-10 flex items-center">
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                  </div>
                )}
              </div>
              {passwordError && (
                <div className="flex items-center space-x-2 text-red-300 text-sm bg-red-500/10 rounded-lg p-2">
                  <XCircle className="w-4 h-4" />
                  <span>{passwordError}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-500 to-blue-600 text-white py-3 px-4 rounded-xl font-semibold hover:from-purple-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] shadow-lg flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create {userRole.charAt(0).toUpperCase() + userRole.slice(1)} Account</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-purple-200">
              Already have an account?{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-blue-300 hover:text-blue-200 font-medium transition-colors underline decoration-dotted underline-offset-4"
              >
                Sign in
              </button>
            </p>
          </div>

          {/* Footer with trust indicators */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <div className="flex justify-center items-center space-x-6 text-purple-300 text-sm">
              <div className="flex items-center space-x-1">
                <Shield className="w-4 h-4" />
                <span>Secure</span>
              </div>
              <div className="flex items-center space-x-1">
                <Zap className="w-4 h-4" />
                <span>Fast</span>
              </div>
              <div className="flex items-center space-x-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Reliable</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};