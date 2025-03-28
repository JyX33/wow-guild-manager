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


/**
 * Represents the response from Battle.net token endpoints.
 */
export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string; // Optional for client_credentials
  scope: string;
}
