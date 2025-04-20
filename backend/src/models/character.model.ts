import { CharacterRole } from '../../../shared/types/index.js'; // Removed BattleNetCharacter
import { BattleNetWoWAccount } from '../../../shared/types/user.js'; // Import the correct account type
import { Character, DbCharacter } from '../../../shared/types/guild.js';
import BaseModel from '../db/BaseModel.js';
import db from '../db/db.js';
import logger from '../utils/logger.js';
import { BattleNetRegion } from '../../../shared/types/user.js';
import { AppError } from '../utils/error-handler.js';
import { withTransaction } from '../utils/transaction.js';
import { log } from 'console';

// Helper function to parse region from URL (can be moved to a util file later)
const parseRegionFromHref = (href: string | undefined): BattleNetRegion | null => {
  if (!href) return null;
  try {
    const url = new URL(href);
    const hostnameParts = url.hostname.split('.'); // e.g., ['us', 'api', 'blizzard', 'com']
    const regionCode = hostnameParts[0];
    if (['us', 'eu', 'kr', 'tw', 'cn'].includes(regionCode)) {
      return regionCode as BattleNetRegion;
    }
  } catch (e) {
    // Invalid URL
    console.error(`[parseRegionFromHref] Error parsing URL: ${href}`, e);
  }
  return null;
};


export class CharacterModel extends BaseModel<DbCharacter> {
  constructor() {
    super('characters');
  }

