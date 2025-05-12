/**
 * Database model types for User entities
 */

import { UserRole, BattleNetRegion } from '../../enums/user';

/**
 * Database model for User
 */
export interface DbUser {
  id: number;
  battle_net_id: string;
  battletag: string;
  access_token?: string;
  refresh_token?: string;
  tokens_valid_since?: string; // Added for token revocation
  token_expires_at?: string;
  created_at?: string;
  updated_at?: string;
  role?: UserRole;
  region?: BattleNetRegion;
  user_data?: unknown | null; // Will be strictly typed in enhanced models
  discord_id?: string | null;
  discord_username?: string | null;
}