/**
 * Guild application model types
 */

import { BattleNetGuild } from '../battlenet/guild';
import { CharacterRole } from '../enums/guild';
import { Character } from './character';
import { BattleNetMythicKeystoneProfile, BattleNetCharacter } from '../battlenet/character';
import { KeyReference } from '../battlenet/common';
import { PlayableClass } from '../battlenet/common';

/**
 * Guild model for application use
 */
export interface Guild {
  id: number;
  name: string;
  realm: string;
  region: string;
  last_updated?: string | null; // Allow null
  last_synced_at?: string | null; // Added by migration
  guild_data_json?: BattleNetGuild | null; // Renamed property
  leader_id?: number | null; // Allow null
  is_guild_master?: boolean;
}

/**
 * Guild member model for application use
 */
export interface GuildMember {
  id?: number; // Made optional as it's not always available (e.g., from roster_json)
  guild_id: number;
  character_id?: number; // Link back to character table
  character_name: string;
  character_class: string;
  character_role?: CharacterRole; // Changed to optional
  rank: number;
  isMain?: boolean | null; // Is this the designated main for the user in this guild?
  user_id?: number;
  battletag?: string;
}

/**
 * Guild rank model for application use
 */
export interface GuildRank {
  id?: number;
  guild_id?: number;
  rank_id: number;
  rank_name: string;
  is_custom?: boolean;
  member_count?: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Enhanced guild member with character details for UI display
 */
export interface EnhancedGuildMember extends GuildMember {
  character: Character & {
    itemLevel: number;
    mythicKeystone: BattleNetMythicKeystoneProfile | null; // Make nullable
    activeSpec: PlayableClass | null; // Make nullable
    professions: Array<{
      profession: {
        key: KeyReference;
        name: string;
        id: number;
      };
      skill_points: number;
      max_skill_points: number;
      specializations: Array<{
        specialization_id: number;
        name: string;
        points_spent: number;
      }>;
      tiers: Array<{
        tier_id: number;
        known_recipes: Array<{
          key: KeyReference;
          name: string;
          id: number;
        }>;
      }>;
    }>;
  };
}

/**
 * Guild member with classification details for frontend use
 */
export interface ClassifiedMember {
  // Fields from DbGuildMember needed by frontend
  id: number;
  guild_id: number;
  character_id: number;
  rank: number;
  is_main?: boolean | null; // Explicit main flag
  character_name?: string;
  character_class?: string;
  member_data_json?: any; // Maybe useful for some display? Optional.

  // Fields from DbCharacter needed by frontend
  character: {
    id: number;
    user_id?: number | null;
    name: string;
    realm: string;
    class: string;
    level: number;
    role?: CharacterRole;
    region?: string;
    // Include relevant profile/equipment details if needed for display
    profile_json?: BattleNetCharacter; // Optional, might be large
    equipment_json?: any; // Optional
    mythic_profile_json?: BattleNetMythicKeystoneProfile | null; // Added
    professions_json?: any; // Added
  }

  // Classification details
  classification: 'Main' | 'Alt';
  groupKey: string | number | null; // user_id or toy_hash or null
  mainCharacterId: number | null; // Link to main character if this is an alt
}

/**
 * Recent guild member activity
 */
export interface GuildMemberActivity {
  newMembers: any[]; // Or a more specific type if needed for frontend
  leftMembers: any[]; // Or a more specific type if needed for frontend
}