  /**
   * Find characters by user ID (returns DB representation)
   */
  async findByUserId(userId: number): Promise<DbCharacter[]> {
    try {
      // Use findAll which returns DbCharacter[] based on BaseModel<DbCharacter>
      return await this.findAll({ user_id: userId });
    } catch (error) {
      throw new AppError(`Error finding characters by user ID: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }

  // REMOVED: getMainCharacter - Main character logic is now guild-specific and handled in guild_member.model
  // REMOVED: setMainCharacter - Main character logic is now guild-specific and handled in guild_member.model

  /**
   * Create a character
   */
  async createCharacter(characterData: Partial<DbCharacter>): Promise<DbCharacter> { // Use DbCharacter, remove setAsMain
    try {
      return await withTransaction(async (client) => {
        // REMOVED: Logic for setting/unsetting main character during creation

        // Use profile_json instead of character_data
        // Use profile_json if available in characterData, otherwise expect it in restData
        // REMOVED: is_main assignment
        const dataToInsert = {
          ...characterData, // Use characterData directly as it's Partial<DbCharacter>
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // Filter out undefined values before inserting
        const filteredData = Object.entries(dataToInsert).reduce((acc, [key, value]) => {
          if (value !== undefined) {
            acc[key] = value;
          }
          return acc;
        }, {} as Record<string, any>);


        // Insert the new character
        const keys = Object.keys(filteredData);
        const values = Object.values(filteredData);

        const columnNames = keys.join(', ');
        const valuePlaceholders = keys.map((_, index) => `$${index + 1}`).join(', ');

        const result = await client.query(
          `INSERT INTO ${this.tableName} (${columnNames}) VALUES (${valuePlaceholders}) RETURNING *`,
          values
        );

        return result.rows[0];
      });
    } catch (error) {
      throw new AppError(`Error creating character: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }

  /**
   * Update character with validation to ensure it belongs to the user
   */
  async updateCharacter(characterId: number, userId: number, data: Partial<DbCharacter>): Promise<DbCharacter | null> { // Use DbCharacter
    try {
      // Make sure this character belongs to the user
      const character = await this.findOne({ id: characterId, user_id: userId });

      if (!character) {
        throw new AppError('Character not found or doesn\'t belong to user', 404);
      }

      // Use profile_json instead of character_data
      // REMOVED: is_main handling from update
      const updateData = {
        ...data, // Use data directly as it's Partial<DbCharacter>
        updated_at: new Date().toISOString()
      };

       // Filter out undefined values before updating
       const filteredUpdateData = Object.entries(updateData).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, any>);


      return await this.update(characterId, filteredUpdateData);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Error updating character: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }

  /**
   * Delete character with validation to ensure it belongs to the user
   */
  async deleteUserCharacter(characterId: number, userId: number): Promise<boolean> {
    try {
      // Make sure this character belongs to the user
      const character = await this.findOne({ id: characterId, user_id: userId });

      if (!character) {
        throw new AppError('Character not found or doesn\'t belong to user', 404);
      }

      // Check if this character is referenced in any event subscriptions
      // TODO: Update this if event_subscriptions table changes
      // const subscriptionCheck = await db.query(
      //   'SELECT id FROM event_subscriptions WHERE character_id = $1 LIMIT 1',
      //   [characterId]
      // );

      // if (subscriptionCheck.rowCount > 0) {
      //   throw new AppError('Cannot delete character that is used in event subscriptions', 400);
      // }

      // If this was the main character and deletion is successful, set another character as main if available
      return await withTransaction(async (client) => {
        // REMOVED: Logic to handle setting a new main character upon deletion

        // Delete the character
        const result = await client.query(
          `DELETE FROM ${this.tableName} WHERE id = $1 RETURNING id`,
          [characterId]
        );

        const success = result.rowCount > 0;

        return success;
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Error deleting character: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }

  /**
   * Sync characters from Battle.net account data
   */
  async syncCharactersFromBattleNet(
    userId: number,
    wowAccounts: BattleNetWoWAccount[] // Use the imported type
    // Return added/updated counts and the IDs of processed characters
  ): Promise<{added: number, updated: number, total: number, processedIds: number[]}> {
    try {
      return await withTransaction(async (client) => {
        let added = 0;
        let updated = 0;
        const processedIds: number[] = []; // Array to store IDs of created/updated characters

        // Gather all characters from Battle.net
        const battleNetCharacters: Partial<DbCharacter>[] = []; // Use DbCharacter

        for (const account of wowAccounts) {
          for (const character of account.characters || []) {
            battleNetCharacters.push({
              user_id: userId,
              name: character.name,
              realm: character.realm.slug,
              class: character.playable_class?.name || 'Unknown',
              level: character.level || 1,
              role: this.determineDefaultRole(character.playable_class?.id),
              // Assign the summarized character object from the account profile here.
              // The full profile will be fetched and stored by the sync service later.
              profile_json: character as any, // Cast to any to bypass temporary type mismatch
              // is_main: false // REMOVED - Not stored here anymore
            });
          }
        }

        // Get existing characters for this user that match the incoming Battle.net characters
        // Extract unique name/realm pairs from battleNetCharacters
        const uniqueNameRealmPairs = Array.from(new Set(battleNetCharacters.map(char =>
          `${char.name?.toLowerCase() || ''}-${char.realm?.toLowerCase() || ''}`
        ))).map(pair => {
          const [name, realm] = pair.split('-');
          return { name, realm };
        });

        let existingCharsResult;
        const existingCharsMap = new Map<string, number>();

        if (uniqueNameRealmPairs.length > 0) {
          // Prepare values for the query: [[name1, realm1], [name2, realm2], ...]
          const queryValues = uniqueNameRealmPairs.map(key => [key.name, key.realm]);

          // Construct the WHERE clause using tuple comparison (PostgreSQL specific)
          const placeholders = queryValues.map((_, index) => `($${index * 2 + 2}, $${index * 2 + 3})`).join(', ');
          const flatValues = queryValues.flat(); // Flatten the array for query parameters

          const query = `
            SELECT id, name, realm
            FROM ${this.tableName}
            WHERE (lower(name), lower(realm)) IN (${placeholders})
          `;

          existingCharsResult = await client.query(query, [...flatValues]);

          existingCharsResult.rows.forEach((row: {id: number, name: string, realm: string}) => {
            existingCharsMap.set(`${row.name.toLowerCase()}-${row.realm.toLowerCase()}`, row.id);
          });
        } else {
           // If no characters from Battle.net, there are no existing characters to match
           existingCharsResult = { rows: [] };
        }

        logger.info(`Existing characters for user ${userId} matching Battle.net data:`, existingCharsResult.rows);
        logger.info(`Existing characters map for user ${userId}:`, existingCharsMap);


        // Process each character
        for (const character of battleNetCharacters) {
          const charKey = `${character.name?.toLowerCase() || ''}-${character.realm?.toLowerCase() || ''}`;
          const existingId = existingCharsMap.get(charKey);
          logger.info(`Processing character: ${character.name} (${character.realm}) - Existing ID: ${existingId}`);
          // --- Add Region Parsing Logic ---
          let region: BattleNetRegion = 'eu'; // Default to 'eu'
          const profileData = character.profile_json as any; // Cast for easier access
          // Check character.key.href first, then character.realm.key.href as potential sources
          const hrefToCheck = profileData?.key?.href || profileData?.realm?.key?.href;
          const parsedRegion = parseRegionFromHref(hrefToCheck);
          if (parsedRegion) {
            region = parsedRegion;
          }
          // --- End Region Parsing Logic ---

          if (existingId) {
            // Existing character found, update it
            // Prepare update data, ensuring only defined values are included
            const updateData: Partial<DbCharacter> = {
              user_id: userId, // Ensure user_id is included in update payload
              name: character.name,
              realm: character.realm,
              class: character.class,
              level: character.level,
              role: character.role,
              profile_json: character.profile_json,
              region: region, // Include region in update
              updated_at: new Date().toISOString() // Update timestamp
            };

            const filteredUpdateData = Object.entries(updateData).reduce((acc, [key, value]) => {
              if (value !== undefined) {
                acc[key] = value;
              }
              return acc;
            }, {} as Record<string, any>);

            const updateKeys = Object.keys(filteredUpdateData);
            const updateValues = Object.values(filteredUpdateData);
            const setClauses = updateKeys.map((key, index) => `${key} = $${index + 1}`).join(', ');

            if (updateKeys.length > 0) { // Only update if there's data to update
              await client.query(
                `UPDATE ${this.tableName} SET ${setClauses} WHERE id = $${updateKeys.length + 1}`,
                [...updateValues, existingId]
              );
            }
            processedIds.push(existingId); // Add existing ID to processed list
            updated++;
          } else {
            // Insert new character
            const insertResult = await client.query(
              `INSERT INTO ${this.tableName}
              (user_id, name, realm, class, level, role, profile_json, region, created_at, updated_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
              RETURNING id`, // Return the new ID
              [
                character.user_id,
                character.name,
                character.realm,
                character.class,
                character.level,
                character.role,
                character.profile_json,
                region
              ]
            );
            if (insertResult.rows.length > 0) {
              processedIds.push(insertResult.rows[0].id); // Add newly inserted ID
            }
            added++;
          }
        }

        // Return counts and the list of processed character IDs
        // Return counts: 'updated' is always 0 here, 'processedIds' only contains new character IDs.
        return { added, updated, total: battleNetCharacters.length, processedIds };
      });
    } catch (error) {
      throw new AppError(`Error syncing characters: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }

  /**
   * Determine default role based on specialization or class
   */
  private determineDefaultRole(classId?: number): CharacterRole {
    // If no class ID is provided, default to DPS
    if (!classId) return 'DPS';

    // Class-based default role assignment
    switch(classId) {
      // Classes that can ONLY be DPS
      case 3: // Hunter
      case 4: // Rogue
      case 8: // Mage
      case 9: // Warlock
        return 'DPS';

      // Classes with tanking specs - default to tank as it's less common
      case 1: // Warrior (Protection)
      case 2: // Paladin (Protection)
      case 6: // Death Knight (Blood)
      case 10: // Monk (Brewmaster)
      case 11: // Druid (Guardian)
      case 12: // Demon Hunter (Vengeance)
        return 'Tank';

      // Classes with healing specs - default to healer as it's less common
      case 5: // Priest (Holy, Discipline)
      case 7: // Shaman (Restoration)
      case 13: // Evoker (Preservation)
        return 'Healer';

      // Default for unknown classes
      default:
        return 'DPS';
    }
    // Note: Duplicate switch removed
  }

  /**
   * Get the highest level character for a user
   */
  async getHighestLevelCharacter(userId: number): Promise<Character | null> {
    try {
      const result = await db.query(
        `SELECT * FROM ${this.tableName}
        WHERE user_id = $1
        ORDER BY level DESC, updated_at DESC
        LIMIT 1`,
        [userId]
      );

      return result.rows[0] || null;
    } catch (error) {
      throw new AppError(`Error getting highest level character: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }

  /**
   * Find a character by name and realm
   */
  async findByNameRealm(name: string, realm: string): Promise<Character | null> {
    try {
      // Ensure case-insensitivity if DB collation isn't handling it
      const result = await db.query(
        `SELECT * FROM ${this.tableName} WHERE lower(name) = $1 AND lower(realm) = $2 LIMIT 1`,
        [name.toLowerCase(), realm.toLowerCase()]
      );
      return result.rows[0] || null;
      // Original findOne might be case-sensitive depending on DB setup
      // return await this.findOne({
      //   name: name, // Keep original case for findOne if needed
      //   realm: realm
      // });
    } catch (error) {
      throw new AppError(`Error finding character by name and realm: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }

  // REMOVED: findByGuildId - Guild relationship is now managed via guild_members table

  /**
   * Find multiple characters by their IDs.
   */
  async findByIds(ids: number[]): Promise<DbCharacter[]> {
    if (!ids || ids.length === 0) {
      return [];
    }
    try {
      // Use the underlying query builder from BaseModel or db directly
      const result = await db.query(
        `SELECT * FROM ${this.tableName} WHERE id = ANY($1::int[])`,
        [ids]
      );
      return result.rows;
    } catch (error) {
      throw new AppError(`Error finding characters by IDs: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }


  /**
   * Find multiple characters by their name and realm slugs.
   * @param keys An array of objects containing name and realm slug.
   * @returns A promise that resolves to an array of matching DbCharacter objects.
   */
  async findByMultipleNameRealm(keys: { name: string; realm: string }[]): Promise<DbCharacter[]> {
    if (!keys || keys.length === 0) {
      return [];
    }
    try {
      // Prepare values for the query: [[name1, realm1], [name2, realm2], ...]
      // Ensure case-insensitivity by converting to lowercase.
      const values = keys.map(key => [key.name.toLowerCase(), key.realm.toLowerCase()]);

      // Construct the WHERE clause using tuple comparison (PostgreSQL specific)
      // This is generally more efficient than multiple OR conditions.
      // We need to generate placeholders like ($1, $2), ($3, $4), ...
      const placeholders = values.map((_, index) => `($${index * 2 + 1}, $${index * 2 + 2})`).join(', ');
      const flatValues = values.flat(); // Flatten the array for query parameters

      const query = `
        SELECT *
        FROM ${this.tableName}
        WHERE (lower(name), lower(realm)) IN (${placeholders})
      `;

      const result = await db.query(query, flatValues);
      return result.rows;
    } catch (error) {
      throw new AppError(`Error finding characters by multiple name/realm: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }

  /**
   * Find characters that haven't been synced recently.
   */
  async findOutdatedCharacters(): Promise<DbCharacter[]> {
    try {
      // Read limit from environment variable, default to 50
      const syncLimitEnv = process.env.CHARACTER_SYNC_LIMIT;
      const limit = syncLimitEnv ? parseInt(syncLimitEnv, 10) : 50;
      // Validate parsed limit, ensure it's a positive number, otherwise default to 50
      const effectiveLimit = (!isNaN(limit) && limit > 0) ? limit : 50;

      const threshold = new Date(Date.now() - 8 * 60 * 60 * 1000); // 8 hours ago

      const result = await db.query(
        `SELECT * FROM ${this.tableName}
         WHERE (last_synced_at IS NULL OR last_synced_at < $1)
           AND (is_available IS NULL OR is_available = TRUE) -- Added: Only sync available characters
         ORDER BY last_synced_at ASC NULLS FIRST
         LIMIT $2`,
        [threshold.toISOString(), effectiveLimit] // Use the determined limit
      );
      return result.rows;
    } catch (error) {
      throw new AppError(`Error finding outdated characters: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }

 /**
  * Find characters by guild ID by joining with guild_members table.
  */
 async findAllByGuildId(guildId: number): Promise<DbCharacter[]> {
   try {
     const result = await db.query(
       `SELECT c.*
        FROM characters c
        JOIN guild_members gm ON c.id = gm.character_id
        WHERE gm.guild_id = $1`,
       [guildId]
     );
     return result.rows;
   } catch (error) {
     throw new AppError(`Error finding characters by guild ID: ${error instanceof Error ? error.message : String(error)}`, 500);
   }
 }
}

const characterModel = new CharacterModel();

export const findById = characterModel.findById.bind(characterModel);
export const findOne = characterModel.findOne.bind(characterModel);
export const findAll = characterModel.findAll.bind(characterModel);
export const create = characterModel.create.bind(characterModel);
export const update = characterModel.update.bind(characterModel);
export const findByUserId = characterModel.findByUserId.bind(characterModel);
// Removed exports for getMainCharacter and setMainCharacter as they are no longer part of this model
export const findByMultipleNameRealm = characterModel.findByMultipleNameRealm.bind(characterModel); // Added export

export const createCharacter = characterModel.createCharacter.bind(characterModel);
export const updateCharacter = characterModel.updateCharacter.bind(characterModel);
export const deleteUserCharacter = characterModel.deleteUserCharacter.bind(characterModel);
export const syncCharactersFromBattleNet = characterModel.syncCharactersFromBattleNet.bind(characterModel);
export const getHighestLevelCharacter = characterModel.getHighestLevelCharacter.bind(characterModel);
export const findByNameRealm = characterModel.findByNameRealm.bind(characterModel);
// Removed export for findByGuildId as it's no longer part of this model
export const findByIds = characterModel.findByIds.bind(characterModel);
export const findOutdatedCharacters = characterModel.findOutdatedCharacters.bind(characterModel); // Added export

export default characterModel;