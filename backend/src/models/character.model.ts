import {
  BattleNetCharacter,
  BattleNetCharacterEquipment,
  BattleNetMythicKeystoneProfile,
  BattleNetProfessions,
  Character,
  DbCharacter,
} from "../../../shared/types/guild.js";
import { CharacterRole } from "../../../shared/types/index.js";
import {
  BattleNetRegion,
  BattleNetWoWAccount,
} from "../../../shared/types/user.js";
import {
  DbCharacterEnhanced,
  isBattleNetCharacter,
  isBattleNetCharacterEquipment,
  isBattleNetMythicKeystoneProfile,
  isBattleNetProfessions,
} from "../../../shared/types/db-enhanced.js";
import BaseModel from "../db/BaseModel.js";
import db from "../db/db.js";
import { AppError } from "../utils/error-handler.js";
import logger from "../utils/logger.js";
import { withTransaction } from "../utils/transaction.js";
import { DbQueryCondition, DbQueryParam } from "../../../shared/types/db.js";
import process from "node:process";

// Create type-safe query condition for character
type CharacterQueryCondition = DbQueryCondition<DbCharacter>;

// Helper function to parse region from URL (can be moved to a util file later)
const parseRegionFromHref = (
  href: string | undefined,
): BattleNetRegion | null => {
  if (!href) return null;
  try {
    const url = new URL(href);
    const hostnameParts = url.hostname.split("."); // e.g., ['us', 'api', 'blizzard', 'com']
    const regionCode = hostnameParts[0];
    if (["us", "eu", "kr", "tw", "cn"].includes(regionCode)) {
      return regionCode as BattleNetRegion;
    }
  } catch (e) {
    // Invalid URL
    console.error(`[parseRegionFromHref] Error parsing URL: ${href}`, e);
  }
  return null;
};

