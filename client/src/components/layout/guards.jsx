import { Navigate, useLocation, useSearchParams } from 'react-router';
import { useAuth } from '@/providers/AuthProvider';
import { AppShellSkeleton } from './AppShell';

const safeReturn = (value) => (value?.startsWith('/') && !value.startsWith('//') ? value : '/accueil');

export function RequireVerified({ children }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <AppShellSkeleton />;
  if (!user) return <Navigate to={`/connexion?retour=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (!user.emailVerifie) return <Navigate to="/verifier-email" replace />;
  return children;
}

export function RequireAdmin({ children }) {
  const { user } = useAuth();
  if (user?.role !== 'ADMIN') return <Navigate to="/accueil" replace />;
  return children;
}

export function GuestOnly({ children }) {
  const { user, isLoading } = useAuth();
  const [params] = useSearchParams();
  if (isLoading) return null;
  if (user) return <Navigate to={user.emailVerifie ? safeReturn(params.get('retour')) : '/verifier-email'} replace />;
  return children;
}

export { safeReturn };
