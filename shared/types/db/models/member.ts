/**
 * Database model types for Guild Member entities
 */

/**
 * Database model for Guild Member
 */
export interface DbGuildMember {
  id: number;
  guild_id: number;
  character_id: number;
  rank: number;
  is_main?: boolean | null; // Is this the designated main for the user in this guild?
  character_name?: string; // Added by migration
  character_class?: string; // Added by migration
  member_data_json?: unknown | null; // Will be strictly typed in enhanced models
  created_at?: string;
  updated_at?: string;
  joined_at?: string | null; // Added for tracking join date
  left_at?: string | null; // Added for tracking leave date (nullable for soft delete)
  consecutive_update_failures?: number; // Added for tracking update failures
}