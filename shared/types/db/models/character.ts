/**
 * Database model types for Character entities
 */

import { CharacterRole } from '../../enums/guild';

/**
 * Database model for Character
 */
export interface DbCharacter {
  id: number;
  user_id?: number | null; // Changed to nullable
  name: string;
  realm: string;
  class: string;
  level: number;
  role?: CharacterRole; // Changed to optional
  created_at?: string;
  updated_at?: string;
  bnet_character_id?: number; // Added by migration
  region?: string; // Added by migration
  toy_hash?: string | null; // ADDED - For unknown user grouping
  last_synced_at?: string | null; // Added by migration
  profile_json?: unknown | null; // Will be strictly typed in enhanced models
  equipment_json?: unknown | null; // Will be strictly typed in enhanced models
  mythic_profile_json?: unknown | null; // Will be strictly typed in enhanced models
  is_available?: boolean; // Added: Flag indicating if the character profile is accessible via Battle.net API
  professions_json?: unknown | null; // Will be strictly typed in enhanced models
}