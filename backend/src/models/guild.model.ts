import BaseModel from '../db/BaseModel';
import { Guild } from '../types';
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

  async getGuildWithMembers(guildId: number): Promise<Guild | null> {
    try {
      const guild = await this.findById(guildId);
      return guild;
    } catch (error) {
      throw new AppError(`Error retrieving guild with members: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
}

export default new GuildModel();