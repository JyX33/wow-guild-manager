import { Guild, GuildMember, BattleNetGuildRoster } from '../../../shared/types/index';
import { DbGuild } from '../../../shared/types/guild';
import BaseModel from '../db/BaseModel';
import { AppError } from '../utils/error-handler';
import db from '../db/db';

class GuildModel extends BaseModel<DbGuild> {
  constructor() {
    super('guilds');
  }
  
  async findOutdatedGuilds(): Promise<Guild[]> {
    try {
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      const result = await db.query(
        `SELECT * FROM ${this.tableName} 
         WHERE last_updated IS NULL OR last_updated < $1
         ORDER BY last_updated ASC NULLS FIRST
         LIMIT 50`,
        [oneDayAgo.toISOString()]
      );
      
      return result.rows;
    } catch (error) {
      throw new AppError(`Error finding outdated guilds: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
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

const guildModel = new GuildModel();

export const findById = guildModel.findById.bind(guildModel);
export const findOne = guildModel.findOne.bind(guildModel);
export const findAll = guildModel.findAll.bind(guildModel);
export const create = guildModel.create.bind(guildModel);
export const update = guildModel.update.bind(guildModel);
export const findByNameRealmRegion = guildModel.findByNameRealmRegion.bind(guildModel);
export const getGuildWithMembers = guildModel.getGuildWithMembers.bind(guildModel);
export const updateGuildData = guildModel.updateGuildData.bind(guildModel);
export const needsRefresh = guildModel.needsRefresh.bind(guildModel);
export const findOutdatedGuilds = guildModel.findOutdatedGuilds.bind(guildModel);

export default guildModel;