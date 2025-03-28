import { UserRole, UserWithTokens, DbUser } from '../../../shared/types/user';
import BaseModel from '../db/BaseModel';
import { AppError } from '../utils/error-handler';
import db from '../db/db';
import { Character } from '../../../shared/types/guild'; // Removed unused DbCharacter

class UserModel extends BaseModel<DbUser> {
  constructor() {
    super('users');
  }

  async findByBattleNetId(battleNetId: string): Promise<UserWithTokens | null> {
    try {
      return await this.findOne({ battle_net_id: battleNetId });
    } catch (error) {
      throw new AppError(`Error finding user by Battle.net ID: ${error instanceof Error ? error.message : String(error)}`, 500);
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
      throw new AppError(`Error creating user: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }

  /**
   * Get a user with token information included
   */
  async getUserWithTokens(id: number): Promise<UserWithTokens | null> {
    try {
      return await this.findById(id);
    } catch (error) {
      throw new AppError(`Error getting user with tokens: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }

  /**
   * Update user tokens with type safety
   */
  async updateTokens(
    id: number, 
    accessToken: string, 
    refreshToken: string, 
    expiresAt: Date
  ): Promise<UserWithTokens | null> {
    try {
      return await this.update(id, {
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      throw new AppError(`Error updating user tokens: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }

  /**
   * Validate tokens and check if token is expired
   */
  async validateUserToken(id: number): Promise<{ valid: boolean; expired: boolean }> {
    try {
      const user = await this.getUserWithTokens(id);
      
      if (!user || !user.access_token) {
        return { valid: false, expired: false };
      }
      
      const expired = user.token_expires_at ? new Date(user.token_expires_at) < new Date() : true;
      
      return {
        valid: !!user.access_token,
        expired
      };
    } catch (error) {
      throw new AppError(`Error validating user token: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }

  async updateRole(id: number, role: UserRole): Promise<UserWithTokens | null> {
    try {
      return await this.update(id, { role, updated_at: new Date().toISOString() });
    } catch (error) {
      throw new AppError(`Error updating user role: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }

  async getUsersWithRole(role: UserRole): Promise<UserWithTokens[]> {
    try {
      return await this.findAll({ role });
    } catch (error) {
      throw new AppError(`Error getting users with role: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }

  /**
   * Update character sync timestamp
   */
  async updateCharacterSyncTimestamp(id: number): Promise<UserWithTokens | null> {
    try {
      return await this.update(id, { 
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      throw new AppError(`Error updating sync timestamp: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }

  async getUserCharacters(userId: number): Promise<Character[]> {
    try {
      const result = await db.query(
        'SELECT * FROM characters WHERE user_id = $1',
        [userId]
      );
      return result.rows;
    } catch (error) {
      throw new AppError(`Error getting user characters: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }

  async findByCharacterName(characterName: string, realm: string): Promise<UserWithTokens | null> {
    try {
      const result = await db.query(
        `SELECT u.* FROM users u
         JOIN characters c ON c.user_id = u.id
         WHERE LOWER(c.name) = LOWER($1) AND LOWER(c.realm) = LOWER($2)
         LIMIT 1`,
        [characterName, realm]
      );
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      throw new AppError(`Error finding user by character: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }

  async findGuildMembers(guildId: number): Promise<UserWithTokens[]> {
    try {
      const result = await db.query(
        `SELECT DISTINCT u.* FROM users u
         JOIN characters c ON c.user_id = u.id
         WHERE c.guild_id = $1`,
        [guildId]
      );
      return result.rows;
    } catch (error) {
      throw new AppError(`Error finding guild members: ${error instanceof Error ? error.message : String(error)}`, 500);
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
export const updateCharacterSyncTimestamp = userModel.updateCharacterSyncTimestamp.bind(userModel);
export const getUserCharacters = userModel.getUserCharacters.bind(userModel);
export const findByCharacterName = userModel.findByCharacterName.bind(userModel);
export const findGuildMembers = userModel.findGuildMembers.bind(userModel);

export default userModel;