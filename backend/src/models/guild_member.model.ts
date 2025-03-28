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