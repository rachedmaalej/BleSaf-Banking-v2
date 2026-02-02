import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { UserRole } from '@blesaf/shared';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, hasRole } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !hasRole(...allowedRoles)) {
    // Redirect to appropriate dashboard based on role
    const { user } = useAuthStore.getState();
    if (user?.role === 'teller') {
      return <Navigate to="/teller" replace />;
    }
    if (user?.role === 'branch_manager') {
      return <Navigate to="/manager" replace />;
    }
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}
