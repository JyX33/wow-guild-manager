import { DbGuildMember } from '../../../shared/types/guild';
import BaseModel from '../db/BaseModel';
import { AppError } from '../utils/error-handler';
import db from '../db/db';
import { withTransaction } from '../utils/transaction';

class GuildMemberModel extends BaseModel<DbGuildMember> {
  constructor() {
    super('guild_members');
  }

  /**
   * Find guild members by guild ID and optionally filter by ranks.
   */
  async findByGuildAndRanks(guildId: number, ranks?: number[]): Promise<DbGuildMember[]> {
    try {
      let query = `SELECT * FROM ${this.tableName} WHERE guild_id = $1`;
      const params: (number | number[])[] = [guildId];

      if (ranks && ranks.length > 0) {
        query += ` AND rank = ANY($2::int[])`;
        params.push(ranks);
      }

      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      throw new AppError(`Error finding guild members by guild and ranks: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }


  /**
   * Find guild members by character IDs.
   */
  async findByCharacterIds(characterIds: number[]): Promise<DbGuildMember[]> {
    if (!characterIds || characterIds.length === 0) {
      return []; // Return empty array if no IDs are provided
    }
    try {
      // Explicitly select columns, using alias for is_available to match camelCase type
      const query = `SELECT id, guild_id, character_id, rank, is_main, character_name, character_class, member_data_json, created_at, updated_at, is_available AS "isAvailable" FROM ${this.tableName} WHERE character_id = ANY($1::int[])`; // Use alias is_available AS "isAvailable"
      const params = [characterIds];
      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      throw new AppError(`Error finding guild members by character IDs: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }


  /**
   * Bulk creates multiple guild members within a transaction.
   * @param membersData Array of partial DbGuildMember objects to insert.
   * @param client Optional transaction client.
   */
  async bulkCreate(membersData: Partial<DbGuildMember>[], client?: any): Promise<void> {
    if (!membersData || membersData.length === 0) {
      return;
    }
    const dbClient = client || db; // Use transaction client or default pool
    try {
      // Prepare columns and values for a single multi-row insert
      // Assuming all objects have the same keys (guild_id, character_id, rank, etc.)
      const firstMember = membersData[0];
      const keys = Object.keys(firstMember).filter(k => firstMember[k as keyof DbGuildMember] !== undefined); // Cast k
      // Add created_at and updated_at automatically. is_main will be included if present in keys.
      const columns = [...keys, 'created_at', 'updated_at'].join(', ');

      const valuePlaceholders: string[] = [];
      const allValues: any[] = [];
      let valueIndex = 1;

      for (const member of membersData) {
        const rowValues: any[] = [];
        const rowPlaceholders: string[] = [];
        for (const key of keys) {
          rowValues.push(member[key as keyof DbGuildMember]); // Cast key
          rowPlaceholders.push(`$${valueIndex++}`);
        }
        // Add NOW() for timestamps
        rowValues.push(new Date()); // For created_at
        rowValues.push(new Date()); // For updated_at
        rowPlaceholders.push(`$${valueIndex++}`);
        rowPlaceholders.push(`$${valueIndex++}`);

        valuePlaceholders.push(`(${rowPlaceholders.join(', ')})`);
        allValues.push(...rowValues);
      }

      const query = `
        INSERT INTO ${this.tableName} (${columns})
        VALUES ${valuePlaceholders.join(', ')}
        ON CONFLICT (guild_id, character_id) DO NOTHING
      `;

      await dbClient.query(query, allValues);

    } catch (error) {
      throw new AppError(`Error bulk creating guild members: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }

  /**
   * Bulk updates multiple guild members within a transaction.
   * Note: This performs individual updates in a loop for simplicity.
   * More complex bulk update strategies exist but add complexity.
   * @param membersData Array of objects containing memberId and update payload.
   * @param client Optional transaction client.
   */
  async bulkUpdate(membersData: { memberId: number; rank?: number; characterId?: number; memberData?: any; is_main?: boolean; isAvailable?: boolean }[], client?: any): Promise<void> { // Added isAvailable to input type
    if (!membersData || membersData.length === 0) {
      return;
    }
    const dbClient = client || db;
    try {
      for (const memberToUpdate of membersData) {
        const updates: string[] = [];
        const values: any[] = [];
        let valueIndex = 1;

        if (memberToUpdate.rank !== undefined) {
          updates.push(`rank = $${valueIndex++}`);
          values.push(memberToUpdate.rank);
        }
        if (memberToUpdate.characterId !== undefined) {
          updates.push(`character_id = $${valueIndex++}`);
          values.push(memberToUpdate.characterId);
        }
        if (memberToUpdate.memberData !== undefined) {
          updates.push(`member_data_json = $${valueIndex++}`);
          values.push(JSON.stringify(memberToUpdate.memberData));
        }
        // Add is_main handling
        if (memberToUpdate.is_main !== undefined) {
          updates.push(`is_main = $${valueIndex++}`);
          values.push(memberToUpdate.is_main);
        }
        // Add isAvailable handling
        if (memberToUpdate.isAvailable !== undefined) {
          updates.push(`is_available = $${valueIndex++}`); // Use correct snake_case column name
          values.push(memberToUpdate.isAvailable);
        }
        updates.push(`updated_at = NOW()`);

        if (updates.length > 1) { // Only update if there are changes + updated_at
          values.push(memberToUpdate.memberId); // Add the ID for the WHERE clause
          const query = `UPDATE ${this.tableName} SET ${updates.join(', ')} WHERE id = $${valueIndex}`;
          await dbClient.query(query, values);
        }
      }
    } catch (error) {
      throw new AppError(`Error bulk updating guild members: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }

  /**
   * Bulk deletes multiple guild members by their IDs within a transaction.
   * @param memberIds Array of member IDs to delete.
   * @param client Optional transaction client.
   */
  async bulkDelete(memberIds: number[], client?: any): Promise<void> {
    if (!memberIds || memberIds.length === 0) {
      return;
    }
    const dbClient = client || db;
    try {
      await dbClient.query(
        `DELETE FROM ${this.tableName} WHERE id = ANY($1::int[])`,
        [memberIds]
      );
    } catch (error) {
      throw new AppError(`Error bulk deleting guild members: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }

  /**
   * Sets a specific character as the main for a user within a specific guild.
   * Ensures only one main character exists per user per guild.
   * Requires the user_id to correctly scope the operation.
   * @param guildId The ID of the guild.
   * @param characterId The ID of the character to set as main.
   * @param userId The ID of the user owning the character.
   * @returns The updated guild member record for the new main character.
   * @throws AppError if character doesn't belong to user or isn't in the guild.
   */
  async setGuildMainCharacter(guildId: number, characterId: number, userId: number): Promise<DbGuildMember> {
    return await withTransaction(async (client) => {
      // 1. Verify character belongs to the user
      const characterCheck = await client.query(
        'SELECT id FROM characters WHERE id = $1 AND user_id = $2',
        [characterId, userId]
      );
      if (characterCheck.rowCount === 0) {
        throw new AppError('Character not found or does not belong to the user.', 404);
      }

      // 2. Find the target guild_member record ID
      const targetMemberResult = await client.query(
        'SELECT id FROM guild_members WHERE guild_id = $1 AND character_id = $2',
        [guildId, characterId]
      );
      if (targetMemberResult.rowCount === 0) {
        throw new AppError('Character is not a member of the specified guild.', 404);
      }
      const targetGuildMemberId = targetMemberResult.rows[0].id;

      // 3. Unset 'is_main' for other characters of the same user in the same guild
      // We need character IDs belonging to the user first
      const userCharacterIdsResult = await client.query(
        'SELECT id FROM characters WHERE user_id = $1',
        [userId]
      );
      const userCharacterIds = userCharacterIdsResult.rows.map((row: { id: number }) => row.id);

      if (userCharacterIds.length > 0) {
          await client.query(
            `UPDATE ${this.tableName}
             SET is_main = false, updated_at = NOW()
             WHERE guild_id = $1
               AND character_id = ANY($2::int[])
               AND id != $3`, // Exclude the target member itself
            [guildId, userCharacterIds, targetGuildMemberId]
          );
      }

      // 4. Set 'is_main' for the target character in the guild
      const updateResult = await client.query(
        `UPDATE ${this.tableName}
         SET is_main = true, updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [targetGuildMemberId]
      );

      if (updateResult.rowCount === 0) {
        // Should not happen if previous checks passed, but good to be safe
        throw new AppError('Failed to set main character.', 500);
      }

      return updateResult.rows[0];
    });
  }

  // Add other specific methods for guild_members if needed
}

const guildMemberModel = new GuildMemberModel();

// Export specific methods or the whole model instance
export const findByGuildAndRanks = guildMemberModel.findByGuildAndRanks.bind(guildMemberModel);
export const findById = guildMemberModel.findById.bind(guildMemberModel); // Assuming BaseModel has findById
export const findOne = guildMemberModel.findOne.bind(guildMemberModel); // Assuming BaseModel has findOne
export const create = guildMemberModel.create.bind(guildMemberModel); // Assuming BaseModel has create
export const update = guildMemberModel.update.bind(guildMemberModel); // Assuming BaseModel has update
export const setGuildMainCharacter = guildMemberModel.setGuildMainCharacter.bind(guildMemberModel); // Added export

export default guildMemberModel;
export const bulkCreate = guildMemberModel.bulkCreate.bind(guildMemberModel);
export const bulkUpdate = guildMemberModel.bulkUpdate.bind(guildMemberModel);
export const bulkDelete = guildMemberModel.bulkDelete.bind(guildMemberModel);

export const findByCharacterIds = guildMemberModel.findByCharacterIds.bind(guildMemberModel);
