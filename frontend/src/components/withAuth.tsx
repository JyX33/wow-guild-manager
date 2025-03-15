import React, { ComponentType, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../../../shared/types/index';
import LoadingSpinner from './LoadingSpinner';

interface WithAuthProps {
  requiredRoles?: UserRole | UserRole[];
}

/**
 * Higher-Order Component for protecting routes that require authentication
 * 
 * @param Component The component to wrap with authentication
 * @param options Options for authentication requirements
 * @returns A wrapped component that handles authentication
 */
const withAuth = <P extends object>(
  Component: ComponentType<P>,
  options: WithAuthProps = {}
) => {
  const WithAuthComponent: React.FC<P> = (props) => {
    const { isAuthenticated, user, loading, hasRole } = useAuth();
    const location = useLocation();
    const { requiredRoles } = options;

    useEffect(() => {
      // You can add analytics or logging here if needed
    }, [location.pathname]);

    // Show loading state while checking authentication
    if (loading) {
      return <LoadingSpinner size="lg" message="Authenticating..." fullScreen />;
    }

    // If not authenticated, redirect to login
    if (!isAuthenticated) {
      // Save the current location so we can redirect back after login
      return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // If roles are required, check if user has the necessary role
    if (requiredRoles && !hasRole(requiredRoles)) {
      // Redirect to dashboard if authenticated but doesn't have the required role
      return <Navigate to="/dashboard" replace />;
    }

    // Render the wrapped component if authenticated and has the required role
    return <Component {...props} />;
  };

  // Update the display name for better debugging
  const displayName = Component.displayName || Component.name || 'Component';
  WithAuthComponent.displayName = `withAuth(${displayName})`;

  return WithAuthComponent;
};

export default withAuth;