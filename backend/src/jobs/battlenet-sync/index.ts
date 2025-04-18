// Modular Battle.net sync entry point

import { syncGuild } from './core-guild-sync.js';
import { syncGuildMembersTable } from './guild-members-sync.js';
import { syncGuildRanks } from './guild-ranks-sync.js';
import { GuildModel } from '../../models/guild.model.js';
import { UserModel } from '../../models/user.model.js';
import { GuildMemberModel } from '../../models/guild_member.model.js';
import { RankModel } from '../../models/rank.model.js';
import logger from '../../utils/logger.js';
import { BattleNetApiClient } from '../../services/battlenet-api.client.js';
import { CharacterModel } from '../../models/character.model.js';
import { syncCharacter } from './character-sync.js';

import pLimit from 'p-limit';

import { DbGuild } from '../../../../shared/types/guild.js';
import { BattleNetRegion } from '../../../../shared/types/user.js';

export interface SyncDependencies {
  apiClient: BattleNetApiClient;
  guildModel: GuildModel;
  userModel: UserModel;
  guildMemberModel: GuildMemberModel;
  rankModel: RankModel;
  characterModel: CharacterModel;
}

/**
 * Orchestrates the sync process for a single guild:
 * 1. Calls syncGuild to fetch and update core guild info.
 * 2. If successful, syncs members and ranks.
 * 3. Handles and logs errors at each stage.
 */
export async function orchestrateGuildSync(
  dependencies: SyncDependencies,
  guild: DbGuild
): Promise<void> {
  // Step 1: Sync core guild info
  const result = await syncGuild(dependencies.apiClient, dependencies.guildModel, dependencies.userModel, guild);
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
      dependencies.guildMemberModel,
      dependencies.characterModel,
      guild.id,
      bnetGuildRoster,
      guild.region as BattleNetRegion
    );
    // Step 3: Sync ranks
    await syncGuildRanks(
      dependencies.rankModel,
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
      const charactersToSync = await dependencies.characterModel.findAllByGuildId(guild.id);

      for (const character of charactersToSync) {
        try {
          await syncCharacter(
            dependencies.apiClient,
            dependencies.characterModel,
            dependencies.guildMemberModel,
            dependencies.guildModel, // guildModel is available in orchestrateGuildSync params
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
export async function runSync(dependencies: SyncDependencies): Promise<void> {
  const { guildModel } = dependencies;

  try {
    const guilds: DbGuild[] = await guildModel.findAll({ exclude_from_sync: false });
    logger.info({ count: guilds.length }, '[BattleNetSync] Starting orchestrated sync for active guilds');

    const limit = pLimit(5); // Limit to 5 concurrent guild syncs

    const syncPromises = guilds.map((guild) =>
      limit(async () => { // Wrap the async operation in the limiter
        logger.info({ guildId: guild.id }, '[BattleNetSync] Starting orchestrated sync for guild (concurrent)');
        try {
          await orchestrateGuildSync(
            dependencies,
            guild
          );
          logger.info({ guildId: guild.id }, '[BattleNetSync] Orchestrated guild sync completed');
        } catch (guildErr) {
          // orchestrateGuildSync already logs internal errors, so this catch might only
          // catch very unexpected errors during the setup of the call itself.
          // Keep logging here for safety, but note potential redundancy.
          logger.error({ err: guildErr, guildId: guild.id }, '[BattleNetSync] Orchestrated guild sync failed unexpectedly');
        }
      })
    );

    const results = await Promise.allSettled(syncPromises);

    // Optional: Log summary of results (e.g., how many succeeded/failed)
    const failedCount = results.filter(r => r.status === 'rejected').length;
    if (failedCount > 0) {
         logger.warn({ failedCount, total: guilds.length }, `[BattleNetSync] Completed sync run with ${failedCount} guild syncs failing.`);
    } else {
         logger.info({ total: guilds.length }, `[BattleNetSync] Completed sync run successfully for all ${guilds.length} active guilds.`);
    }
  } catch (err) {
    logger.error({ err }, '[BattleNetSync] Failed to run full orchestrated sync');
    throw err;
  }
}