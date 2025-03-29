import { DbGuildMember } from '../../../shared/types/guild';
import BaseModel from '../db/BaseModel';
import { AppError } from '../utils/error-handler';
import db from '../db/db';

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
      // Add created_at and updated_at automatically
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
  async bulkUpdate(membersData: { memberId: number; rank?: number; characterId?: number; memberData?: any }[], client?: any): Promise<void> {
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

  // Add other specific methods for guild_members if needed
}

const guildMemberModel = new GuildMemberModel();

// Export specific methods or the whole model instance
export const findByGuildAndRanks = guildMemberModel.findByGuildAndRanks.bind(guildMemberModel);
export const findById = guildMemberModel.findById.bind(guildMemberModel); // Assuming BaseModel has findById
export const findOne = guildMemberModel.findOne.bind(guildMemberModel); // Assuming BaseModel has findOne
export const create = guildMemberModel.create.bind(guildMemberModel); // Assuming BaseModel has create
export const update = guildMemberModel.update.bind(guildMemberModel); // Assuming BaseModel has update

export default guildMemberModel;
export const bulkCreate = guildMemberModel.bulkCreate.bind(guildMemberModel);
export const bulkUpdate = guildMemberModel.bulkUpdate.bind(guildMemberModel);
export const bulkDelete = guildMemberModel.bulkDelete.bind(guildMemberModel);
