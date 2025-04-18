import { BattleNetGuildRoster } from '../../../../shared/types/guild.js';
import { RankModel } from '../../models/rank.model.js';
import type { GuildRank } from '../../../../shared/types/guild.js';
import logger from '../../utils/logger.js';

export async function syncGuildRanks(rankModel: RankModel, guildId: number, bnetRoster: BattleNetGuildRoster): Promise<void> {
  const logContext = { guildId };
  logger.info(logContext, `[SyncService] Starting rank sync.`);
  try {
    const rankCounts: { [key: number]: number } = {};
    const rosterRankIds = new Set<number>();
    bnetRoster.members.forEach(member => {
      const rankId = member.rank;
      rankCounts[rankId] = (rankCounts[rankId] || 0) + 1;
      rosterRankIds.add(rankId);
    });
    logger.debug({ ...logContext, rankIds: Array.from(rosterRankIds), counts: rankCounts }, `[SyncService] Calculated rank counts from BNet roster.`);

    const existingRanks = await rankModel.getGuildRanks(guildId);
    const existingRankMap = new Map(existingRanks.map((r: GuildRank) => [r.rank_id, r]));
    logger.debug({ ...logContext, count: existingRankMap.size }, `[SyncService] Fetched ${existingRankMap.size} existing ranks from DB.`);

    const updatePromises: Promise<void>[] = [];

    for (const rankId of rosterRankIds) {
      const rankRecord = existingRankMap.get(rankId);
      const currentCount = rankCounts[rankId] || 0;
      const rankLogContext = { ...logContext, rankId };

      if (!rankRecord) {
        const defaultName = rankId === 0 ? "Guild Master" : `Rank ${rankId}`;
        logger.info(rankLogContext, `[SyncService] Rank ${rankId} not found locally. Ensuring rank exists with default name "${defaultName}" and setting count to ${currentCount}.`);
        updatePromises.push(
          rankModel.setGuildRank(guildId, rankId, defaultName)
            .then(() => rankModel.updateMemberCount(guildId, rankId, currentCount))
            .catch((err: unknown) => logger.error({ err, ...rankLogContext }, `[SyncService] Failed to create/update rank ${rankId} or its count.`))
        );
      } else {
        if (rankRecord.member_count !== currentCount) {
          logger.debug(rankLogContext, `[SyncService] Updating member count for rank ${rankId} from ${rankRecord.member_count} to ${currentCount}.`);
          updatePromises.push(
            rankModel.updateMemberCount(guildId, rankId, currentCount)
              .catch((err: unknown) => logger.error({ err, ...rankLogContext }, `[SyncService] Failed to update member count for rank ${rankId}.`))
          );
        } else {
          logger.trace(rankLogContext, `[SyncService] Rank ${rankId} member count (${currentCount}) is unchanged.`);
        }
        existingRankMap.delete(rankId);
      }
    }

    for (const [rankId, rankRecord] of existingRankMap.entries()) {
      if (rankRecord.member_count !== 0) {
        const rankLogContext = { ...logContext, rankId };
        logger.info(rankLogContext, `[SyncService] Rank ${rankId} ("${rankRecord.rank_name}") no longer in BNet roster. Setting member count to 0.`);
        updatePromises.push(
          rankModel.updateMemberCount(guildId, rankId, 0)
            .catch((err: unknown) => logger.error({ err, ...rankLogContext }, `[SyncService] Failed to set member count to 0 for rank ${rankId}.`))
        );
      }
    }

    const results = await Promise.allSettled(updatePromises);
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        logger.warn({ ...logContext, reason: result.reason }, `[SyncService] A rank update/creation promise failed (already logged).`);
      }
    });

    logger.info(logContext, `[SyncService] Finished rank sync.`);
  } catch (error: unknown) {
    logger.error({ err: error, ...logContext }, `[SyncService] Critical error during rank sync setup.`);
    throw error; // Re-throw the error
  }
}