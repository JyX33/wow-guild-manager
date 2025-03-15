import { Guild, GuildMember } from '../../../shared/types/index';
import BaseModel from '../db/BaseModel';
import db from '../db/db';
import { AppError } from '../utils/error-handler';

class GuildModel extends BaseModel<Guild> {
  constructor() {
    super('guilds');
  }

  async findByNameRealmRegion(name: string, realm: string, region: string): Promise<Guild | null> {
    try {
      return await this.findOne({ name, realm, region });
    } catch (error) {
      throw new AppError(`Error finding guild by name/realm/region: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }

  /**
   * Get a guild with its members
   */
  async getGuildWithMembers(guildId: number): Promise<{ guild: Guild; members: GuildMember[] } | null> {
    try {
      // Get the guild first
      const guild = await this.findById(guildId);
      
      if (!guild) {
        return null;
      }
      
      // Get members from guild_data, or return empty array if none
      const members = guild.guild_data?.members || [];
      
      return {
        guild,
        members
      };
    } catch (error) {
      throw new AppError(`Error retrieving guild with members: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
  
  /**
   * Update guild data from the API
   */
  async updateGuildData(id: number, guildData: any): Promise<Guild | null> {
    try {
      return await this.update(id, {
        guild_data: guildData,
        last_updated: new Date().toISOString()
      });
    } catch (error) {
      throw new AppError(`Error updating guild data: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
  
  /**
   * Check if guild data needs refreshing (older than 24 hours)
   */
  async needsRefresh(id: number): Promise<boolean> {
    try {
      const guild = await this.findById(id);
      
      if (!guild || !guild.last_updated) {
        return true;
      }
      
      const lastUpdated = new Date(guild.last_updated);
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      return lastUpdated < oneDayAgo;
    } catch (error) {
      throw new AppError(`Error checking if guild needs refresh: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
}

export default new GuildModel();