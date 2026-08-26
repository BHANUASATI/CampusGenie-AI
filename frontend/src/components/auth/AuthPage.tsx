import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { authService } from '../../services/api';
import { LogIn, User, Lock, Eye, EyeOff, ChevronRight, CheckCircle2, XCircle, Shield, Zap, BookOpen, ArrowRight, X } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const { login, state } = useApp();
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
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

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
    await login(formData.email, formData.password);
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
        await login(response.user.email, '');
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error: any) {
      console.error('OAuth callback error:', error);
      setOauthError(error.message || 'OAuth authentication failed');
      setOauthLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('handleForgotPassword called with email:', resetEmail);
    
    if (!resetEmail) {
      setResetMessage('Please enter your email address');
      return;
    }
    
    setResetLoading(true);
    setResetMessage('');
    
    try {
      console.log('Calling forgotPassword API with email:', resetEmail);
      const response = await authService.forgotPassword(resetEmail) as any;
      console.log('Forgot password response:', response);
      setResetMessage(response.message || 'If the email exists, a reset link has been sent');
      if (response.reset_token) {
        setResetToken(response.reset_token);
        setShowResetForm(true);
      }
    } catch (error: any) {
      console.error('Forgot password error:', error);
      setResetMessage(error.message || 'Failed to send reset link');
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setResetMessage('Passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      setResetMessage('Password must be at least 6 characters');
      return;
    }
    
    setResetLoading(true);
    setResetMessage('');
    
    try {
      const response = await authService.resetPassword(resetToken, newPassword) as any;
      setResetMessage(response.message || 'Password reset successfully');
      setShowResetForm(false);
      setShowForgotPassword(false);
      setResetToken('');
      setNewPassword('');
      setConfirmPassword('');
      setResetEmail('');
    } catch (error: any) {
      setResetMessage(error.message || 'Failed to reset password');
    } finally {
      setResetLoading(false);
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
                  <BookOpen className="w-6 h-6 text-white" />
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
                        placeholder="your.email@university.edu.in"
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
                        <span>Sign In</span>
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="text-center">
                    <button 
                      type="button" 
                      onClick={(e) => {
                        e.preventDefault();
                        console.log('Forgot password button clicked');
                        setShowForgotPassword(true);
                      }}
                      className="text-sm text-purple-200 hover:text-white transition-colors cursor-pointer underline p-2 rounded hover:bg-white/10"
                    >
                      Forgot your password?
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowForgotPassword(false);
              setShowResetForm(false);
              setResetMessage('');
              setResetToken('');
              setNewPassword('');
              setConfirmPassword('');
              setResetEmail('');
            }
          }}
        >
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 w-full max-w-md relative">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                {showResetForm ? 'Reset Password' : 'Forgot Password'}
              </h2>
              <button
                onClick={() => {
                  setShowForgotPassword(false);
                  setShowResetForm(false);
                  setResetMessage('');
                  setResetToken('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setResetEmail('');
                }}
                className="text-purple-300 hover:text-white transition-colors bg-white/10 rounded-full p-2 hover:bg-white/20"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {!showResetForm ? (
              <form onSubmit={handleForgotPassword} className="space-y-5">
                <div>
                  <label htmlFor="reset-email" className="block text-sm font-medium text-purple-200 mb-2">
                    Email Address
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="block w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl placeholder-purple-300 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm transition-all duration-300"
                    placeholder="your.email@university.edu.in"
                  />
                </div>

                {resetMessage && (
                  <div className={`p-4 rounded-xl ${
                    resetMessage.includes('success') || resetMessage.includes('sent') 
                      ? 'bg-green-500/20 border border-green-500/50' 
                      : 'bg-red-500/20 border border-red-500/50'
                  }`}>
                    <p className="text-sm text-white">{resetMessage}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full bg-gradient-to-r from-purple-500 to-blue-600 text-white py-3 px-4 rounded-xl font-semibold hover:from-purple-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] shadow-lg flex items-center justify-center space-x-2"
                >
                  {resetLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Reset Link</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-5">
                <div>
                  <label htmlFor="new-password" className="block text-sm font-medium text-purple-200 mb-2">
                    New Password
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="block w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl placeholder-purple-300 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm transition-all duration-300"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-purple-200 mb-2">
                    Confirm New Password
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl placeholder-purple-300 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm transition-all duration-300"
                    placeholder="••••••••"
                  />
                </div>

                {resetMessage && (
                  <div className={`p-4 rounded-xl ${
                    resetMessage.includes('success') 
                      ? 'bg-green-500/20 border border-green-500/50' 
                      : 'bg-red-500/20 border border-red-500/50'
                  }`}>
                    <p className="text-sm text-white">{resetMessage}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full bg-gradient-to-r from-purple-500 to-blue-600 text-white py-3 px-4 rounded-xl font-semibold hover:from-purple-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] shadow-lg flex items-center justify-center space-x-2"
                >
                  {resetLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Resetting...</span>
                    </>
                  ) : (
                    <>
                      <span>Reset Password</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};