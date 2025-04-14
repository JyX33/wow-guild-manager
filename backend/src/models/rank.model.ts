import BaseModel from '../db/BaseModel.js';
import { AppError } from '../utils/error-handler.js';
import { DbGuildRank, GuildRank } from '../../../shared/types/guild.js';

export class RankModel extends BaseModel<DbGuildRank> {
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
        const updatedRank = await this.update(existingRank.id!, { // Assert id is non-null
          rank_name: rankName,
          updated_at: new Date().toISOString()
        });
        if (updatedRank === null) {
          // This shouldn't happen if findOne succeeded, but handle defensively
          throw new AppError('Failed to update rank after finding it', 500);
        }
        return updatedRank; // Return the non-null updated rank
      }

      // Create new rank
      return await this.create({
        guild_id: guildId,
        rank_id: rankId,
        rank_name: rankName,
        member_count: 0
      });
    } catch (error) {
      throw new AppError(
        `Error setting guild rank: ${error instanceof Error ? error.message : String(error)}`,
        500
      );
    }
  }
  
  async updateMemberCount(guildId: number, rankId: number, count: number): Promise<GuildRank | null> {
    try {
      // Find the rank
      const rank = await this.findOne({ guild_id: guildId, rank_id: rankId });
      
      if (!rank) {
        return null;
      }
      
      // Update the member count
      return await this.update(rank.id!, { // Assert id is non-null
        member_count: count,
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      throw new AppError(
        `Error updating rank member count: ${error instanceof Error ? error.message : String(error)}`,
        500
      );
    }
  }
}

const rankModel = new RankModel();

export const findById = rankModel.findById.bind(rankModel);
export const findOne = rankModel.findOne.bind(rankModel);
export const findAll = rankModel.findAll.bind(rankModel);
export const create = rankModel.create.bind(rankModel);
export const update = rankModel.update.bind(rankModel);
export const getGuildRanks = rankModel.getGuildRanks.bind(rankModel);
export const setGuildRank = rankModel.setGuildRank.bind(rankModel);
export const updateMemberCount = rankModel.updateMemberCount.bind(rankModel);

export default rankModel;