/**
 * API types for roster management
 */

/**
 * Represents a roster within a guild.
 */
export interface Roster {
  id: number;          // Unique identifier for the roster
  guildId: number;     // Identifier of the guild this roster belongs to
  name: string;        // User-defined name for the roster (e.g., "Mythic Raid Team", "PvP Group Alpha")
  createdAt: string;   // ISO 8601 date string when the roster was created
  updatedAt: string;   // ISO 8601 date string when the roster was last updated
}

/**
 * Represents a member within a specific roster, including relevant character details.
 * This is typically the structure returned by API endpoints fetching roster members.
 */
export interface RosterMember {
  characterId: number; // Unique identifier for the character
  name: string;        // Character's name
  rank: string;        // Character's current guild rank name
  class: string;       // Character's class (e.g., 'Warrior', 'Mage', 'Priest')
  role: string | null; // Role assigned specifically for this roster (e.g., 'Tank', 'Healer', 'DPS', 'Bench'), or null if unassigned.
}

/**
 * Union type defining the ways members can be specified for addition to a roster via the API.
 */
export type RosterMemberAddition =
  | { type: 'character'; characterId: number; role?: string | null } // Add a single character by their ID
  | { type: 'rank'; rankId: number; role?: string | null };          // Add all characters belonging to a specific guild rank ID