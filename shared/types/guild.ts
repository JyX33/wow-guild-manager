// Character roles and classes
export type CharacterRole = 'Tank' | 'Healer' | 'DPS';

export interface Guild {
  id: number;
  name: string;
  realm: string;
  region: string;
  last_updated?: string;
  guild_data?: {
    level?: number;
    faction?: string;
    achievement_points?: number;
    member_count?: number;
    created_timestamp?: string;
    [key: string]: any; // For additional Battle.net API fields
  };
}

export interface GuildMember {
  id: number;
  guild_id: number;
  character_name: string;
  character_class: string;
  character_role: CharacterRole;
  rank: number;
  user_id?: number;
  battletag?: string;
}

export interface Character {
  id: number;
  user_id: number;
  name: string;
  realm: string;
  class: string;
  level: number;
  role: CharacterRole;
  is_main: boolean;
  created_at?: string;
  updated_at?: string;
  guild_id?: number;
  character_data?: {
    achievement_points?: number;
    equipped_item_level?: number;
    active_spec?: string;
    last_login_timestamp?: string;
    [key: string]: any; // For additional Battle.net API fields
  };
}