export class CharacterModel
  extends BaseModel<DbCharacter, DbCharacterEnhanced> {
  constructor() {
    super("characters");
  }

  /**
   * Find characters by user ID
   */
  async findByUserId(userId: number): Promise<DbCharacterEnhanced[]> {
    try {
      // Create a type-safe condition
      const condition: CharacterQueryCondition = { user_id: userId };
      return await this.findAll(condition);
    } catch (error) {
      throw new AppError(
        `Error finding characters by user ID: ${
          error instanceof Error ? error.message : String(error)
        }`,
        500,
      );
    }
  }

  /**
   * Create a character
   */
  async createCharacter(
    characterData: Partial<DbCharacter>,
  ): Promise<DbCharacterEnhanced> {
    try {
      return await withTransaction(async (client) => {
        const dataToInsert = {
          ...characterData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Filter out undefined values before inserting
        const filteredData: Record<string, DbQueryParam> = {};
        for (const [key, value] of Object.entries(dataToInsert)) {
          if (value !== undefined) {
            filteredData[key] = value;
          }
        }

        // Insert the new character
        const keys = Object.keys(filteredData);
        const values: DbQueryParam[] = Object.values(filteredData);

        const columnNames = keys.join(", ");
        const valuePlaceholders = keys.map((_, index) => `$${index + 1}`).join(
          ", ",
        );

        const result = await client.query(
          `INSERT INTO ${this.tableName} (${columnNames}) VALUES (${valuePlaceholders}) RETURNING *`,
          values,
        );

        return result.rows[0];
      });
    } catch (error) {
      throw new AppError(
        `Error creating character: ${
          error instanceof Error ? error.message : String(error)
        }`,
        500,
      );
    }
  }

  /**
   * Update character with validation to ensure it belongs to the user
   */
  async updateCharacter(
    characterId: number,
    userId: number,
    data: Partial<DbCharacter>,
  ): Promise<DbCharacterEnhanced | null> {
    try {
      // Make sure this character belongs to the user
      const condition: CharacterQueryCondition = {
        id: characterId,
        user_id: userId,
      };
      const character = await this.findOne(condition);

      if (!character) {
        throw new AppError(
          "Character not found or doesn't belong to user",
          404,
        );
      }

      const updateData = {
        ...data,
        updated_at: new Date().toISOString(),
      };

      // Filter out undefined values before updating
      const filteredUpdateData: Record<string, DbQueryParam> = {};
      for (const [key, value] of Object.entries(updateData)) {
        if (value !== undefined) {
          filteredUpdateData[key] = value;
        }
      }

      return await this.update(characterId, filteredUpdateData);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        `Error updating character: ${
          error instanceof Error ? error.message : String(error)
        }`,
        500,
      );
    }
  }

  /**
   * Update character profile data with validation
   */
  async updateCharacterProfile(
    id: number,
    profileData: BattleNetCharacter,
    equipmentData?: BattleNetCharacterEquipment | null,
    mythicData?: BattleNetMythicKeystoneProfile | null,
    professionsData?: BattleNetProfessions["primaries"] | null,
  ): Promise<DbCharacterEnhanced | null> {
    try {
      // Validate input data using type guards
      if (!isBattleNetCharacter(profileData)) {
        throw new Error("Invalid character profile format");
      }

      if (equipmentData && !isBattleNetCharacterEquipment(equipmentData)) {
        throw new Error("Invalid character equipment format");
      }

      if (mythicData && !isBattleNetMythicKeystoneProfile(mythicData)) {
        throw new Error("Invalid mythic keystone profile format");
      }

      const updateData: Partial<DbCharacterEnhanced> = {
        profile_json: profileData,
        last_synced_at: new Date().toISOString(),
        is_available: true,
      };

      if (equipmentData) {
        updateData.equipment_json = equipmentData;
      }

      if (mythicData) {
        updateData.mythic_profile_json = mythicData;
      }

      if (professionsData) {
        updateData.professions_json = professionsData;
      }

      return await this.update(id, updateData);
    } catch (error) {
      throw new AppError(
        `Error updating character profile: ${
          error instanceof Error ? error.message : String(error)
        }`,
        500,
      );
    }
  }

  /**
   * Delete character with validation to ensure it belongs to the user
   */
  async deleteUserCharacter(
    characterId: number,
    userId: number,
  ): Promise<boolean> {
    try {
      // Make sure this character belongs to the user
      const condition: CharacterQueryCondition = {
        id: characterId,
        user_id: userId,
      };
      const character = await this.findOne(condition);

      if (!character) {
        throw new AppError(
          "Character not found or doesn't belong to user",
          404,
        );
      }

      // Delete the character
      return await withTransaction(async (client) => {
        const result = await client.query(
          `DELETE FROM ${this.tableName} WHERE id = $1 RETURNING id`,
          [characterId],
        );

        return result.rowCount !== null && result.rowCount > 0;
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        `Error deleting character: ${
          error instanceof Error ? error.message : String(error)
        }`,
        500,
      );
    }
  }

  /**
   * Sync characters from Battle.net account data
   */
  async syncCharactersFromBattleNet(
    userId: number,
    wowAccounts: BattleNetWoWAccount[],
  ): Promise<
    { added: number; updated: number; total: number; processedIds: number[] }
  > {
    try {
      return await withTransaction(async (client) => {
        let added = 0;
        let updated = 0;
        const processedIds: number[] = []; // Array to store IDs of created/updated characters

        // Gather all characters from Battle.net
        const battleNetCharacters: Partial<DbCharacterEnhanced>[] = [];

        for (const account of wowAccounts) {
          for (const character of account.characters || []) {
            battleNetCharacters.push({
              user_id: userId,
              name: character.name,
              realm: character.realm.slug,
              class: character.playable_class?.name || "Unknown",
              level: character.level || 1,
              role: this.determineDefaultRole(character.playable_class?.id),
              profile_json: character,
            });
          }
        }
        logger.info(
          `Syncing ${battleNetCharacters.length} characters from Battle.net for user ${userId}.`,
        );

        // Extract unique name/realm pairs from battleNetCharacters
        const uniqueNameRealmPairs = Array.from(
          new Set(
            battleNetCharacters.map((char) =>
              `${char.name?.toLowerCase() || ""}:${
                char.realm?.toLowerCase() || ""
              }`
            ),
          ),
        ).map((pair) => {
          const [name, realm] = pair.split(":");
          return { name, realm };
        });

        let existingCharsResult;
        const existingCharsMap = new Map<string, number>();

        if (uniqueNameRealmPairs.length > 0) {
          // Prepare values for the query with proper typing
          const queryValues: DbQueryParam[] = uniqueNameRealmPairs.flatMap(
            (key) => [key.name.toLowerCase(), key.realm.toLowerCase()],
          );

          // Construct the WHERE clause using tuple comparison (PostgreSQL specific)
          const placeholders = uniqueNameRealmPairs.map((_, index) =>
            `($${index * 2 + 1}, $${index * 2 + 2})`
          ).join(", ");

          const query = `
          SELECT id, name, realm
          FROM ${this.tableName}
          WHERE (lower(name), lower(realm)) IN (${placeholders})
          `;

          existingCharsResult = await client.query(query, queryValues);

          existingCharsResult.rows.forEach(
            (row: { id: number; name: string; realm: string }) => {
              existingCharsMap.set(
                `${row.name.toLowerCase()}-${row.realm.toLowerCase()}`,
                row.id,
              );
            },
          );
        } else {
          // If no characters from Battle.net, there are no existing characters to match
          existingCharsResult = { rows: [] };
        }

        // Process each character
        for (const character of battleNetCharacters) {
          const charKey = `${character.name?.toLowerCase() || ""}-${
            character.realm?.toLowerCase() || ""
          }`;
          const existingId = existingCharsMap.get(charKey);
          logger.debug(
            `Processing character: ${character.name} (${character.realm}) - Existing ID: ${existingId}`,
          );

          // Parse region from profile_json
          let region: BattleNetRegion = "eu"; // Default to 'eu'

          if (character.profile_json) {
            // Properly access the profile JSON with type safety
            const profileJson = character.profile_json;
            const keyHref = profileJson.key?.href;
            const realmKeyHref = profileJson.realm?.key?.href;
            const hrefToCheck = keyHref || realmKeyHref;

            const parsedRegion = parseRegionFromHref(hrefToCheck);
            if (parsedRegion) {
              region = parsedRegion;
            }
          }

          if (existingId) {
            // Existing character found, update it
            // Prepare update data, ensuring only defined values are included
            const updateData: Partial<DbCharacterEnhanced> = {
              user_id: userId,
              name: character.name,
              realm: character.realm,
              class: character.class,
              level: character.level,
              role: character.role,
              profile_json: character.profile_json,
              region: region,
              updated_at: new Date().toISOString(),
            };

            // Filter out undefined values
            const filteredUpdateData: Record<string, DbQueryParam> = {};
            for (const [key, value] of Object.entries(updateData)) {
              if (value !== undefined) {
                filteredUpdateData[key] = value;
              }
            }

            const updateKeys = Object.keys(filteredUpdateData);
            const updateValues: DbQueryParam[] = Object.values(
              filteredUpdateData,
            );

            if (updateKeys.length > 0) { // Only update if there's data to update
              const setClauses = updateKeys.map((key, index) =>
                `${key} = $${index + 1}`
              ).join(", ");

              await client.query(
                `UPDATE ${this.tableName} SET ${setClauses} WHERE id = $${
                  updateKeys.length + 1
                }`,
                [...updateValues, existingId],
              );
            }

            processedIds.push(existingId); // Add existing ID to processed list
            updated++;
          } else {
            // Insert new character with properly typed values
            const insertParams: DbQueryParam[] = [
              character.user_id,
              character.name,
              character.realm,
              character.class,
              character.level,
              character.role,
              character.profile_json,
              region,
            ];

            const insertResult = await client.query(
              `INSERT INTO ${this.tableName}
              (user_id, name, realm, class, level, role, profile_json, region, created_at, updated_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
              RETURNING id`,
              insertParams,
            );

            if (insertResult.rows.length > 0) {
              processedIds.push(insertResult.rows[0].id);
            }
            added++;
          }
        }

        // Return counts and the list of processed character IDs
        return {
          added,
          updated,
          total: battleNetCharacters.length,
          processedIds,
        };
      });
    } catch (error) {
      throw new AppError(
        `Error syncing characters: ${
          error instanceof Error ? error.message : String(error)
        }`,
        500,
      );
    }
  }

  /**
   * Determine default role based on specialization or class
   */
  private determineDefaultRole(classId?: number): CharacterRole {
    // If no class ID is provided, default to DPS
    if (!classId) return "DPS";

    // Class-based default role assignment
    switch (classId) {
      // Classes that can ONLY be DPS
      case 3: // Hunter
      case 4: // Rogue
      case 8: // Mage
      case 9: // Warlock
        return "DPS";

      // Classes with tanking specs - default to tank as it's less common
      case 1: // Warrior (Protection)
      case 2: // Paladin (Protection)
      case 6: // Death Knight (Blood)
      case 10: // Monk (Brewmaster)
      case 11: // Druid (Guardian)
      case 12: // Demon Hunter (Vengeance)
        return "Tank";

      // Classes with healing specs - default to healer as it's less common
      case 5: // Priest (Holy, Discipline)
      case 7: // Shaman (Restoration)
      case 13: // Evoker (Preservation)
        return "Healer";

      // Default for unknown classes
      default:
        return "DPS";
    }
  }

  /**
   * Get the highest level character for a user
   */
  async getHighestLevelCharacter(userId: number): Promise<Character | null> {
    try {
      const result = await db.query(
        `SELECT * FROM ${this.tableName}
        WHERE user_id = $1
        ORDER BY level DESC, updated_at DESC
        LIMIT 1`,
        [userId],
      );

      return result.rows[0] || null;
    } catch (error) {
      throw new AppError(
        `Error getting highest level character: ${
          error instanceof Error ? error.message : String(error)
        }`,
        500,
      );
    }
  }

  /**
   * Find a character by name and realm
   */
  async findByNameRealm(
    name: string,
    realm: string,
  ): Promise<DbCharacterEnhanced | null> {
    try {
      // Ensure case-insensitivity if DB collation isn't handling it
      const result = await db.query(
        `SELECT * FROM ${this.tableName} WHERE lower(name) = $1 AND lower(realm) = $2 LIMIT 1`,
        [name.toLowerCase(), realm.toLowerCase()],
      );
      return result.rows[0] || null;
    } catch (error) {
      throw new AppError(
        `Error finding character by name and realm: ${
          error instanceof Error ? error.message : String(error)
        }`,
        500,
      );
    }
  }

  /**
   * Find multiple characters by their IDs.
   */
  async findByIds(ids: number[]): Promise<DbCharacterEnhanced[]> {
    if (!ids || ids.length === 0) {
      return [];
    }
    try {
      // Use the underlying query builder with proper type safety
      const result = await db.query(
        `SELECT * FROM ${this.tableName} WHERE id = ANY($1::int[])`,
        [ids],
      );
      return result.rows;
    } catch (error) {
      throw new AppError(
        `Error finding characters by IDs: ${
          error instanceof Error ? error.message : String(error)
        }`,
        500,
      );
    }
  }

  /**
   * Find multiple characters by their name and realm slugs.
   */
  async findByMultipleNameRealm(
    keys: { name: string; realm: string }[],
  ): Promise<DbCharacterEnhanced[]> {
    if (!keys || keys.length === 0) {
      return [];
    }
    try {
      // Prepare values for the query
      const queryValues: DbQueryParam[] = keys.flatMap(
        (key) => [key.name.toLowerCase(), key.realm.toLowerCase()],
      );

      // Construct the WHERE clause using tuple comparison (PostgreSQL specific)
      const placeholders = keys.map((_, index) =>
        `($${index * 2 + 1}, $${index * 2 + 2})`
      ).join(", ");

      const query = `
        SELECT *
        FROM ${this.tableName}
        WHERE (lower(name), lower(realm)) IN (${placeholders})
      `;

      const result = await db.query(query, queryValues);
      return result.rows;
    } catch (error) {
      throw new AppError(
        `Error finding characters by multiple name/realm: ${
          error instanceof Error ? error.message : String(error)
        }`,
        500,
      );
    }
  }

  /**
   * Find characters that haven't been synced recently.
   */
  async findOutdatedCharacters(): Promise<DbCharacterEnhanced[]> {
    try {
      // Read limit from environment variable, default to 50
      const syncLimitEnv = process.env.CHARACTER_SYNC_LIMIT;
      const limit = syncLimitEnv ? parseInt(syncLimitEnv, 10) : 50;
      // Validate parsed limit, ensure it's a positive number, otherwise default to 50
      const effectiveLimit = (!isNaN(limit) && limit > 0) ? limit : 50;

      const threshold = new Date(Date.now() - 8 * 60 * 60 * 1000); // 8 hours ago

      const result = await db.query(
        `SELECT * FROM ${this.tableName}
         WHERE (last_synced_at IS NULL OR last_synced_at < $1)
           AND (is_available IS NULL OR is_available = TRUE) -- Added: Only sync available characters
         ORDER BY last_synced_at ASC NULLS FIRST
         LIMIT $2`,
        [threshold.toISOString(), effectiveLimit], // Use the determined limit
      );
      return result.rows;
    } catch (error) {
      throw new AppError(
        `Error finding outdated characters: ${
          error instanceof Error ? error.message : String(error)
        }`,
        500,
      );
    }
  }

  /**
   * Find characters by guild ID by joining with guild_members table.
   */
  async findAllByGuildId(guildId: number): Promise<DbCharacterEnhanced[]> {
    try {
      const result = await db.query(
        `SELECT c.*
        FROM characters c
        JOIN guild_members gm ON c.id = gm.character_id
        WHERE gm.guild_id = $1`,
        [guildId],
      );
      return result.rows;
    } catch (error) {
      throw new AppError(
        `Error finding characters by guild ID: ${
          error instanceof Error ? error.message : String(error)
        }`,
        500,
      );
    }
  }
}

const characterModel = new CharacterModel();

export const findById = characterModel.findById.bind(characterModel);
export const findOne = characterModel.findOne.bind(characterModel);
export const findAll = characterModel.findAll.bind(characterModel);
export const create = characterModel.create.bind(characterModel);
export const update = characterModel.update.bind(characterModel);
export const findByUserId = characterModel.findByUserId.bind(characterModel);
export const findByMultipleNameRealm = characterModel.findByMultipleNameRealm
  .bind(characterModel);

export const createCharacter = characterModel.createCharacter.bind(
  characterModel,
);
export const updateCharacter = characterModel.updateCharacter.bind(
  characterModel,
);
export const updateCharacterProfile = characterModel.updateCharacterProfile
  .bind(characterModel); // New export
export const deleteUserCharacter = characterModel.deleteUserCharacter.bind(
  characterModel,
);
export const syncCharactersFromBattleNet = characterModel
  .syncCharactersFromBattleNet.bind(characterModel);
export const getHighestLevelCharacter = characterModel.getHighestLevelCharacter
  .bind(characterModel);
export const findByNameRealm = characterModel.findByNameRealm.bind(
  characterModel,
);
export const findByIds = characterModel.findByIds.bind(characterModel);
export const findOutdatedCharacters = characterModel.findOutdatedCharacters
  .bind(characterModel);
export const findAllByGuildId = characterModel.findAllByGuildId.bind(
  characterModel,
);

export default characterModel;
