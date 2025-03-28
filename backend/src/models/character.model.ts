import { CharacterRole } from '../../../shared/types'; // Removed BattleNetCharacter
import { BattleNetWoWAccount } from '../../../shared/types/user'; // Import the correct account type
import { Character, DbCharacter } from '../../../shared/types/guild';
import BaseModel from '../db/BaseModel';
import db from '../db/db';
import { AppError } from '../utils/error-handler';
import { withTransaction } from '../utils/transaction';

class CharacterModel extends BaseModel<DbCharacter> {
  constructor() {
    super('characters');
  }

  /**
   * Find characters by user ID
   */
  async findByUserId(userId: number): Promise<Character[]> {
    try {
      return await this.findAll({ user_id: userId });
    } catch (error) {
      throw new AppError(`Error finding characters by user ID: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }

  /**
   * Get main character for a user
   */
  async getMainCharacter(userId: number): Promise<Character | null> {
    try {
      return await this.findOne({ user_id: userId, is_main: true });
    } catch (error) {
      throw new AppError(`Error finding main character: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }

  /**
   * Set a character as the main character for a user
   * This will unset any existing main character for the user
   */
  async setMainCharacter(characterId: number, userId: number): Promise<Character> {
    try {
      return await withTransaction(async (client) => {
        // First, unset any existing main character for this user
        await client.query(
          `UPDATE ${this.tableName} SET is_main = false, updated_at = NOW() WHERE user_id = $1`,
          [userId]
        );

        // Then, set the new main character
        const result = await client.query(
          `UPDATE ${this.tableName} SET is_main = true, updated_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *`,
          [characterId, userId]
        );

        if (result.rowCount === 0) {
          throw new AppError(`Character not found or doesn't belong to user`, 404);
        }

        return result.rows[0];
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Error setting main character: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }

  /**
   * Create a character with the option to set it as main
   */
  async createCharacter(characterData: Partial<Character>, setAsMain: boolean = false): Promise<Character> {
    try {
      return await withTransaction(async (client) => {
        // If this is the main character, unset any existing main character
        if (setAsMain && characterData.user_id) {
          await client.query(
            `UPDATE ${this.tableName} SET is_main = false, updated_at = NOW() WHERE user_id = $1`,
            [characterData.user_id]
          );
        }

        // Use profile_json instead of character_data
        const { character_data, ...restData } = characterData;
        const dataToInsert = {
          ...restData,
          profile_json: character_data, // Assign to the new JSONB field
          is_main: setAsMain,
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
  async updateCharacter(characterId: number, userId: number, data: Partial<Character>): Promise<Character | null> {
    try {
      // Make sure this character belongs to the user
      const character = await this.findOne({ id: characterId, user_id: userId });

      if (!character) {
        throw new AppError('Character not found or doesn\'t belong to user', 404);
      }

      // Use profile_json instead of character_data
      const { character_data, ...restData } = data;
      const updateData = {
        ...restData,
        profile_json: character_data, // Assign to the new JSONB field if present
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
        const wasMain = character.is_main;

        // Delete the character
        const result = await client.query(
          `DELETE FROM ${this.tableName} WHERE id = $1 RETURNING id`,
          [characterId]
        );

        const success = result.rowCount > 0;

        if (success && wasMain) {
          // Find another character to set as main
          const anotherCharacter = await client.query(
            `SELECT id FROM ${this.tableName} WHERE user_id = $1 LIMIT 1`,
            [userId]
          );

          if (anotherCharacter.rowCount > 0) {
            await client.query(
              `UPDATE ${this.tableName} SET is_main = true, updated_at = NOW() WHERE id = $1`,
              [anotherCharacter.rows[0].id]
            );
          }
        }

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
  ): Promise<{added: number, updated: number, total: number}> {
    try {
      return await withTransaction(async (client) => {
        let added = 0;
        let updated = 0;

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
              is_main: false
            });
          }
        }

        // Get existing characters for this user
        const existingCharsResult = await client.query(
          `SELECT id, name, realm FROM ${this.tableName} WHERE user_id = $1`,
          [userId]
        );

        const existingCharsMap = new Map<string, number>();
        existingCharsResult.rows.forEach((row: {id: number, name: string, realm: string}) => {
          existingCharsMap.set(`${row.name.toLowerCase()}-${row.realm.toLowerCase()}`, row.id);
        });


        // Process each character
        for (const character of battleNetCharacters) {
          const charKey = `${character.name?.toLowerCase() || ''}-${character.realm?.toLowerCase() || ''}`;
          const existingId = existingCharsMap.get(charKey);

          if (existingId) {
            // Update existing character
            await client.query(
              `UPDATE ${this.tableName}
              SET level = $1,
                  profile_json = $2,
                  class = $3,
                  role = $4,
                  updated_at = NOW()
              WHERE id = $5`,
              [
                character.level,
                character.profile_json, // Use profile_json
                character.class,
                character.role,
                existingId
              ]
            );
            updated++;
          } else {
            // Insert new character
            await client.query(
              `INSERT INTO ${this.tableName}
              (user_id, name, realm, class, level, role, is_main, profile_json, created_at, updated_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
              [
                character.user_id,
                character.name,
                character.realm,
                character.class,
                character.level,
                character.role,
                false, // Not set as main automatically
                character.profile_json // Use profile_json
              ]
            );
            added++;
          }
        }

        return { added, updated, total: battleNetCharacters.length };
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

  /**
   * Get characters for a specific guild
   */
  async findByGuildId(guildId: number): Promise<Character[]> {
    try {
      return await this.findAll({ guild_id: guildId });
    } catch (error) {
      throw new AppError(`Error finding characters by guild ID: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }

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
  async findOutdatedCharacters(limit: number = 50): Promise<DbCharacter[]> {
    try {
      const threshold = new Date();
      // Set threshold (e.g., 1 day ago)
      threshold.setDate(threshold.getDate() - 1);

      const result = await db.query(
        `SELECT * FROM ${this.tableName}
         WHERE last_synced_at IS NULL OR last_synced_at < $1
         ORDER BY last_synced_at ASC NULLS FIRST
         LIMIT $2`,
        [threshold.toISOString(), limit]
      );
      return result.rows;
    } catch (error) {
      throw new AppError(`Error finding outdated characters: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
  // Closing brace for CharacterModel class
}

const characterModel = new CharacterModel();

export const findById = characterModel.findById.bind(characterModel);
export const findOne = characterModel.findOne.bind(characterModel);
export const findAll = characterModel.findAll.bind(characterModel);
export const create = characterModel.create.bind(characterModel);
export const update = characterModel.update.bind(characterModel);
export const findByUserId = characterModel.findByUserId.bind(characterModel);
export const getMainCharacter = characterModel.getMainCharacter.bind(characterModel);
export const setMainCharacter = characterModel.setMainCharacter.bind(characterModel);
export const findByMultipleNameRealm = characterModel.findByMultipleNameRealm.bind(characterModel); // Added export

export const createCharacter = characterModel.createCharacter.bind(characterModel);
export const updateCharacter = characterModel.updateCharacter.bind(characterModel);
export const deleteUserCharacter = characterModel.deleteUserCharacter.bind(characterModel);
export const syncCharactersFromBattleNet = characterModel.syncCharactersFromBattleNet.bind(characterModel);
export const getHighestLevelCharacter = characterModel.getHighestLevelCharacter.bind(characterModel);
export const findByNameRealm = characterModel.findByNameRealm.bind(characterModel);
export const findByGuildId = characterModel.findByGuildId.bind(characterModel);
export const findByIds = characterModel.findByIds.bind(characterModel);
export const findOutdatedCharacters = characterModel.findOutdatedCharacters.bind(characterModel); // Added export

export default characterModel;