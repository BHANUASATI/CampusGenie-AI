import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { AuthPage } from '../components/auth/AuthPage';
import { SignupPage } from '../components/auth/SignupPage';
import { useInstitutions } from '../components/auth/useCampusData';
import type { Institution } from '../components/auth/authContent';
import { StudentDashboard } from './StudentDashboard';
import AdminDashboard from '../components/AdminDashboard';
import FacultyDashboardNew from '../components/FacultyDashboardNew';
import RegistrarDashboard from '../components/RegistrarDashboard';
import FacultyLogin from '../components/FacultyLogin';

export const AppRoutes: React.FC = () => {
  const { state } = useApp();
  const { isAuthenticated, isFaculty, currentUser, isInitializing } = state;
  const [userType, setUserType] = useState<'faculty' | 'registrar' | null>(null);

  // There is no router in the tree, so the two unauthenticated screens swap via
  // state rather than a route. SignupPage used to call useNavigate(), which
  // threw outside a <Router> — hence the callback props instead.
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');

  // The chosen tenant lives here so it survives moving between the two
  // screens, and so the institution list is fetched once instead of once per
  // screen. `useInstitutions` seeds with a fallback entry, so the selection is
  // re-pointed whenever the real list replaces it — otherwise the tenant would
  // stay pinned to the fallback's name and domain forever.
  const { institutions, status: institutionStatus } = useInstitutions();
  const [institution, setInstitution] = useState<Institution | null>(null);
  useEffect(() => {
    if (institutions.length === 0) return;
    setInstitution((current) => {
      if (!current) return institutions[0];
      // Keep the tenant the user picked, but adopt the server's current object
      // for it. Matching on id alone would pin the selection to a stale copy
      // when the live list replaced the offline fallback, since both share the
      // default deployment's id.
      return institutions.find((i) => i.id === current.id) ?? institutions[0];
    });
  }, [institutions]);

  // Show loading screen while initializing authentication
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return authView === 'signup' ? (
      <SignupPage
        onSwitchToLogin={() => setAuthView('login')}
        institutions={institutions}
        institutionStatus={institutionStatus}
        institution={institution}
        onInstitutionChange={setInstitution}
      />
    ) : (
      <AuthPage
        onSwitchToSignup={() => setAuthView('signup')}
        institutions={institutions}
        institutionStatus={institutionStatus}
        institution={institution}
        onInstitutionChange={setInstitution}
      />
    );
  }

  // Check if user is admin (for demo, we'll check email)
  const isAdmin = currentUser?.email?.includes('admin') || (currentUser && 'role' in currentUser && currentUser.role === 'admin') || false;
  
  // Check if user is faculty or registrar based on email or role
  const isRegistrar = currentUser?.email?.toLowerCase().includes('registrar') || false;
  const isStaff = currentUser?.email?.toLowerCase().includes('staff') || (currentUser && 'role' in currentUser && currentUser.role === 'faculty') || false;

  // Show appropriate dashboard based on user role
  if (isAdmin) {
    return <AdminDashboard />;
  }

  if (isRegistrar) {
    return <RegistrarDashboard />;
  }

  if (isStaff && isFaculty) {
    return <FacultyDashboardNew />;
  }

  return <StudentDashboard />;
};
