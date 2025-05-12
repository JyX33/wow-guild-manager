/**
 * Database model types for Guild Rank entities
 */

/**
 * Database model for Guild Rank
 */
export interface DbGuildRank {
  id?: number;
  guild_id: number;
  rank_id: number;
  rank_name: string;
  is_custom: boolean;
  member_count: number;
  created_at?: string;
  updated_at?: string;
}