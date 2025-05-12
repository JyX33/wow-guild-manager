/**
 * User application model types
 */

import { UserRole, BattleNetRegion } from '../enums/user';
import { BattleNetUserProfile } from '../battlenet/profile';

/**
 * User model for application use
 */
export interface User {
  id: number;
  battle_net_id: string;
  battletag: string;
  token_expires_at?: string;
  created_at?: string;
  updated_at?: string;
  role?: UserRole;
  region?: BattleNetRegion;
  user_data?: BattleNetUserProfile | null;
  tokens_valid_since?: string; // Added for token revocation
  discord_id?: string | null;
  // Optionally add these if backend provides them:
  // discord_username?: string | null;
  // discord_avatar?: string | null;
}

/**
 * Extended user model with tokens (backend use only)
 */
export interface UserWithTokens extends User {
  access_token?: string;
  refresh_token?: string;
  // tokens_valid_since is inherited from User
}

/**
 * Auth context for React context API
 */
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