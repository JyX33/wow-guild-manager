import {
  DbUser,
  UserRole,
  UserWithTokens,
} from "../../../shared/types/user.js";
import BaseModel from "../db/BaseModel.js";
import { AppError } from "../utils/error-handler.js";
import db from "../db/db.js";
import { Character } from "../../../shared/types/guild.js"; // Removed unused DbCharacter

export class UserModel extends BaseModel<DbUser> {
  constructor() {
    super("users");
  }

  async findByBattleNetId(battleNetId: string): Promise<UserWithTokens | null> {
    try {
      return await this.findOne({ battle_net_id: battleNetId });
    } catch (error) {
      throw new AppError(
        `Error finding user by Battle.net ID: ${
          error instanceof Error ? error.message : String(error)
        }`,
        500,
      );
    }
  }

  async createUser(userData: Partial<UserWithTokens>): Promise<UserWithTokens> {
    // Set default role to USER if not provided
    if (!userData.role) {
      userData.role = UserRole.USER;
    }

    try {
      return await this.create(userData);
    } catch (error) {
      throw new AppError(
        `Error creating user: ${
          error instanceof Error ? error.message : String(error)
        }`,
        500,
      );
    }
  }

  /**
   * Get a user with token information included
   */
  async getUserWithTokens(id: number): Promise<UserWithTokens | null> {
    try {
      return await this.findById(id);
    } catch (error) {
      throw new AppError(
        `Error getting user with tokens: ${
          error instanceof Error ? error.message : String(error)
        }`,
        500,
      );
    }
  }

  /**
   * Update user tokens with type safety. Refresh token can be null.
   */
  async updateTokens(
    id: number,
    accessToken: string,
    refreshToken: string | null, // Allow null for refresh token
    expiresAt: Date,
  ): Promise<UserWithTokens | null> {
    try {
      // Prepare update payload, handling null refresh token
      const updateData: Partial<DbUser> = {
        access_token: accessToken,
        token_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      };
      // Only include refresh_token in the update if it's not null
      // If it is null, the database column should ideally allow NULLs
      // or be handled appropriately by the underlying update logic.
      // Convert null to undefined to match the expected type 'string | undefined'.
      updateData.refresh_token = refreshToken === null
        ? undefined
        : refreshToken;

      return await this.update(id, updateData);
    } catch (error) {
      throw new AppError(
        `Error updating user tokens: ${
          error instanceof Error ? error.message : String(error)
        }`,
        500,
      );
    }
  }

  /**
   * Validate tokens and check if token is expired
   */
  async validateUserToken(
    id: number,
  ): Promise<{ valid: boolean; expired: boolean }> {
    try {
      const user = await this.getUserWithTokens(id);

      if (!user || !user.access_token) {
        return { valid: false, expired: false };
      }

      const expired = user.token_expires_at
        ? new Date(user.token_expires_at) < new Date()
        : true;

      return {
        valid: !!user.access_token,
        expired,
      };
    } catch (error) {
      throw new AppError(
        `Error validating user token: ${
          error instanceof Error ? error.message : String(error)
        }`,
        500,
      );
    }
  }

