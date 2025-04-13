export enum UserRole {
  USER = 'user',
  GUILD_LEADER = 'guild_leader',
  ADMIN = 'admin'
}

export type BattleNetRegion = 'eu' | 'us' | 'kr' | 'tw' | 'cn'; // Added 'cn'

/**
 * Battle.net API Types
 * These types correspond exactly to the responses from Battle.net API
 */

export interface BattleNetUserProfile {
  id: string;
  battletag: string;
  sub: string;
  [key: string]: any; // For any additional fields returned by Battle.net API
}

export interface BattleNetRealmReference {
  slug: string;
  name: string;
  id?: number;
  key?: {
    href: string;
  };
}

export interface BattleNetCharacter {
  name: string;
  id: number;
  realm: BattleNetRealmReference;
  level?: number;
  playable_class?: {
    id: number;
    name: string;
    key?: {
      href: string;
    };
  };
  playable_race?: {
    id: number;
    name: string;
    key?: {
      href: string;
    };
  };
  guild?: {
    name: string;
    id?: number;
    realm: BattleNetRealmReference;
  };
}

export interface BattleNetGuildMember {
  character: BattleNetCharacter;
  rank: number;
}

export interface BattleNetGuildRoster {
  _links: {
    self: {
      href: string;
    };
  };
  guild: {
    key: {
      href: string;
    };
    name: string;
    id: number;
    realm: BattleNetRealmReference;
    faction: {
      type: string;
      name: string;
    };
  };
  members: BattleNetGuildMember[];
}

export interface BattleNetWoWAccount {
  characters: BattleNetCharacter[];
}

export interface BattleNetWoWProfile {
  _links: {
    self: {
      href: string;
    };
  };
  id: number;
  wow_accounts: BattleNetWoWAccount[];
  collections?: {
    href: string;
  };
}

/**
 * Database Model Types
 * These types correspond to how data is stored in the database
 */

export interface DbUser {
  id: number;
  bnet_id: string; // Match database schema
  battletag: string;
  access_token?: string;
  refresh_token?: string;
  tokens_valid_since?: string; // Added for token revocation
  token_expires_at?: string;
  created_at?: string;
  updated_at?: string;
  last_synced_at?: string;
  role?: UserRole;
  region?: BattleNetRegion;
  user_data?: BattleNetUserProfile;
}

/**
 * Application Types
 * These types are used in the application logic and frontend
 */

export interface User {
  id: number;
  bnet_id: string; // Match database schema
  battletag: string;
  token_expires_at?: string;
  created_at?: string;
  updated_at?: string;
  last_synced_at?: string;
  role?: UserRole;
  region?: BattleNetRegion;
  user_data?: BattleNetUserProfile;
  tokens_valid_since?: string; // Added for token revocation
}

// For backend use only - not exported directly in index.ts
export interface UserWithTokens extends User {
  access_token?: string;
  refresh_token?: string;
  // tokens_valid_since is inherited from User
}