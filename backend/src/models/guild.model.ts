import { Guild } from "../../../shared/types/index.js";
import {
  BattleNetGuild,
  BattleNetGuildMember,
  BattleNetGuildRoster,
  DbGuild,
} from "../../../shared/types/guild.js";
import {
  DbGuildEnhanced,
  isBattleNetGuild,
  isBattleNetGuildRoster,
} from "../../../shared/types/db-enhanced.js";
import BaseModel from "../db/BaseModel.js";
import { AppError } from "../utils/error-handler.js";
import db from "../db/db.js";
import { Guild as GuildType } from "../../../shared/types/guild.js";
import { DbQueryCondition, DbQueryParam } from "../../../shared/types/db.js";

// Create type-safe query condition for guild
type GuildQueryCondition = DbQueryCondition<DbGuild>;

export class GuildModel extends BaseModel<DbGuild, DbGuildEnhanced> {
  constructor() {
    super("guilds");
  }

  async findOutdatedGuilds(): Promise<GuildType[]> {
    try {
      const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000); // 8 hours ago

      const result = await db.query(
        `SELECT * FROM ${this.tableName}
         WHERE (last_roster_sync IS NULL OR last_roster_sync < $1)
           AND exclude_from_sync = false
         ORDER BY last_roster_sync ASC NULLS FIRST
         LIMIT 50`,
        [eightHoursAgo.toISOString()],
      );

      return result.rows;
    } catch (error) {
      throw new AppError(
        `Error finding outdated guilds: ${
          error instanceof Error ? error.message : String(error)
        }`,
        500,
      );
    }
  }

  async findByNameRealmRegion(
    name: string,
    realm: string,
    region: string,
  ): Promise<DbGuildEnhanced | null> {
    try {
      // Create a type-safe condition object
      const condition: GuildQueryCondition = { name, realm, region };
      return await this.findOne(condition);
    } catch (error) {
      throw new AppError(
        `Error finding guild by name/realm/region: ${
          error instanceof Error ? error.message : String(error)
        }`,
        500,
      );
    }
  }

  /**
   * Find multiple guilds by their IDs.
   */
  async findByIds(ids: number[]): Promise<DbGuildEnhanced[]> {
    if (!ids || ids.length === 0) {
      return [];
    }
    try {
      // Use the underlying query builder with typed parameters
      const result = await db.query(
        `SELECT * FROM ${this.tableName} WHERE id = ANY($1::int[])`,
        [ids],
      );
      return result.rows;
    } catch (error) {
      throw new AppError(
        `Error finding guilds by IDs: ${
          error instanceof Error ? error.message : String(error)
        }`,
        500,
      );
    }
  }

  /**
   * Get a guild with its raw Battle.net members from roster_json
   */
  async getGuildWithMembers(
    guildId: number,
  ): Promise<
    { guild: DbGuildEnhanced; members: BattleNetGuildMember[] } | null
  > {
    try {
      // Get the guild first with enhanced type
      const guild = await this.findById(guildId);

      if (!guild) {
        return null;
      }

      // Get members from roster_json - now properly typed
      const members: BattleNetGuildMember[] = guild.roster_json?.members || [];

      return {
        guild,
        members,
      };
    } catch (error) {
      throw new AppError(
        `Error retrieving guild with members: ${
          error instanceof Error ? error.message : String(error)
        }`,
        500,
      );
    }
  }

  /**
   * Update guild data from the API
   */
  async updateGuildData(
    id: number,
    guildDataJson: BattleNetGuild,
  ): Promise<DbGuildEnhanced | null> {
    try {
      // Validate the input data using type guard
      if (!isBattleNetGuild(guildDataJson)) {
        throw new Error("Invalid guild data format");
      }

      return await this.update(id, {
        guild_data_json: guildDataJson,
        last_updated: new Date().toISOString(),
      });
    } catch (error) {
      throw new AppError(
        `Error updating guild data: ${
          error instanceof Error ? error.message : String(error)
        }`,
        500,
      );
    }
  }

  /**
   * Update guild roster from the API
   */
  async updateGuildRoster(
    id: number,
    rosterJson: BattleNetGuildRoster,
  ): Promise<DbGuildEnhanced | null> {
    try {
      // Validate input using type guard
      if (!isBattleNetGuildRoster(rosterJson)) {
        throw new Error("Invalid guild roster format");
      }

      return await this.update(id, {
        roster_json: rosterJson,
        last_roster_sync: new Date().toISOString(),
      });
    } catch (error) {
      throw new AppError(
        `Error updating guild roster: ${
          error instanceof Error ? error.message : String(error)
        }`,
        500,
      );
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
      throw new AppError(
        `Error checking if guild needs refresh: ${
          error instanceof Error ? error.message : String(error)
        }`,
        500,
      );
    }
  }
}

const guildModel = new GuildModel();

export const findById = guildModel.findById.bind(guildModel);
export const findOne = guildModel.findOne.bind(guildModel);
export const findAll = guildModel.findAll.bind(guildModel);
export const create = guildModel.create.bind(guildModel);
export const update = guildModel.update.bind(guildModel);
export const findByNameRealmRegion = guildModel.findByNameRealmRegion.bind(
  guildModel,
);
export const getGuildWithMembers = guildModel.getGuildWithMembers.bind(
  guildModel,
);
export const updateGuildData = guildModel.updateGuildData.bind(guildModel);
export const updateGuildRoster = guildModel.updateGuildRoster.bind(guildModel); // New export
export const needsRefresh = guildModel.needsRefresh.bind(guildModel);
export const findOutdatedGuilds = guildModel.findOutdatedGuilds.bind(
  guildModel,
);
export const findByIds = guildModel.findByIds.bind(guildModel);

export default guildModel;
