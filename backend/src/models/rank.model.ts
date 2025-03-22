import BaseModel from '../db/BaseModel';
import { AppError } from '../utils/error-handler';

interface GuildRank {
  id: number;
  guild_id: number;
  rank_id: number;
  rank_name: string;
  created_at?: string;
  updated_at?: string;
}

class RankModel extends BaseModel<GuildRank> {
  constructor() {
    super('guild_ranks');
  }

  async getGuildRanks(guildId: number): Promise<GuildRank[]> {
    try {
      return this.findAll({ guild_id: guildId });
    } catch (error) {
      throw new AppError(
        `Error getting guild ranks: ${error instanceof Error ? error.message : String(error)}`,
        500
      );
    }
  }

  async setGuildRank(guildId: number, rankId: number, rankName: string): Promise<GuildRank> {
    try {
      // Check if rank exists
      const existingRank = await this.findOne({ guild_id: guildId, rank_id: rankId });
      
      if (existingRank !== null) {
        // Update existing rank
        return await this.update(existingRank.id, { 
          rank_name: rankName,
          updated_at: new Date().toISOString()
        });
      }

      // Create new rank
      return await this.create({
        guild_id: guildId,
        rank_id: rankId,
        rank_name: rankName
      });
    } catch (error) {
      throw new AppError(
        `Error setting guild rank: ${error instanceof Error ? error.message : String(error)}`,
        500
      );
    }
  }
}

export default new RankModel();