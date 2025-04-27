import db from '../db/db.js'; // Import the pg wrapper
import { Roster, RosterMember, RosterMemberAddition } from '../../../shared/types/api.js';
import { PoolClient } from 'pg'; // Import PoolClient for transactions

// Helper function to map database row keys (snake_case) to Roster object keys (camelCase)
const mapDbRowToRoster = (row: any): Roster => ({
  id: row.id,
  guildId: row.guild_id,
  name: row.name,
  createdAt: row.created_at.toISOString(), // Ensure ISO string format
  updatedAt: row.updated_at.toISOString(), // Ensure ISO string format
});

// Helper function to map database row to RosterMember object, robust against nulls/undefined/casing
const mapDbRowToRosterMember = (row: any): RosterMember => ({
  // Use bracket notation and provide default 0 if null/undefined/falsy after Number conversion
  characterId: Number(row["characterId"]) || 0,
  // Use bracket notation and provide default '' if null/undefined/falsy
  name: String(row["name"] || ''),
  // Use bracket notation and provide default '' if null/undefined/falsy
  rank: String(row["rank"] || ''),
  // Use bracket notation and provide default '' if null/undefined/falsy
  class: String(row["class"] || ''),
  // Use bracket notation, explicitly check for null/undefined, default to null
  role: (row["role"] !== null && row["role"] !== undefined) ? String(row["role"]) : null,
});


// --- Roster Functions ---

/**
 * Fetches all rosters for a specific guild.
 */
export const getGuildRosters = async (guildId: number): Promise<Roster[]> => {
  const query = 'SELECT * FROM rosters WHERE guild_id = $1 ORDER BY name ASC';
  const { rows } = await db.query(query, [guildId]);
  return rows.map(mapDbRowToRoster);
};

/**
 * Creates a new roster for a guild.
 */
export const createGuildRoster = async (guildId: number, name: string): Promise<Roster> => {
  const query = 'INSERT INTO rosters (guild_id, name) VALUES ($1, $2) RETURNING *';
  const { rows } = await db.query(query, [guildId, name]);
  if (rows.length === 0) {
    throw new Error('Failed to create roster, no rows returned.');
  }
  return mapDbRowToRoster(rows[0]);
};

/**
 * Fetches a single roster by its ID.
 */
export const getRosterById = async (rosterId: number): Promise<Roster | null> => {
  const query = 'SELECT * FROM rosters WHERE id = $1';
  const { rows } = await db.query(query, [rosterId]);
  return rows.length > 0 ? mapDbRowToRoster(rows[0]) : null;
};

/**
 * Updates a roster's name.
 */
export const updateRoster = async (rosterId: number, name: string): Promise<Roster | null> => {
  const query = 'UPDATE rosters SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING *';
  const { rows } = await db.query(query, [name, rosterId]);
  return rows.length > 0 ? mapDbRowToRoster(rows[0]) : null;
};

/**
 * Deletes a roster and its associated members.
 * Returns true if deletion was successful, false otherwise.
 */
export const deleteRoster = async (rosterId: number): Promise<boolean> => {
  let client: PoolClient | null = null;
  try {
    client = await db.getClient();
    await client.query('BEGIN');

    // First, delete members associated with the roster
    await client.query('DELETE FROM roster_members WHERE roster_id = $1', [rosterId]);

    // Then, delete the roster itself
    const deleteRosterResult = await client.query('DELETE FROM rosters WHERE id = $1', [rosterId]);

    await client.query('COMMIT');
    return (deleteRosterResult.rowCount ?? 0) > 0; // Handle null rowCount
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error('Error deleting roster:', error); // Use logger in real app
    throw error; // Re-throw the error after rollback
  } finally {
    if (client) {
      client.release();
    }
  }
};


// --- Roster Member Functions ---

/**
 * Fetches members for a specific roster, including character details.
 */
export const getRosterMembers = async (rosterId: number): Promise<RosterMember[]> => {
  // Fetch members directly from guild_members, joining characters and ranks
  const query = `
    SELECT
      rm.character_id as "characterId",
      c.name,
      c.class,
      gr.rank_name as rank,
      rm.role -- Get role from roster_members
    FROM roster_members rm
    JOIN characters c ON rm.character_id = c.id
    -- Join rosters to get the guild_id associated with this roster
    JOIN rosters r ON rm.roster_id = r.id
    -- Join guild_members using character_id AND the specific guild_id from the roster
    LEFT JOIN guild_members gm ON rm.character_id = gm.character_id AND r.guild_id = gm.guild_id
    -- Join guild_ranks using the rank identifier from guild_members and the correct guild_id
    LEFT JOIN guild_ranks gr ON gm.rank = gr.rank_id AND gm.guild_id = gr.guild_id
    WHERE rm.roster_id = $1 -- Filter by the actual roster_id passed to the function
    ORDER BY c.name ASC;
  `;
  const { rows } = await db.query(query, [rosterId]);
  // Use the robust mapping helper function
  return rows.map(mapDbRowToRosterMember);
};

/**
 * Adds members to a roster, handling both character and rank additions.
 * Prevents duplicates and returns the updated list of members.
 */
