import React, { useState } from 'react';
import { authService } from '../../services/api';
import {
  AlertCircle,
  ArrowRight,
  AtSign,
  Building,
  CheckCircle2,
  GraduationCap,
  Hash,
  Mail,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import AuthLayout from './AuthLayout';
import InstitutionSelect from './InstitutionSelect';
import PasswordField from './PasswordField';
import { meetsPasswordPolicy, type Institution } from './authContent';
import { useAcademicStructure } from './useCampusData';

const looksLikeEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

type Role = 'student' | 'faculty';

const ROLE_OPTIONS: { key: Role; label: string; icon: typeof GraduationCap }[] = [
  { key: 'student', label: 'Student', icon: GraduationCap },
  { key: 'faculty', label: 'Faculty', icon: Users },
];

export interface SignupPageProps {
  onSwitchToLogin: () => void;
  /** Owned by AppRoutes, so the tenant carries over from the login screen. */
  institution: Institution | null;
  onInstitutionChange: (institution: Institution) => void;
  /** Fetched once in AppRoutes and passed down, not re-requested per screen. */
  institutions: Institution[];
  institutionStatus: 'loading' | 'live' | 'offline';
}

export const SignupPage: React.FC<SignupPageProps> = ({
  onSwitchToLogin,
  institution,
  onInstitutionChange,
  institutions,
  institutionStatus,
}) => {
  const { schools, departmentsFor, loaded: structureLoaded } = useAcademicStructure();

  const [role, setRole] = useState<Role>('student');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    enrollmentNumber: '',
    employeeId: '',
    departmentId: '',
    department: '',
    semester: '',
    password: '',
    confirmPassword: '',
  });
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  /**
   * Errors that belong to a field other than email — enrolment number, employee
   * ID, name. Kept separate from `emailError` because both were competing for
   * one slot, and a wrong-domain address ended up reporting "enrollment number
   * is required" instead.
   */
  const [fieldError, setFieldError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthError, setOauthError] = useState('');

  const domainHint = institution?.email_domain ?? '@youruniversity.edu';
  const emailFormatOk = looksLikeEmail(formData.email);
  const emailDomainOk = !institution
    ? emailFormatOk
    : formData.email.trim().toLowerCase().endsWith(institution.domain);
  const passwordsMatch =
    formData.confirmPassword.length > 0 && formData.password === formData.confirmPassword;

  /** Departments with no matching school in the list, so none are dropped. */
  const ungrouped = departmentsFor(null).filter(
    (d) => !schools.some((s) => s.id === d.school_id)
  );

  /** Append the institution domain to a bare local part. */
  const appendDomain = () => {
    if (!institution) return;
    const local = formData.email.split('@')[0]?.trim();
    setEmailError('');
    setFormData({ ...formData, email: `${local}${institution.email_domain}` });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'email') setEmailError('');
    if (name === 'password' || name === 'confirmPassword') setPasswordError('');
    setFieldError('');
    setFormData({ ...formData, [name]: value });
  };

  const validate = (): boolean => {
    let ok = true;

    if (!institution) {
      setEmailError('Select your institution first');
      return false;
    }

    setEmailError('');
    setPasswordError('');
    setFieldError('');

    if (!looksLikeEmail(formData.email)) {
      setEmailError('Enter a valid email address');
      ok = false;
    } else if (!emailDomainOk) {
      setEmailError(`Use your ${institution.name} address (${institution.email_domain})`);
      ok = false;
    }

    // Same rule list the live checklist renders, so the two cannot disagree.
    if (!meetsPasswordPolicy(formData.password)) {
      setPasswordError('Password does not meet every requirement listed');
      ok = false;
    } else if (formData.password !== formData.confirmPassword) {
      setPasswordError('Passwords do not match');
      ok = false;
    }

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setFieldError('First and last name are required');
      ok = false;
    } else if (role === 'student' && !formData.enrollmentNumber.trim()) {
      setFieldError('Enrollment number is required for students');
      ok = false;
    } else if (role === 'faculty' && !formData.employeeId.trim()) {
      setFieldError('Employee ID is required for faculty');
      ok = false;
    } else if (!formData.departmentId && !formData.department.trim()) {
      setFieldError('Select your department');
      ok = false;
    }

    return ok;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      if (role === 'faculty') {
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
        // Optional fields are omitted rather than sent as empty strings:
        // `date_of_birth` and `gender` are Optional on the backend but still
        // type-checked, so "" fails validation with a 422. These are collected
        // later, during profile completion.
        //
        // `department_id` used to be hard-coded to 1, which filed every new
        // student under Computer Science. It now comes from the picker's real
        // value, falling back to 1 only when the list could not be loaded.
        await authService.registerStudent({
          email: formData.email,
          password: formData.password,
          first_name: formData.firstName,
          last_name: formData.lastName,
          enrollment_number: formData.enrollmentNumber,
          department_id: parseInt(formData.departmentId, 10) || 1,
          semester: parseInt(formData.semester, 10) || 1,
          batch: '2024-2028',
          admission_year: 2024,
        });
      }
      setSuccess(true);
      window.setTimeout(onSwitchToLogin, 2200);
    } catch (error: any) {
      console.error('Registration error:', error);
      // Surface what the API actually said. The generic axios message reads
      // "API Error: 422 …" with no indication of which field was wrong.
      const detail = error?.detail ?? error?.response?.data?.detail;
      const readable = Array.isArray(detail)
        ? detail
            .map((d: any) => `${(d.loc || []).filter((l: any) => l !== 'body').join('.')}: ${d.msg}`)
            .join('; ')
        : typeof detail === 'string'
          ? detail
          : undefined;
      setFieldError(readable || error.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
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
      if (response.is_new_user) {
        setSuccess(true);
        window.setTimeout(onSwitchToLogin, 2200);
      } else {
        onSwitchToLogin();
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

  if (success) {
    return (
      <AuthLayout
        eyebrow="Account created"
        headline={
          <>
            Your campus workspace
            <br />
            <span className="auth-gradient-text">is ready.</span>
          </>
        }
        subhead="Your account is ready. Taking you to the sign-in page…"
        institutionName={institution?.name}
        institutionDomain={institution?.email_domain}
      >
        <div className="auth-card text-center">
          <div className="auth-success-ring">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h1 className="auth-ink-text text-xl font-bold">Account created</h1>
          <p className="auth-text-muted text-sm mt-2">Redirecting you to sign in…</p>
        </div>
      </AuthLayout>
    );
  }

  const idLabel = role === 'student' ? 'Enrollment number' : 'Employee ID';
  const idName = role === 'student' ? 'enrollmentNumber' : 'employeeId';
  const idValue = role === 'student' ? formData.enrollmentNumber : formData.employeeId;
  const idPlaceholder = role === 'student' ? '2024CS001' : 'FAC001';

  return (
    <AuthLayout
      eyebrow="Create account"
      headline={
        <>
          Bring your whole campus
          <br />
          <span className="auth-gradient-text">onto one platform.</span>
        </>
      }
      subhead="Pick your institution, and your workspace opens with every module your department already uses."
      institutionName={institution?.name}
      institutionDomain={institution?.email_domain}
    >
      <div className="auth-card">
        <header className="text-center mb-6">
          <h1 className="auth-ink-text text-[1.65rem] font-bold tracking-tight">
            Create your account
          </h1>
          <p className="auth-text-muted text-sm mt-1.5">
            Set up access in under a minute
          </p>
        </header>

        {/* ── Institution ─────────────────────────────────────────────── */}
        <div className="mb-5">
          <InstitutionSelect
            institutions={institutions}
            value={institution}
            onChange={(next) => {
              onInstitutionChange(next);
              setEmailError('');
            }}
            loading={institutionStatus === 'loading'}
          />
        </div>

        {/* ── Role picker ─────────────────────────────────────────────── */}
        <div className="mb-5">
          <span className="auth-label">I am a</span>
          <div className="auth-segment" role="group" aria-label="Account type">
            {ROLE_OPTIONS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                className="auth-segment-btn"
                aria-pressed={role === key}
                onClick={() => setRole(key)}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
          {/* What the chosen role actually gets, so the toggle is not a guess. */}
          <p className="auth-hint !mt-2">
            {role === 'student'
              ? 'Coursework, attendance, fees, results and campus notices.'
              : 'Class rosters, mark entry, document verification and approvals.'}
          </p>
        </div>

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
                <span>Sign up with Microsoft</span>
              </>
            )}
          </button>

          {oauthError && (
            <div className="auth-alert auth-alert-error" role="alert">
              <AlertCircle className="w-4 h-4" />
              <span>{oauthError}</span>
            </div>
          )}

          <div className="auth-divider">or register with email</div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="firstName" className="auth-label">
                  First name
                </label>
                <div className="relative">
                  <UserRound className="auth-field-icon" aria-hidden="true" />
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    autoComplete="given-name"
                    required
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="auth-field"
                    placeholder="Asha"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="lastName" className="auth-label">
                  Last name
                </label>
                <div className="relative">
                  <UserRound className="auth-field-icon" aria-hidden="true" />
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    autoComplete="family-name"
                    required
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="auth-field"
                    placeholder="Verma"
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="email" className="auth-label">
                Campus email
              </label>
              <div className="relative">
                <Mail className="auth-field-icon" aria-hidden="true" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  aria-invalid={Boolean(emailError)}
                  className={`auth-field ${emailError ? 'auth-field-error' : ''}`}
                  placeholder={`you${domainHint}`}
                />
                {formData.email.length > 0 && !emailError &&
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
                <p className="auth-err-soft mt-2 text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{emailError}</span>
                </p>
              ) : (
                institution && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="auth-text-faint text-xs">
                      Must end with {institution.email_domain}
                    </span>
                    {formData.email && !formData.email.includes('@') && (
                      <button type="button" onClick={appendDomain} className="auth-append">
                        <AtSign className="w-3 h-3" aria-hidden="true" />
                        Append
                      </button>
                    )}
                  </div>
                )
              )}
            </div>

            {fieldError && (
              <div className="auth-alert auth-alert-error" role="alert">
                <AlertCircle className="w-4 h-4" />
                <span>{fieldError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor={idName} className="auth-label">
                  {idLabel}
                </label>
                <div className="relative">
                  <Hash className="auth-field-icon" aria-hidden="true" />
                  <input
                    id={idName}
                    name={idName}
                    type="text"
                    required
                    value={idValue}
                    onChange={handleInputChange}
                    className="auth-field"
                    placeholder={idPlaceholder}
                  />
                </div>
              </div>

              {role === 'student' ? (
                <div>
                  <label htmlFor="semester" className="auth-label">
                    Semester
                  </label>
                  <select
                    id="semester"
                    name="semester"
                    required
                    value={formData.semester}
                    onChange={handleInputChange}
                    className="auth-field auth-field-plain appearance-none cursor-pointer"
                  >
                    <option value="">Select…</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s} className="auth-option">
                        Semester {s}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>

            {/* ── Department ─────────────────────────────────────────────
                Loaded from the API rather than typed, because the student
                payload needs a real `department_id` and the free-text value the
                form used to collect never produced one. Falls back to a text
                input if the list cannot be fetched, so signup never hard-fails
                when the backend is down. */}
            <div>
              <label htmlFor="departmentId" className="auth-label">
                Department
              </label>
              <div className="relative">
                <Building className="auth-field-icon" aria-hidden="true" />
                {structureLoaded && departmentsFor(null).length > 0 ? (
                  <>
                    <select
                      id="departmentId"
                      name="departmentId"
                      required
                      value={formData.departmentId}
                      onChange={(e) => {
                        const picked = departmentsFor(null).find(
                          (d) => String(d.id) === e.target.value
                        );
                        // Keep the name in sync: the faculty endpoint takes a
                        // department *name*, the student one an id.
                        setFormData((prev) => ({
                          ...prev,
                          departmentId: e.target.value,
                          department: picked?.name ?? '',
                        }));
                        setFieldError('');
                      }}
                      className="auth-field auth-field-plain appearance-none cursor-pointer"
                    >
                      <option value="">Select your department…</option>
                      {/* One optgroup per school. Nesting optgroups is invalid
                          and browsers flatten it, which silently duplicated
                          every department at the top of the list. Departments
                          whose school is not configured fall into their own
                          group rather than disappearing. */}
                      {schools.map((school) => {
                        const options = departmentsFor(school.id);
                        if (options.length === 0) return null;
                        return (
                          <optgroup key={school.id} label={school.name}>
                            {options.map((dept) => (
                              <option key={dept.id} value={dept.id} className="auth-option">
                                {dept.name}
                                {dept.code ? ` (${dept.code})` : ''}
                              </option>
                            ))}
                          </optgroup>
                        );
                      })}
                      {ungrouped.length > 0 && (
                        <optgroup label="Other departments">
                          {ungrouped.map((dept) => (
                            <option key={dept.id} value={dept.id} className="auth-option">
                              {dept.name}
                              {dept.code ? ` (${dept.code})` : ''}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                    <p className="auth-hint">
                      {schools.length} schools, {departmentsFor(null).length} departments configured.
                    </p>
                  </>
                ) : (
                  <input
                    id="departmentId"
                    name="department"
                    type="text"
                    required
                    value={formData.department}
                    onChange={handleInputChange}
                    className="auth-field"
                    placeholder="Computer Science"
                  />
                )}
              </div>
            </div>

            <PasswordField
              id="password"
              name="password"
              label="Password"
              value={formData.password}
              onChange={(value) => {
                setPasswordError('');
                setFormData((prev) => ({ ...prev, password: value }));
              }}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              showRequirements
              error={passwordError}
            />

            <PasswordField
              id="confirmPassword"
              name="confirmPassword"
              label="Confirm password"
              value={formData.confirmPassword}
              onChange={(value) => {
                setPasswordError('');
                setFormData((prev) => ({ ...prev, confirmPassword: value }));
              }}
              autoComplete="new-password"
              placeholder="Type it once more"
              allowGenerate={false}
              trailingSlot={
                passwordsMatch ? (
                  <CheckCircle2 className="w-[1.15rem] h-[1.15rem]" aria-hidden="true" />
                ) : undefined
              }
            />

            <button type="submit" disabled={loading} className="auth-btn mt-1">
              {loading ? (
                <>
                  <span className="auth-spinner" />
                  <span>Creating account…</span>
                </>
              ) : (
                <>
                  <span>Create {role === 'student' ? 'student' : 'faculty'} account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="auth-switch auth-rule mt-6 pt-6 border-t">
          Already have an account?{' '}
          <button type="button" onClick={onSwitchToLogin} className="auth-link">
            Sign in
          </button>
        </p>
      </div>
    </AuthLayout>
  );
};

export default SignupPage;