import React, { useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { authService } from '../../services/api';
import {
  AlertCircle,
  ArrowRight,
  AtSign,
  Check,
  CheckCircle2,
  CornerDownLeft,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import AuthLayout from './AuthLayout';
import InstitutionSelect from './InstitutionSelect';
import PasswordField from './PasswordField';
import { meetsPasswordPolicy } from './authContent';
import type { Institution } from './authContent';
import { useFocusTrap, useHotkey } from './useAuthUi';

// Seeded by the backend so the app can be reviewed without registering.
const DEMO_EMAIL = 'student@university.edu.in';
const DEMO_PASSWORD = 'student123';

/** Loose check; the authoritative domain test is the selected institution. */
const looksLikeEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export interface AuthPageProps {
  /** Handed to the "Create an account" link so signup is reachable. */
  onSwitchToSignup: () => void;
  /**
   * Owned by AppRoutes so the chosen tenant survives moving between the two
   * screens — picking an institution on login and then creating an account
   * should not silently reset it.
   */
  institution: Institution | null;
  onInstitutionChange: (institution: Institution) => void;
  /** Fetched once in AppRoutes and passed down, not re-requested per screen. */
  institutions: Institution[];
  institutionStatus: 'loading' | 'live' | 'offline';
}

export const AuthPage: React.FC<AuthPageProps> = ({
  onSwitchToSignup,
  institution,
  onInstitutionChange,
  institutions,
  institutionStatus,
}) => {
  const { login, state } = useApp();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [rememberMe, setRememberMe] = useState(true);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthError, setOauthError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const emailRef = useRef<HTMLInputElement>(null);
  const dialogRef = useFocusTrap<HTMLDivElement>(showForgotPassword);

  const emailTouched = formData.email.length > 0;
  const domainHint = institution?.email_domain ?? '@youruniversity.edu';
  const emailFormatOk = looksLikeEmail(formData.email);
  const emailDomainOk = !institution
    ? emailFormatOk
    : formData.email.trim().toLowerCase().endsWith(institution.domain);

  // "/" from anywhere on the page focuses the email field. The convention in
  // most sign-in forms, and the shortest path from a cold load to a submitted
  // login on a shared machine.
  useHotkey('/', () => emailRef.current?.focus());

  // Escape closes the dialog, matching every other modal on the platform.
  React.useEffect(() => {
    if (!showForgotPassword) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') resetForgotModal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showForgotPassword]);

  const resetForgotModal = () => {
    setShowForgotPassword(false);
    setShowResetForm(false);
    setResetMessage('');
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
    setResetEmail('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'email') setEmailError('');
    if (name === 'password') setPasswordError('');
    setFormData({ ...formData, [name]: value });
  };

  /** Pre-fill the seeded student account; the user still presses Sign in. */
  const fillDemoAccount = () => {
    setEmailError('');
    setPasswordError('');
    setFormData({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
  };

  /**
   * Append the institution's domain to whatever local part has been typed.
   * Nobody types their own domain correctly from memory, and getting it wrong
   * produces a server-side 400 rather than a field-level message.
   */
  const appendDomain = () => {
    if (!institution) return;
    const local = formData.email.split('@')[0]?.trim();
    setEmailError('');
    setFormData({ ...formData, email: `${local}${institution.email_domain}` });
    emailRef.current?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!looksLikeEmail(formData.email)) {
      setEmailError('Enter a valid email address');
      return;
    }
    if (institution && !emailDomainOk) {
      setEmailError(`Use your ${institution.name} address (${institution.email_domain})`);
      return;
    }
    await login(formData.email, formData.password, rememberMe);
  };

  const handleMicrosoftLogin = async () => {
    setOauthLoading(true);
    setOauthError('');
    try {
      const response = (await authService.getMicrosoftAuthUrl()) as any;
      if (response.auth_url) {
        window.location.href = response.auth_url;
      } else {
        setOauthError('Failed to get the Microsoft sign-in URL. Please try again.');
        setOauthLoading(false);
      }
    } catch (error: any) {
      console.error('Microsoft OAuth error:', error);
      setOauthError(error.message || 'Failed to start Microsoft sign-in');
      setOauthLoading(false);
    }
  };

  const handleOAuthCallback = async (code: string, state: string) => {
    setOauthLoading(true);
    setOauthError('');
    try {
      const response = (await authService.handleMicrosoftCallback(code, state)) as any;
      localStorage.setItem('authToken', response.access_token);
      if (response.is_new_user) {
        setOauthError(response.message || 'Please complete your profile.');
      } else {
        await login(response.user.email, '');
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error: any) {
      console.error('OAuth callback error:', error);
      setOauthError(error.message || 'Microsoft sign-in failed');
      setOauthLoading(false);
    }
  };

  // Runs once on mount: the OAuth provider redirects back here with ?code=.
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const oauthState = params.get('state');
    if (code && oauthState) {
      handleOAuthCallback(code, oauthState);
    }
  }, []);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      setResetMessage('Please enter your email address');
      return;
    }

    setResetLoading(true);
    setResetMessage('');
    try {
      const response = (await authService.forgotPassword(resetEmail)) as any;
      setResetMessage(response.message || 'If that address exists, a reset link is on its way');
      if (response.reset_token) {
        setResetToken(response.reset_token);
        setShowResetForm(true);
      }
    } catch (error: any) {
      console.error('Forgot password error:', error);
      setResetMessage(error.message || 'Failed to send the reset link');
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
    // Same policy as signup, from the same list.
    if (!meetsPasswordPolicy(newPassword)) {
      setResetMessage('Password does not meet the requirements listed above');
      return;
    }

    setResetLoading(true);
    setResetMessage('');
    try {
      const response = (await authService.resetPassword(resetToken, newPassword)) as any;
      setResetMessage(response.message || 'Password reset. Sign in with your new password.');
      resetForgotModal();
    } catch (error: any) {
      setResetMessage(error.message || 'Failed to reset password');
    } finally {
      setResetLoading(false);
    }
  };

  const MicrosoftButton: React.FC<{ label: string }> = ({ label }) => (
    <button
      type="button"
      onClick={handleMicrosoftLogin}
      disabled={oauthLoading}
      className="auth-btn auth-btn-ghost"
    >
      {oauthLoading ? (
        <>
          <span className="auth-spinner" style={{ borderTopColor: '#cbd5e1' }} />
          <span>Connecting…</span>
        </>
      ) : (
        <>
          <svg className="w-[1.15rem] h-[1.15rem]" viewBox="0 0 21 21" aria-hidden="true">
            <rect x="1" y="1" width="9" height="9" fill="#f25022" />
            <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
            <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
            <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
          </svg>
          <span>{label}</span>
        </>
      )}
    </button>
  );

  return (
    <AuthLayout
      eyebrow="Sign in"
      headline={
        <>
          One platform for
          <br />
          <span className="auth-gradient-text">your entire campus.</span>
        </>
      }
      subhead="Admissions, academics, finance, attendance and records in one place — with an assistant that answers from your institution's own documents."
      institutionName={institution?.name}
      institutionDomain={institution?.email_domain}
    >
      <div className="auth-card">
        <header className="text-center mb-6">
          <div className="auth-logo auth-logo-sm mx-auto mb-4">
            <Lock className="w-5 h-5 text-white" strokeWidth={2.1} />
          </div>
          <h1 className="auth-ink-text text-[1.65rem] font-bold tracking-tight">
            Sign in
          </h1>
          <p className="auth-text-muted text-sm mt-1.5">
            Continue to your campus workspace
          </p>
        </header>

        <div className="space-y-4">
          <button
            type="button"
            onClick={handleMicrosoftLogin}
            disabled={oauthLoading}
            className="auth-btn auth-btn-ghost"
          >
            {oauthLoading ? (
              <>
                <span className="auth-spinner" style={{ borderTopColor: '#cbd5e1' }} />
                <span>Connecting…</span>
              </>
            ) : (
              <>
                <svg className="w-[1.15rem] h-[1.15rem]" viewBox="0 0 21 21" aria-hidden="true">
                  <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                  <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                  <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                  <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                </svg>
                <span>Continue with Microsoft</span>
              </>
            )}
          </button>

          {oauthError && (
            <div className="auth-alert auth-alert-error" role="alert">
              <AlertCircle className="w-4 h-4" />
              <span>{oauthError}</span>
            </div>
          )}

          <div className="auth-divider">or use your campus email</div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <InstitutionSelect
              institutions={institutions}
              value={institution}
              onChange={(next) => {
                onInstitutionChange(next);
                setEmailError('');
              }}
              loading={institutionStatus === 'loading'}
            />

            <div>
              <label htmlFor="email" className="auth-label">
                Campus email
              </label>
              <div className="relative">
                <Mail className="auth-field-icon" aria-hidden="true" />
                <input
                  ref={emailRef}
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  aria-invalid={Boolean(emailError)}
                  aria-describedby={emailError ? 'email-error' : undefined}
                  className={`auth-field ${emailError ? 'auth-field-error' : ''}`}
                  placeholder={`you${domainHint}`}
                />
                {emailTouched && !emailError &&
                  (emailFormatOk && emailDomainOk ? (
                    <CheckCircle2
                      className="auth-ok absolute right-3 top-1/2 -translate-y-1/2 w-[1.15rem] h-[1.15rem] opacity-80"
                      aria-hidden="true"
                    />
                  ) : (
                    <X
                      className="auth-err absolute right-3 top-1/2 -translate-y-1/2 w-[1.15rem] h-[1.15rem] opacity-75"
                      aria-hidden="true"
                    />
                  ))}
              </div>

              {emailError ? (
                <p
                  id="email-error"
                  className="auth-err-soft mt-2 text-xs flex items-center gap-1.5"
                >
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{emailError}</span>
                </p>
              ) : (
                /* Two ways in: type the whole address, or type your name and
                   let the institution's domain be filled in. */
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <span className="auth-text-faint text-xs">
                    Issued at {domainHint}
                  </span>
                  {institution && formData.email && !formData.email.includes('@') && (
                    <button type="button" onClick={appendDomain} className="auth-append">
                      <AtSign className="w-3 h-3" aria-hidden="true" />
                      Append {institution.email_domain}
                    </button>
                  )}
                  <span className="auth-hint !mt-0 ml-auto">
                    <span className="auth-kbd">/</span>
                    <span>to jump here</span>
                  </span>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-baseline justify-between mb-1.5">
                {/* A real label, not a span: PasswordField renders no label of
                    its own here (label=""), so this is the only thing giving the
                    field an accessible name. A placeholder does not count. */}
                <label htmlFor="password" className="auth-label !mb-0">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="auth-link text-xs"
                >
                  Forgot password?
                </button>
              </div>
              <PasswordField
                id="password"
                name="password"
                label=""
                value={formData.password}
                onChange={(value) => {
                  setPasswordError('');
                  setFormData((prev) => ({ ...prev, password: value }));
                }}
                placeholder="••••••••"
                error={passwordError}
                allowGenerate={false}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSubmit(e as unknown as React.FormEvent);
                  }
                }}
              />
            </div>

            <label className="auth-check">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span className="auth-check-box" aria-hidden="true">
                <Check className="w-3 h-3" strokeWidth={3} />
              </span>
              <span>Keep me signed in on this device</span>
            </label>

            {state.error && (
              <div className="auth-alert auth-alert-error" role="alert">
                <AlertCircle className="w-4 h-4" />
                <span>{state.error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={state.loading}
              className="auth-btn mt-1"
            >
              {state.loading ? (
                <>
                  <span className="auth-spinner" />
                  <span>Signing in…</span>
                </>
              ) : (
                <>
                  <span>Sign in</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Seeded student account, so a reviewer can get in without
                registering. Fills the fields rather than submitting. */}
            <button type="button" onClick={fillDemoAccount} className="auth-demo">
              <Sparkles
                className="w-3.5 h-3.5 auth-accent-sky flex-shrink-0"
                aria-hidden="true"
              />
              <span>
                Use the demo student account —{' '}
                <span className="auth-demo-cred">{DEMO_EMAIL}</span>
              </span>
            </button>
          </form>
        </div>

        <p className="auth-switch auth-rule mt-6 pt-6 border-t">
          New to CampusGenie?{' '}
          <button type="button" onClick={onSwitchToSignup} className="auth-link">
            Create an account
          </button>
        </p>
      </div>

      {/* ── Forgot / reset password ────────────────────────────────────── */}
      {showForgotPassword && (
        <div
          className="auth-modal-scrim"
          onClick={(e) => {
            if (e.target === e.currentTarget) resetForgotModal();
          }}
        >
          <div
            ref={dialogRef}
            className="auth-card auth-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-heading"
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 id="reset-heading" className="auth-ink-text text-xl font-bold">
                  {showResetForm ? 'Set a new password' : 'Reset your password'}
                </h2>
                <p className="auth-text-muted text-sm mt-1">
                  {showResetForm
                    ? 'Choose something you have not used before.'
                    : `We'll email a reset link to your ${institution?.name || 'institution'} address.`}
                </p>
              </div>
              <button
                onClick={resetForgotModal}
                className="auth-icon-btn shrink-0 -mt-1 -mr-1"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {showResetForm ? (
              <form onSubmit={handleResetPassword} className="space-y-4" noValidate>
                <PasswordField
                  id="new-password"
                  name="newPassword"
                  label="New password"
                  value={newPassword}
                  onChange={setNewPassword}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  showRequirements
                />
                <PasswordField
                  id="confirm-password"
                  name="confirmPassword"
                  label="Confirm new password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  autoComplete="new-password"
                  placeholder="Type it once more"
                  trailingSlot={
                    newPassword && newPassword === confirmPassword ? (
                      <CheckCircle2 className="w-[1.15rem] h-[1.15rem]" aria-hidden="true" />
                    ) : undefined
                  }
                />
                {/* The reset path and the signup path must agree on the policy,
                    or a user who satisfies one is rejected by the other. */}
                {newPassword && !meetsPasswordPolicy(newPassword) && (
                  <p className="auth-hint auth-hint-error">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                    <span>Clear the items above before saving.</span>
                  </p>
                )}

                {resetMessage && (
                  <div className="auth-alert auth-alert-error" role="alert">
                    <AlertCircle className="w-4 h-4" />
                    <span>{resetMessage}</span>
                  </div>
                )}

                <button type="submit" disabled={resetLoading} className="auth-btn">
                  {resetLoading ? (
                    <>
                      <span className="auth-spinner" />
                      <span>Updating…</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Update password</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4" noValidate>
                <div>
                  <label htmlFor="reset-email" className="auth-label">
                    Campus email
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="auth-field auth-field-plain"
                    placeholder={`you${domainHint}`}
                  />
                </div>

                {resetMessage && (
                  <div
                    className={`auth-alert ${
                      /success|sent|on its way/i.test(resetMessage)
                        ? 'auth-alert-ok'
                        : 'auth-alert-error'
                    }`}
                    role="status"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{resetMessage}</span>
                  </div>
                )}

                <button type="submit" disabled={resetLoading} className="auth-btn">
                  {resetLoading ? (
                    <>
                      <span className="auth-spinner" />
                      <span>Sending…</span>
                    </>
                  ) : (
                    <>
                      <span>Send reset link</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </AuthLayout>
  );
};

export default AuthPage;