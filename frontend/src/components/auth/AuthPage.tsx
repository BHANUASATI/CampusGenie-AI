import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { authService } from '../../services/api';
import { LogIn, User, Lock, Eye, EyeOff, GraduationCap, Users, ChevronRight, CheckCircle2, XCircle, Shield, Zap, BookOpen, ArrowRight, ChevronDown, Briefcase } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const { login, state } = useApp();
  const [userRole, setUserRole] = useState<'student' | 'faculty' | 'admin' | 'registrar'>('student');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthError, setOauthError] = useState('');
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const validateEmail = (email: string): boolean => {
    const universityEmailRegex = /^[a-zA-Z0-9._%+-]+@university\.edu\.in$/;
    return universityEmailRegex.test(email);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'email') setEmailError('');
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(formData.email)) {
      setEmailError('Only university email addresses ending with @university.edu.in are allowed');
      return;
    }
    const isFaculty = userRole === 'faculty' || userRole === 'registrar';
    const isAdmin = userRole === 'admin';
    await login(formData.email, formData.password, isFaculty || isAdmin);
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
      localStorage.setItem('authToken', response.access_token);
      if (response.is_new_user) {
        setOauthError(response.message || 'Please complete your profile');
      } else {
        const userRole = response.user.role;
        const isUserFaculty = userRole === 'faculty';
        const isUserAdmin = userRole === 'admin';
        let user: any;
        if (isUserAdmin) {
          user = { id: response.user.id.toString(), name: 'Admin User', email: response.user.email, role: 'admin' as const, permissions: ['all'] };
        } else if (isUserFaculty) {
          user = { id: response.user.id.toString(), name: 'Faculty User', email: response.user.email, department: 'Computer Science', role: 'faculty' as const, permissions: ['manage_tasks', 'view_students'] };
        } else {
          user = { id: response.user.id.toString(), name: 'Student User', email: response.user.email, course: 'BCA', currentSemester: 1, totalSemesters: 6 };
        }
        await login(response.user.email, '', isUserFaculty || isUserAdmin);
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error: any) {
      console.error('OAuth callback error:', error);
      setOauthError(error.message || 'OAuth authentication failed');
      setOauthLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          
          {/* Left side - Branding */}
          <div className="hidden lg:block space-y-8">
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="p-4 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl shadow-2xl">
                  <BookOpen className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-white">CampusGenie</h1>
                  <p className="text-purple-300 text-lg">AI for Smarter Learning</p>
                </div>
              </div>
              
              <h2 className="text-5xl font-bold text-white leading-tight">
                Transform Your<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                  Academic Journey
                </span>
              </h2>
              
              <p className="text-xl text-purple-200 leading-relaxed max-w-lg">
                Experience the future of education with intelligent task management, personalized learning paths, and AI-driven insights.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-4 p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">AI-Powered Insights</h3>
                  <p className="text-sm text-purple-300">Personalized recommendations</p>
                </div>
              </div>

              <div className="flex items-center space-x-4 p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Smart Learning Paths</h3>
                  <p className="text-sm text-purple-300">AI-generated curriculum</p>
                </div>
              </div>

              <div className="flex items-center space-x-4 p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="p-3 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Enterprise Security</h3>
                  <p className="text-sm text-purple-300">Bank-grade data protection</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Login Form */}
          <div className="w-full max-w-md mx-auto">
            {loginSuccess ? (
              <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 text-center">
                <div className="inline-flex p-4 bg-green-500 rounded-full mb-4 animate-bounce">
                  <CheckCircle2 className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Login Successful!</h2>
                <p className="text-purple-200">Redirecting to your dashboard...</p>
              </div>
            ) : (
              <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
                <div className="text-center mb-8">
                  <div className="inline-flex p-4 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl shadow-xl mb-4">
                    <LogIn className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold text-white">Welcome Back</h2>
                  <p className="text-purple-200 mt-2">Sign in to continue your learning journey</p>
                </div>

                {/* OAuth Button */}
                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/20"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-transparent text-purple-300">Or continue with</span>
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
                    <span className="px-4 bg-transparent text-purple-300">Or sign in with email</span>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <label htmlFor="email" className="block text-sm font-medium text-purple-200">
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className={`h-5 w-5 transition-colors ${focusedField === 'email' ? 'text-blue-400' : 'text-purple-400'}`} />
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
                        placeholder={userRole === 'faculty' || userRole === 'registrar' ? "staff@university.edu.in" : "student@university.edu.in"}
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

                  {/* Role Selection Dropdown */}
                  <div className="space-y-2 relative z-40">
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
                          {userRole === 'admin' && <Shield className="w-5 h-5 text-pink-400 mr-2" />}
                          {userRole === 'registrar' && <Briefcase className="w-5 h-5 text-green-400 mr-2" />}
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
                          <button
                            type="button"
                            onClick={() => { setUserRole('admin'); setDropdownOpen(false); }}
                            className={`w-full px-4 py-3 text-left flex items-center space-x-3 transition-colors ${
                              userRole === 'admin' ? 'bg-pink-600/30 text-pink-300' : 'text-gray-300 hover:bg-gray-800'
                            }`}
                          >
                            <Shield className="w-5 h-5" />
                            <span>Admin</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => { setUserRole('registrar'); setDropdownOpen(false); }}
                            className={`w-full px-4 py-3 text-left flex items-center space-x-3 transition-colors ${
                              userRole === 'registrar' ? 'bg-green-600/30 text-green-300' : 'text-gray-300 hover:bg-gray-800'
                            }`}
                          >
                            <Briefcase className="w-5 h-5" />
                            <span>Registrar</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

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

                  {state.error && (
                    <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4">
                      <div className="flex items-center space-x-2">
                        <XCircle className="w-5 h-5 text-red-300" />
                        <p className="text-sm text-red-200">{state.error}</p>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={state.loading}
                    className="w-full bg-gradient-to-r from-purple-500 to-blue-600 text-white py-3 px-4 rounded-xl font-semibold hover:from-purple-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] shadow-lg flex items-center justify-center space-x-2"
                  >
                    {state.loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign in as {userRole.charAt(0).toUpperCase() + userRole.slice(1)}</span>
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="text-center">
                    <button type="button" className="text-sm text-purple-200 hover:text-white transition-colors">
                      Forgot your password?
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};