export const addRosterMembers = async (rosterId: number, additions: RosterMemberAddition[], guildId: number): Promise<RosterMember[]> => {
  // --- Logging Start ---
  console.log(`[RosterService.addRosterMembers] Entered function for roster ${rosterId}, guild ${guildId}`);
  // --- Logging End ---
  let client: PoolClient | null = null;
  try {
    client = await db.getClient();
    // --- Logging Start ---
    console.log(`[RosterService.addRosterMembers] Acquired DB client for roster ${rosterId}`);
    // --- Logging End ---
    await client.query('BEGIN');
    // --- Logging Start ---
    console.log(`[RosterService.addRosterMembers] Transaction BEGIN successful for roster ${rosterId}`);
    // --- Logging End ---

    const membersToAdd: { character_id: number; role: string | null }[] = [];

    // 1. Verify rosterId belongs to the provided guildId
    const rosterCheckResult = await client.query('SELECT guild_id FROM rosters WHERE id = $1', [rosterId]);
    if (rosterCheckResult.rowCount === 0) {
      throw new Error(`Roster with ID ${rosterId} not found.`);
    }
    const actualGuildId = rosterCheckResult.rows[0].guild_id;
    if (actualGuildId !== guildId) {
      throw new Error(`Roster ${rosterId} belongs to guild ${actualGuildId}, but operation attempted with guild ${guildId}.`);
    }

    // 2. Fetch existing member IDs for duplicate check
    const existingMembersResult = await client.query('SELECT character_id FROM roster_members WHERE roster_id = $1', [rosterId]);
    const existingMemberIds = new Set(existingMembersResult.rows.map(r => r.character_id));

    // 3. Process additions
    for (const addition of additions) {
      const role = addition.role !== undefined ? addition.role : null;

      if (addition.type === 'character') {
        // Check if character exists in the guild and is not already in the roster
        const charResult = await client.query(`
          SELECT c.id
          FROM characters c
          JOIN guild_members gm ON c.id = gm.character_id
          WHERE c.id = $1 AND gm.guild_id = $2
        `, [addition.characterId, guildId]);
        if ((charResult.rowCount ?? 0) > 0 && !existingMemberIds.has(addition.characterId)) { // Handle null rowCount
          membersToAdd.push({ character_id: addition.characterId, role });
          existingMemberIds.add(addition.characterId); // Add to set to prevent duplicates within the same batch
        } else if (!existingMemberIds.has(addition.characterId)) {
           // Log if character exists but validation failed (not in guild_members or wrong guildId used)
           console.warn(`Character ID ${addition.characterId} is valid but not found in guild ${guildId} members list or already exists in roster.`);
        }
      } else if (addition.type === 'rank') {
        // Find character IDs belonging to the specified rank within the guild
        // Ensure rankId is treated as integer if it comes from guild_ranks.rank_id
        const rankCharsResult = await client.query('SELECT character_id FROM guild_members WHERE rank = $1 AND guild_id = $2', [addition.rankId, guildId]);
        rankCharsResult.rows.forEach(memberRow => {
          // Ensure the character_id exists before adding
          if (memberRow.character_id && !existingMemberIds.has(memberRow.character_id)) {
            membersToAdd.push({ character_id: memberRow.character_id, role });
            existingMemberIds.add(memberRow.character_id); // Add to set
          }
        });
      }
    }

    // 4. Insert unique new members if any
    if (membersToAdd.length > 0) {
      // --- Logging Start ---
      console.log(`[RosterService.addRosterMembers] Attempting to insert ${membersToAdd.length} members for roster ${rosterId}:`, membersToAdd);
      // --- Logging End ---
      // Build multi-row insert query
      const valuesPlaceholders = membersToAdd.map((_, index) => `($1, $${index * 2 + 2}, $${index * 2 + 3})`).join(',');
      const valuesParams = membersToAdd.flatMap(member => [member.character_id, member.role]);
      const insertQuery = `INSERT INTO roster_members (roster_id, character_id, role) VALUES ${valuesPlaceholders}`;

      const insertResult = await client.query(insertQuery, [rosterId, ...valuesParams]);
      // --- Logging Start ---
      console.log(`[RosterService.addRosterMembers] Insert result rowCount for roster ${rosterId}:`, insertResult.rowCount);
      // --- Logging End ---
    }

    await client.query('COMMIT');

  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error('Error adding roster members:', error);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }

  // Return the updated full list of members
  return getRosterMembers(rosterId);
};

/**
 * Updates the role of a specific member within a roster.
 * Returns the updated member details or null if not found.
 */
export const updateRosterMemberRole = async (rosterId: number, characterId: number, role: string | null): Promise<RosterMember | null> => {
  const updateQuery = 'UPDATE roster_members SET role = $1 WHERE roster_id = $2 AND character_id = $3';
  const updateResult = await db.query(updateQuery, [role, rosterId, characterId]);

  if ((updateResult.rowCount ?? 0) > 0) { // Handle null rowCount
    // Fetch the updated member details to return
    const selectQuery = `
      SELECT
        rm.character_id as "characterId",
        c.name,
        c.class,
        gr.name as rank,
        rm.role
      FROM roster_members rm
      JOIN characters c ON rm.character_id = c.id
      LEFT JOIN guild_ranks gr ON c.rank_id = gr.id
      WHERE rm.roster_id = $1 AND rm.character_id = $2;
    `;
    const { rows } = await db.query(selectQuery, [rosterId, characterId]);
    return rows.length > 0 ? mapDbRowToRosterMember(rows[0]) : null; // Use helper here too
  }

  return null;
};

/**
 * Removes a specific member from a roster.
 * Returns true if removal was successful, false otherwise.
 */
export const removeRosterMember = async (rosterId: number, characterId: number): Promise<boolean> => {
  const query = 'DELETE FROM roster_members WHERE roster_id = $1 AND character_id = $2';
  const result = await db.query(query, [rosterId, characterId]);
  return (result.rowCount ?? 0) > 0; // Handle null rowCount
};