  async updateRole(id: number, role: UserRole): Promise<UserWithTokens | null> {
    try {
      return await this.update(id, {
        role,
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      throw new AppError(
        `Error updating user role: ${
          error instanceof Error ? error.message : String(error)
        }`,
        500,
      );
    }
  }

  /**
   * Update tokens specifically for the refresh flow, including the refresh token.
   */
  async updateTokensForRefresh(
    id: number,
    accessToken: string,
    refreshToken: string, // Refresh token is expected here
    expiresAt: Date,
  ): Promise<UserWithTokens | null> {
    try {
      const updateData: Partial<DbUser> = {
        access_token: accessToken,
        refresh_token: refreshToken, // Always update refresh token
        token_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      };
      return await this.update(id, updateData);
    } catch (error) {
      throw new AppError(
        `Error updating tokens during refresh: ${
          error instanceof Error ? error.message : String(error)
        }`,
        500,
      );
    }
  }

  /**
   * Invalidate all tokens for a user by updating the tokens_valid_since timestamp.
   */
  async invalidateUserTokens(id: number): Promise<UserWithTokens | null> {
    try {
      const updateData: Partial<DbUser> = {
        tokens_valid_since: new Date().toISOString(), // Set to current time
        updated_at: new Date().toISOString(),
      };
      // Use knex instance directly for db functions like now()
      // updateData.tokens_valid_since = db.fn.now(); // Alternative if direct DB function needed
      return await this.update(id, updateData);
    } catch (error) {
      throw new AppError(
        `Error invalidating user tokens: ${
          error instanceof Error ? error.message : String(error)
        }`,
        500,
      );
    }
  }

  async getUsersWithRole(role: UserRole): Promise<UserWithTokens[]> {
    try {
      return await this.findAll({ role });
    } catch (error) {
      throw new AppError(
        `Error getting users with role: ${
          error instanceof Error ? error.message : String(error)
        }`,
        500,
      );
    }
  }

  async getUserCharacters(userId: number): Promise<Character[]> {
    try {
      const result = await db.query(
        "SELECT * FROM characters WHERE user_id = $1",
        [userId],
      );
      return result.rows;
    } catch (error) {
      throw new AppError(
        `Error getting user characters: ${
          error instanceof Error ? error.message : String(error)
        }`,
        500,
      );
    }
  }

  async findByCharacterName(
    characterName: string,
    realm: string,
  ): Promise<UserWithTokens | null> {
    try {
      const result = await db.query(
        `SELECT u.* FROM users u
         JOIN characters c ON c.user_id = u.id
         WHERE LOWER(c.name) = LOWER($1) AND LOWER(c.realm) = LOWER($2)
         LIMIT 1`,
        [characterName, realm],
      );
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      throw new AppError(
        `Error finding user by character: ${
          error instanceof Error ? error.message : String(error)
        }`,
        500,
      );
    }
  }

  async findGuildMembers(guildId: number): Promise<UserWithTokens[]> {
    try {
      const result = await db.query(
        `SELECT DISTINCT u.* FROM users u
         JOIN characters c ON c.user_id = u.id
         WHERE c.guild_id = $1`,
        [guildId],
      );
      return result.rows;
    } catch (error) {
      throw new AppError(
        `Error finding guild members: ${
          error instanceof Error ? error.message : String(error)
        }`,
        500,
      );
    }
  }
  /**
   * Updates the character sync timestamp for a user.
   * Assumes a 'last_character_sync_at' field exists in the users table.
   * @param userId The ID of the user.
   */
  async updateCharacterSyncTimestamp(userId: number): Promise<void> {
    try {
      // Assume 'last_character_sync_at' exists based on instructions.
      // If this update fails due to column not found, schema/migrations need verification.
      // Wrap the timestamp in an array to match the expected DB column type
      // Explicitly format as PostgreSQL array literal '{timestamp}'
      await this.update(
        userId,
        { last_character_sync_at: `{${new Date().toISOString()}}` } as Partial<
          DbUser
        >,
      );

      // Optional: Add logging for successful update or no-op if user not found
    } catch (error) {
      console.error(
        `Error updating character sync timestamp for user ${userId}:`,
        error,
      );
      throw new AppError(
        `Failed to update character sync timestamp for user ${userId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        500,
      );
    }
  }
}

const userModel = new UserModel();

export const findById = userModel.findById.bind(userModel);
export const findOne = userModel.findOne.bind(userModel);
export const findAll = userModel.findAll.bind(userModel);
export const create = userModel.create.bind(userModel);
export const update = userModel.update.bind(userModel);
export const findByBattleNetId = userModel.findByBattleNetId.bind(userModel);
export const createUser = userModel.createUser.bind(userModel);
export const getUserWithTokens = userModel.getUserWithTokens.bind(userModel);
export const updateTokens = userModel.updateTokens.bind(userModel);
export const validateUserToken = userModel.validateUserToken.bind(userModel);
export const updateRole = userModel.updateRole.bind(userModel);
export const getUsersWithRole = userModel.getUsersWithRole.bind(userModel);
export const getUserCharacters = userModel.getUserCharacters.bind(userModel);
export const findByCharacterName = userModel.findByCharacterName.bind(
  userModel,
);
export const findGuildMembers = userModel.findGuildMembers.bind(userModel);
export const updateTokensForRefresh = userModel.updateTokensForRefresh.bind(
  userModel,
);
export const invalidateUserTokens = userModel.invalidateUserTokens.bind(
  userModel,
);

export default userModel;
