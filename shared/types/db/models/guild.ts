/**
 * Database model types for Guild entities
 */

/**
 * Database model for Guild
 */
export interface DbGuild {
  id: number;
  name: string;
  realm: string;
  region: string;
  leader_id?: number | null; // Allow null for leader_id
  last_updated?: string | null; // Allow null
  last_roster_sync?: string | null; // Allow null - Added by migration 20240325161500
  bnet_guild_id?: number; // Added by new migration
  member_count?: number; // Added for direct access
  guild_data_json?: unknown | null; // Will be strictly typed in enhanced models
  roster_json?: unknown | null; // Will be strictly typed in enhanced models
  exclude_from_sync?: boolean; // Permanently exclude guilds from sync
}