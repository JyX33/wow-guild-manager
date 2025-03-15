import React, { ReactNode } from 'react';
import { UserRole } from '../types';
import { useRequireAuth } from '../hooks/useRequireAuth';
import LoadingSpinner from './LoadingSpinner';

interface AuthProtectProps {
  children: ReactNode;
  requiredRoles?: UserRole | UserRole[];
  loadingFallback?: ReactNode;
}

/**
 * Component to protect routes that require authentication
 * 
 * @example
 * ```tsx
 * <AuthProtect>
 *   <Dashboard />
 * </AuthProtect>
 * 
 * // With role requirements
 * <AuthProtect requiredRoles="admin">
 *   <AdminPanel />
 * </AuthProtect>
 * ```
 */
export const AuthProtect: React.FC<AuthProtectProps> = ({
  children,
  requiredRoles,
  loadingFallback = <LoadingSpinner size="lg" message="Authenticating..." fullScreen />
}) => {
  const { loading, isAuthenticated } = useRequireAuth(requiredRoles);
  
  if (loading) {
    return <>{loadingFallback}</>;
  }
  
  // If authentication check failed, useRequireAuth will navigate away
  // Only render children if authenticated
  return isAuthenticated ? <>{children}</> : null;
};