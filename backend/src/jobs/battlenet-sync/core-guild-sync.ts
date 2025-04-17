import { BattleNetGuild, BattleNetGuildMember, BattleNetGuildRoster, DbGuild } from '../../../../shared/types/guild.js';
import { BattleNetRegion } from '../../../../shared/types/user.js';
import { UserModel } from '../../models/user.model.js';
import { GuildModel } from '../../models/guild.model.js';
import logger from '../../utils/logger.js';
import { createSlug } from '../../utils/slugify.js';
import axios from 'axios';

export async function updateCoreGuildData(
  guildModel: GuildModel,
  userModel: UserModel,
  guild: DbGuild,
  bnetGuildData: BattleNetGuild,
  bnetGuildRoster: BattleNetGuildRoster
): Promise<void> {
  const logContext = { guildId: guild.id, guildName: guild.name, realm: guild.realm, region: guild.region };
  logger.debug(logContext, `[SyncService] Preparing to update core data for guild.`);

  const updatePayload: Partial<DbGuild> = {
    guild_data_json: bnetGuildData,
    roster_json: bnetGuildRoster,
    bnet_guild_id: bnetGuildData.id,
    last_updated: new Date().toISOString(),
    last_roster_sync: new Date().toISOString(),
    member_count: bnetGuildRoster.members.length,
    leader_id: null,
  };

  const guildMasterMember = bnetGuildRoster.members.find((m: BattleNetGuildMember) => m.rank === 0);

  if (guildMasterMember) {
    const gmName = guildMasterMember.character.name;
    const gmRealmSlug = guildMasterMember.character.realm.slug;
    const gmLogContext = { ...logContext, gmName, gmRealmSlug };
    logger.debug(gmLogContext, `[SyncService] Found potential GM in roster: ${gmName}-${gmRealmSlug}. Attempting to link user.`);

    try {
      const guildMasterUser = await userModel.findByCharacterName(gmName, gmRealmSlug);
      if (guildMasterUser) {
        updatePayload.leader_id = guildMasterUser.id;
        logger.info({ ...gmLogContext, userId: guildMasterUser.id }, `[SyncService] Linked user ID ${guildMasterUser.id} as leader for guild.`);
      } else {
        logger.info(gmLogContext, `[SyncService] User record for GM ${gmName}-${gmRealmSlug} not found locally. Guild leader remains unlinked.`);
      }
    } catch (userLookupError: unknown) {
      logger.error({ err: userLookupError, ...gmLogContext }, `[SyncService] Error looking up user for potential GM ${gmName}-${gmRealmSlug}. Guild leader remains unlinked.`);
    }
  } else {
    logger.info(logContext, `[SyncService] No Guild Master (rank 0) found in fetched roster. Guild leader remains unlinked.`);
  }

  try {
    await guildModel.update(guild.id, updatePayload);
    logger.info(logContext, `[SyncService] Successfully updated core guild data.`);
  } catch (updateError: unknown) {
    logger.error({ err: updateError, ...logContext }, `[SyncService] Failed to update core guild data in database.`);
  }
}

/**
 * Fetches core guild and roster data from Battle.net, updates core guild data, and returns the results.
 * No longer performs member or rank sync; those are handled by the orchestrator.
 *
 * @param apiClient - API client for Battle.net
 * @param guildModel - Guild model for DB operations
 * @param userModel - User model for DB operations
 * @param guild - The guild to sync
 * @returns An object indicating success and containing fetched data, or failure and error info
 */
export async function syncGuild(
  apiClient: any,
  guildModel: GuildModel,
  userModel: UserModel,
  guild: DbGuild
): Promise<
  | { success: true; bnetGuildData: BattleNetGuild; bnetGuildRoster: BattleNetGuildRoster }
  | { success: false; error: string }
> {
  const guildIdentifier = `${guild.name} (${guild.realm} - ${guild.region})`;
  const logContext = { guildId: guild.id, guildName: guild.name, realm: guild.realm, region: guild.region };
  logger.info(logContext, `[SyncService] Starting sync for guild: ${guildIdentifier}`);

  try {
    const realmSlug = createSlug(guild.realm);
    const guildNameSlug = createSlug(guild.name);
    const region = guild.region as BattleNetRegion;

    let bnetGuildData: BattleNetGuild;
    try {
      logger.debug(logContext, `[SyncService] Fetching core guild data from Battle.net for ${guildIdentifier}.`);
      bnetGuildData = await apiClient.getGuildData(realmSlug, guildNameSlug, region);
      logger.debug(logContext, `[SyncService] Successfully fetched core guild data.`);
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        logger.warn(logContext, `[SyncService] Guild ${guildIdentifier} not found on Battle.net (404). Marking to exclude from future sync.`);
        await guildModel.update(guild.id, { exclude_from_sync: true, last_updated: new Date().toISOString() });
        return { success: false, error: 'Guild not found on Battle.net (404)' };
      }
      logger.error({ err: error, ...logContext }, `[SyncService] Failed to fetch core guild data for ${guildIdentifier}.`);
      return { success: false, error: 'Failed to fetch core guild data' };
    }

    let bnetGuildRoster: BattleNetGuildRoster;
    try {
      logger.debug(logContext, `[SyncService] Fetching guild roster data from Battle.net for ${guildIdentifier}.`);
      bnetGuildRoster = await apiClient.getGuildRoster(region, realmSlug, guildNameSlug);
      logger.debug({ ...logContext, rosterSize: bnetGuildRoster.members.length }, `[SyncService] Successfully fetched guild roster with ${bnetGuildRoster.members.length} members.`);
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        logger.warn(logContext, `[SyncService] Guild roster for ${guildIdentifier} not found on Battle.net (404). Marking to exclude from future sync.`);
        await guildModel.update(guild.id, { exclude_from_sync: true, last_updated: new Date().toISOString() });
        return { success: false, error: 'Guild roster not found on Battle.net (404)' };
      }
      logger.error({ err: error, ...logContext }, `[SyncService] Failed to fetch guild roster data for ${guildIdentifier}.`);
      return { success: false, error: 'Failed to fetch guild roster data' };
    }

    await updateCoreGuildData(guildModel, userModel, guild, bnetGuildData, bnetGuildRoster);

    logger.info(logContext, `[SyncService] Successfully completed sync cycle for guild ${guildIdentifier}.`);
    return { success: true, bnetGuildData, bnetGuildRoster };
  } catch (error: unknown) {
    logger.error({ err: error, ...logContext }, `[SyncService] Unhandled error during sync for guild ${guildIdentifier}. Sync cycle for this guild aborted.`);
    try {
      await guildModel.update(guild.id, { last_updated: new Date().toISOString() });
    } catch (updateError) {
      logger.error({ err: updateError, ...logContext }, `[SyncService] Failed to update guild timestamp after unhandled sync error.`);
    }
    return { success: false, error: 'Unhandled error during sync' };
  }
}