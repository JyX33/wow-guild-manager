export enum UserRole {
  USER = 'user',
  GUILD_LEADER = 'guild_leader',
  ADMIN = 'admin'
}

export type BattleNetRegion = 'eu' | 'us' | 'kr' | 'tw';

export interface User {
  id: number;
  battle_net_id: string;
  battletag: string;
  token_expires_at?: string;
  created_at?: string;
  updated_at?: string;
  last_synced_at?: string;
  role?: UserRole;
  region?: BattleNetRegion;
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

export interface BattleNetCharacter {
  name: string;
  id: number;
  realm: {
    slug: string;
    name: string;
  };
  guild?: {
    name: string;
    realm: {
      slug: string;
      name: string;
    };
  };
}

export interface BattleNetGuildMember {
  character: BattleNetCharacter;
  rank: number;
}

export interface BattleNetGuildRoster {
  members: BattleNetGuildMember[];
}

export interface BattleNetWoWProfile {
  wow_accounts: Array<{
    characters: BattleNetCharacter[];
  }>;
}