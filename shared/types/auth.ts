import { User, UserRole } from './user';

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (region: string, syncCharacters: boolean) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
  refreshUser: () => Promise<void>;
}