import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api.service';

interface User {
  id: number;
  battle_net_id: string;
  battletag: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (region: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const response = await authApi.getCurrentUser();
        setUser(response.data);
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (region: string) => {
    try {
      const response = await authApi.login(region);
      window.location.href = response.data.authUrl;
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
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