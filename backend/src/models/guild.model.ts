import { Guild } from '../../../shared/types/index.js'; // Removed unused GuildMember
import { DbGuild, BattleNetGuildRoster, BattleNetGuildMember } from '../../../shared/types/guild.js'; // Import DbGuild, BattleNetGuildRoster, BattleNetGuildMember from guild.ts
import BaseModel from '../db/BaseModel.js';
import { AppError } from '../utils/error-handler.js';
import db from '../db/db.js';

export class GuildModel extends BaseModel<DbGuild> {
  constructor() {
    super('guilds');
  }
  
  async findOutdatedGuilds(): Promise<Guild[]> {
    try {
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      const result = await db.query(
        `SELECT * FROM ${this.tableName}
         WHERE (last_updated IS NULL OR last_updated < $1)
           AND exclude_from_sync = false
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
   * Find multiple guilds by their IDs.
   */
  async findByIds(ids: number[]): Promise<DbGuild[]> {
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
      throw new AppError(`Error finding guilds by IDs: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }


  /**
   * Get a guild with its raw Battle.net members from roster_json
   */
  async getGuildWithMembers(guildId: number): Promise<{ guild: DbGuild; members: BattleNetGuildMember[] } | null> {
    try {
      // Get the guild first (ensure findById returns DbGuild including roster_json)
      const guild = await this.findById(guildId);
      
      if (!guild) {
        return null;
      }
      
      // Get members from roster_json (assuming the column exists on the guild object)
      const rosterData = (guild as any).roster_json as BattleNetGuildRoster | null;
      const members: BattleNetGuildMember[] = rosterData?.members || [];
      
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
  async updateGuildData(id: number, guildDataJson: any): Promise<DbGuild | null> { // Return DbGuild type
    try {
      // Use the new column name
      return await this.update(id, {
        guild_data_json: guildDataJson,
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
export const findByIds = guildModel.findByIds.bind(guildModel);

export default guildModel;