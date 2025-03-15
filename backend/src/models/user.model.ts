import { User, UserRole, UserWithTokens } from '../../../shared/types/index';
import BaseModel from '../db/BaseModel';
import { AppError } from '../utils/error-handler';

class UserModel extends BaseModel<UserWithTokens> {
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
}

export default new UserModel();