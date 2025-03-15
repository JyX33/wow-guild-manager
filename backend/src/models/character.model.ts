import { Character } from '../../../shared/types/index';
import BaseModel from '../db/BaseModel';
import { AppError } from '../utils/error-handler';
import { withTransaction } from '../utils/transaction';
import db from '../db/db';

class CharacterModel extends BaseModel<Character> {
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

        // Ensure is_main is set correctly
        const dataToInsert = {
          ...characterData,
          is_main: setAsMain,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // Insert the new character
        const keys = Object.keys(dataToInsert);
        const values = Object.values(dataToInsert);
        
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

      // Include updated_at timestamp
      const updateData = {
        ...data,
        updated_at: new Date().toISOString()
      };

      return await this.update(characterId, updateData);
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
      const subscriptionCheck = await db.query(
        'SELECT id FROM event_subscriptions WHERE character_id = $1 LIMIT 1',
        [characterId]
      );

      if (subscriptionCheck.rowCount > 0) {
        throw new AppError('Cannot delete character that is used in event subscriptions', 400);
      }

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
}

export default new CharacterModel();