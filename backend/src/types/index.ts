// Type definitions for the WoW Guild Manager application

export enum UserRole {
  USER = 'user',
  GUILD_LEADER = 'guild_leader',
  ADMIN = 'admin'
}

export interface User {
  id: number;
  battle_net_id: string;
  battletag: string;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: Date;
  created_at?: Date;
  updated_at?: Date;
  user_data?: BattleNetUserProfile;
  role?: UserRole;
}

export interface BattleNetUserProfile {
  id: string;
  battletag: string;
  sub: string;
  [key: string]: any; // For any additional fields returned by Battle.net API
}

export interface Guild {
  id: number;
  name: string;
  realm: string;
  region: string;
  last_updated?: Date;
  guild_data?: any; // This will be replaced with a proper type in the future
}

export interface Event {
  id: number;
  title: string;
  description: string;
  event_type: 'Raid' | 'Dungeon' | 'Special';
  start_time: Date | string;
  end_time: Date | string;
  created_by: number;
  guild_id: number;
  max_participants: number;
  event_details?: any; // This will be replaced with a proper type in the future
}

export interface EventSubscription {
  id: number;
  event_id: number;
  user_id: number;
  status: 'Confirmed' | 'Tentative' | 'Declined';
  character_name: string;
  character_class: string;
  character_role: 'Tank' | 'Healer' | 'DPS';
  created_at?: Date;
  battletag?: string;
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: ApiError;
}

export interface ApiError {
  status: number;
  message: string;
  details?: any;
}

// Config types
export interface DatabaseConfig {
  host: string;
  port: number;
  name: string;
  user: string;
  password: string;
}

export interface ServerConfig {
  port: number;
  nodeEnv: string;
  frontendUrl: string;
}

export interface AuthConfig {
  jwtSecret: string;
  jwtRefreshSecret: string;
  jwtExpiresIn: string;
  jwtRefreshExpiresIn: string;
  cookieMaxAge: number;
  refreshCookieMaxAge: number;
}

export interface BattleNetRegionConfig {
  authBaseUrl: string;
  apiBaseUrl: string;
}

export interface BattleNetConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  regions: {
    eu: BattleNetRegionConfig;
    us: BattleNetRegionConfig;
    kr: BattleNetRegionConfig;
    tw: BattleNetRegionConfig;
  };
}

export interface AppConfig {
  server: ServerConfig;
  database: DatabaseConfig;
  auth: AuthConfig;
  battlenet: BattleNetConfig;
}