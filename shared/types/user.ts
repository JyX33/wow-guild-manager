export enum UserRole {
  USER = 'user',
  GUILD_LEADER = 'guild_leader',
  ADMIN = 'admin'
}

export interface User {
  id: number;
  battle_net_id: string;
  battletag: string;
  token_expires_at?: string;
  created_at?: string;
  updated_at?: string;
  role?: UserRole;
  user_data?: BattleNetUserProfile;
}

// For backend use only - not exported directly in index.ts
export interface UserWithTokens extends User {
  access_token?: string;
  refresh_token?: string;
}

export interface BattleNetUserProfile {
  id: string;
  battletag: string;
  sub: string;
  [key: string]: any; // For any additional fields returned by Battle.net API
}