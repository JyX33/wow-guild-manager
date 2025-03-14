import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { authApi } from '../services/api.service';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (region: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Use ref to track if user is authenticated for the interval
  const isAuthenticatedRef = useRef(false);
  
  // Update ref when user state changes
  useEffect(() => {
    isAuthenticatedRef.current = !!user;
  }, [user]);

  const refreshUser = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authApi.getCurrentUser();
      
      if (response.success && response.data) {
        setUser(response.data);
      } else {
        setUser(null);
        if (response.error) {
          setError(response.error.message);
        }
      }
    } catch (err) {
      setUser(null);
      setError('Failed to load user data');
      console.error('Error loading user:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Effect to load user data on initial mount only
  useEffect(() => {
    // Track whether we've already attempted to load user data
    let isMounted = true;
    let authAttemptMade = false;
    
    const loadUserOnce = async () => {
      if (authAttemptMade || !isMounted) return;
      
      authAttemptMade = true;
      try {
        setLoading(true);
        setError(null);
        
        const response = await authApi.getCurrentUser();
        
        if (isMounted) {
          if (response.success && response.data) {
            setUser(response.data);
          } else {
            // Don't show error for auth failures - this is expected when not logged in
            setUser(null);
            // Only set error for non-auth failures
            if (response.error && response.error.status !== 401) {
              setError(response.error.message);
            }
          }
        }
      } catch (err) {
        if (isMounted) {
          setUser(null);
          // Don't show error for auth failures in console either
          if (!(err instanceof Error && err.message.includes('401'))) {
            setError('Failed to load user data');
            console.error('Error loading user:', err);
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadUserOnce();
    
    return () => {
      isMounted = false;
    };
  }, []);
  
  // Separate effect for token refresh that doesn't depend on user state
  useEffect(() => {
    // Set up automatic token refresh using the ref to check authentication
    const tokenRefreshInterval = setInterval(async () => {
      if (isAuthenticatedRef.current) {
        try {
          await authApi.refreshToken();
        } catch (err) {
          console.error('Token refresh failed:', err);
          setUser(null);
        }
      }
    }, 15 * 60 * 1000); // Refresh every 15 minutes
    
    return () => clearInterval(tokenRefreshInterval);
  }, []);

  const login = async (region: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authApi.login(region);
      
      if (response.success && response.data) {
        window.location.href = response.data.authUrl;
      } else {
        setError(response.error?.message || 'Login failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Failed to initiate login');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authApi.logout();
      
      if (response.success) {
        setUser(null);
      } else {
        setError(response.error?.message || 'Logout failed');
      }
    } catch (err) {
      console.error('Logout error:', err);
      setError('Failed to logout');
    } finally {
      setLoading(false);
    }
  };
  
  // Check if user has any of the specified roles
  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    if (!user || !user.role) return false;
    
    const requiredRoles = Array.isArray(roles) ? roles : [roles];
    return requiredRoles.includes(user.role as UserRole);
  };

  return (
    <AuthContext.Provider 
      value={{
        user,
        loading,
        error,
        login,
        logout,
        isAuthenticated: !!user,
        hasRole,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};