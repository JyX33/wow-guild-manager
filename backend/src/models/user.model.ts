import BaseModel from '../db/BaseModel';
import { User, UserRole } from '../types';
import { AppError } from '../utils/error-handler';

class UserModel extends BaseModel<User> {
  constructor() {
    super('users');
  }

  async findByBattleNetId(battleNetId: string): Promise<User | null> {
    try {
      const result = await this.findOne({ battle_net_id: battleNetId });
      return result;
    } catch (error) {
      throw new AppError(`Error finding user by Battle.net ID: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }

  async createUser(userData: Partial<User>): Promise<User> {
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

  async updateTokens(id: number, accessToken: string, refreshToken: string, expiresAt: Date): Promise<User | null> {
    try {
      return await this.update(id, {
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expires_at: expiresAt,
        updated_at: new Date()
      });
    } catch (error) {
      throw new AppError(`Error updating user tokens: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }

  async updateRole(id: number, role: UserRole): Promise<User | null> {
    try {
      return await this.update(id, { role, updated_at: new Date() });
    } catch (error) {
      throw new AppError(`Error updating user role: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }

  async getUsersWithRole(role: UserRole): Promise<User[]> {
    try {
      return await this.findAll({ role });
    } catch (error) {
      throw new AppError(`Error getting users with role: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
}

export default new UserModel();