// Modular Battle.net sync entry point

import { syncGuild } from './core-guild-sync.js';
import { syncGuildMembersTable } from './guild-members-sync.js';
import { syncGuildRanks } from './guild-ranks-sync.js';
import guildModelInstance, { GuildModel } from '../../models/guild.model.js';
import userModelInstance, { UserModel } from '../../models/user.model.js';
import guildMemberModelInstance, { GuildMemberModel } from '../../models/guild_member.model.js';
import rankModelInstance, { RankModel } from '../../models/rank.model.js';
import logger from '../../utils/logger.js';
import { BattleNetApiClient } from '../../services/battlenet-api.client.js';
import characterModelInstance, { CharacterModel } from '../../models/character.model.js';
import { syncCharacter } from './character-sync.js';

import { DbGuild } from '../../../../shared/types/guild.js';
import { BattleNetRegion } from '../../../../shared/types/user.js';

/**
 * Orchestrates the sync process for a single guild:
 * 1. Calls syncGuild to fetch and update core guild info.
 * 2. If successful, syncs members and ranks.
 * 3. Handles and logs errors at each stage.
 */
export async function orchestrateGuildSync(
  apiClient: BattleNetApiClient,
  guildModel: GuildModel,
  userModel: UserModel,
  guildMemberModel: GuildMemberModel,
  rankModel: RankModel,
  characterModel: CharacterModel,
  guild: DbGuild
): Promise<void> {
  // Step 1: Sync core guild info
  const result = await syncGuild(apiClient, guildModel, userModel, guild);
  if (!result.success) {
    logger.error(
      { guildId: guild.id, error: result.error },
      '[BattleNetSync] Guild core sync failed'
    );
    return;
  }

  const { bnetGuildData, bnetGuildRoster } = result;

  try {
    // Step 2: Sync members
    await syncGuildMembersTable(
      guildMemberModel,
      characterModel,
      guild.id,
      bnetGuildRoster,
      guild.region as BattleNetRegion
    );
    // Step 3: Sync ranks
    await syncGuildRanks(
      rankModel,
      guild.id,
      bnetGuildRoster
    );

    // Start Step 4: Sync individual characters
    logger.info(
      { guildId: guild.id },
      '[BattleNetSync] Starting individual character sync for guild'
    );

    // TODO: Syncing all characters sequentially within the main guild sync can be slow and API-intensive.
    // This should ideally be moved to a background job queue in the future.
    try {
      // Assuming characterModel has findAllByGuildId method or similar join logic
      const charactersToSync = await characterModel.findAllByGuildId(guild.id);

      for (const character of charactersToSync) {
        try {
          await syncCharacter(
            apiClient,
            characterModel,
            guildMemberModel,
            guildModel, // guildModel is available in orchestrateGuildSync params
            character
          );
        } catch (charErr) {
          logger.error(
            { characterId: character.id, characterName: character.name, error: charErr },
            '[BattleNetSync] Error syncing individual character'
          );
          // Continue to the next character even if one fails
        }
      }

      logger.info(
        { guildId: guild.id },
        '[BattleNetSync] Completed individual character sync for guild'
      );

    } catch (charSyncErr) {
      logger.error(
        { guildId: guild.id, error: charSyncErr },
        '[BattleNetSync] Error during individual character sync orchestration'
      );
    }

    logger.info(
      { guildId: guild.id },
      '[BattleNetSync] Orchestrated guild sync completed successfully'
    );
  } catch (err) {
    logger.error(
      { guildId: guild.id, error: err },
      '[BattleNetSync] Error during member or rank sync'
    );
  }
}

/**
 * Orchestrates a full Battle.net sync for all guilds.
 * Loads all guilds from the database and calls orchestrateGuildSync for each.
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
    logger.info({ count: guilds.length }, '[BattleNetSync] Starting orchestrated sync for all guilds');

    for (const guild of guilds) {
      logger.info({ guildId: guild.id }, '[BattleNetSync] Starting orchestrated sync for guild');
      try {
        await orchestrateGuildSync(
          apiClient,
          guildModel,
          userModel,
          guildMemberModel,
          rankModel,
          characterModel,
          guild
        );
        logger.info({ guildId: guild.id }, '[BattleNetSync] Orchestrated guild sync completed');
      } catch (guildErr) {
        logger.error({ err: guildErr, guildId: guild.id }, '[BattleNetSync] Orchestrated guild sync failed');
      }
    }

    logger.info('[BattleNetSync] All guilds orchestrated sync completed');
  } catch (err) {
    logger.error({ err }, '[BattleNetSync] Failed to run full orchestrated sync');
    throw err;
  }
}