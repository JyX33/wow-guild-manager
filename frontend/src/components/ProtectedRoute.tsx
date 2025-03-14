import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: UserRole | UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRoles }) => {
  const { user, loading, hasRole, isAuthenticated } = useAuth();
  
  if (loading) {
    // Show loading state while checking authentication
    return <div>Loading...</div>;
  }
  
  if (!isAuthenticated) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" replace />;
  }
  
  // If roles are required, check if user has necessary role
  if (requiredRoles && !hasRole(requiredRoles)) {
    // Redirect to dashboard if authenticated but doesn't have required role
    return <Navigate to="/dashboard" replace />;
  }
  
  // Render children if authenticated and has required role (if specified)
  return <>{children}</>;
};

export default ProtectedRoute;