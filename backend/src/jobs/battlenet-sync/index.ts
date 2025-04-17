// Modular Battle.net sync entry point

import { syncGuild } from './core-guild-sync.js';
import guildModelInstance, { GuildModel } from '../../models/guild.model.js';
import userModelInstance, { UserModel } from '../../models/user.model.js';
import guildMemberModelInstance, { GuildMemberModel } from '../../models/guild_member.model.js';
import rankModelInstance, { RankModel } from '../../models/rank.model.js';
import logger from '../../utils/logger.js';
import { BattleNetApiClient } from '../../services/battlenet-api.client.js';
import characterModelInstance, { CharacterModel } from '../../models/character.model.js';

import { DbGuild } from '../../../../shared/types/guild.js';

/**
 * Orchestrates a full Battle.net sync for all guilds.
 * Loads all guilds from the database and calls syncGuild for each.
 */
export async function runSync(): Promise<void> {
  const apiClient = new BattleNetApiClient();
  const guildModel: GuildModel = guildModelInstance;
  const userModel: UserModel = userModelInstance;
  const guildMemberModel: GuildMemberModel = guildMemberModelInstance;
  const rankModel: RankModel = rankModelInstance;
  const characterModel: CharacterModel = characterModelInstance;

  try {
    const guilds: DbGuild[] = await guildModel.findAll();
    logger.info({ count: guilds.length }, '[BattleNetSync] Starting sync for all guilds');

    for (const guild of guilds) {
      try {
        await syncGuild(apiClient, guildModel, userModel, guildMemberModel, rankModel, guild);
        logger.info({ guildId: guild.id }, '[BattleNetSync] Guild sync completed');
      } catch (guildErr) {
        logger.error({ err: guildErr, guildId: guild.id }, '[BattleNetSync] Guild sync failed');
      }
    }

    logger.info('[BattleNetSync] All guilds sync completed');
  } catch (err) {
    logger.error({ err }, '[BattleNetSync] Failed to run full sync');
    throw err;
  }
}