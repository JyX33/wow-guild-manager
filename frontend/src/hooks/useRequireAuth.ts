import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

/**
 * Hook to protect routes that require authentication
 * Can optionally require specific roles
 */
export function useRequireAuth(requiredRoles?: UserRole | UserRole[]) {
  const { user, loading, isAuthenticated, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    // Wait until auth state is determined
    if (!loading) {
      // Redirect to login if not authenticated
      if (!isAuthenticated) {
        navigate('/login', { state: { from: location.pathname } });
        return;
      }
      
      // Check role requirements if specified
      if (requiredRoles && user) {
        if (!hasRole(requiredRoles)) {
          navigate('/dashboard');
        }
      }
    }
  }, [loading, isAuthenticated, user, requiredRoles, hasRole, navigate, location.pathname]);
  
  return { user, loading, isAuthenticated };
}