import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { authService } from '../services/api';
import { User, UserRole } from '../../../shared/types/user';
import { AuthContextType, RefreshResponse } from '../../../shared/types/auth';
import { ApiResponse } from '../services/api/core';

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
      const response = await authService.getCurrentUser();
      
      if (response.success && response.data) {
        // Include the role from the API response
        setUser({ ...response.data, role: response.data.role });
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

  // Effect to load user data on initial mount using stored tokens
  useEffect(() => {
    const loadUserFromTokens = async () => {
      setLoading(true);
      setError(null);

      const accessToken = localStorage.getItem('accessToken');
      // const refreshToken = localStorage.getItem('refreshToken'); // Refresh token not needed for initial user load

      if (accessToken) {
        try {
          // Attempt to fetch user data using the stored access token
          const response = await authService.getCurrentUser();

          if (response.success && response.data) {
            // Include the role from the API response
            setUser({ ...response.data, role: response.data.role });
          } else {
            // If fetching user fails (e.g., token expired), clear tokens
            console.error('Failed to fetch user with stored token:', response.error);
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            setUser(null);
          }
        } catch (err) {
          console.error('Error fetching user with stored token:', err);
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          setUser(null);
          // Optionally set an error if it's not a 401
          // if (!(err instanceof Error && err.message.includes('401'))) {
          //   setError('Failed to load user data');
          // }
        } finally {
          setLoading(false);
        }
      } else {
        // No access token found, user is not authenticated
        setUser(null);
        setLoading(false);
      }
    };

    loadUserFromTokens();
  }, []); // Empty dependency array means this runs once on mount

  // Separate effect for token refresh
  useEffect(() => {
    const tokenRefreshInterval = setInterval(async () => {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          // Call refresh token endpoint
          const response: ApiResponse<RefreshResponse> = await authService.refreshToken();
          if (response.success && response.data?.accessToken && response.data?.refreshToken) {
            // Store new tokens
            localStorage.setItem('accessToken', response.data.accessToken);
            localStorage.setItem('refreshToken', response.data.refreshToken);
            // Optionally refresh user data after successful token refresh
            // refreshUser();
          } else {
             console.error('Token refresh failed:', response.error);
             // If refresh fails, clear tokens and user
             localStorage.removeItem('accessToken');
             localStorage.removeItem('refreshToken');
             setUser(null);
          }
        } catch (err) {
          console.error('Token refresh failed:', err);
          // If refresh fails, clear tokens and user
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          setUser(null);
        }
      } else {
        // No refresh token, clear access token and user
        localStorage.removeItem('accessToken');
        setUser(null);
      }
    }, 15 * 60 * 1000); // Refresh every 15 minutes

    return () => clearInterval(tokenRefreshInterval);
  }, []); // Empty dependency array means this runs once on mount

  const login = async (region: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await authService.login(region);

      if (response.success && response.data) {
        // Backend redirects to /auth/callback with tokens in fragment
        globalThis.location.href = response.data.authUrl;
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
      // Call backend logout endpoint (optional, depends on backend implementation)
      // await authService.logout(); // Assuming backend logout clears server-side session/refresh token

      // Clear tokens from local storage
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');

      // Clear user state
      setUser(null);

      // Optionally redirect to login page
      // navigate('/login'); // If using navigate, make sure it's available here

    } catch (err) {
      console.error('Logout error:', err);
      // Even if backend logout fails, clear frontend state for security
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
      setError('Failed to logout'); // Still show error for user feedback
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
