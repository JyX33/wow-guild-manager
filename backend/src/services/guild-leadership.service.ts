import * as guildModel from '../models/guild.model.js';
import logger from '../utils/logger.js'; // Import the logger

export const verifyGuildLeadership = async (guildId: number, userId: number): Promise<boolean> => {
  // First check database for leader_id
  const guild = await guildModel.findById(guildId);

  if (guild && guild.leader_id === userId) {
    // If last_updated is recent (within 1 day), trust the database
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    if (guild.last_updated && new Date(guild.last_updated) > oneDayAgo) {
      return true;
    }
  }

  // If not confirmed by recent DB data, assume not leader.
  // The background sync service is responsible for updating leader_id.
  logger.info(
    { guildId, userId, storedLeaderId: guild?.leader_id, lastUpdated: guild?.last_updated },
    `[Leadership Check] DB check failed or data outdated for guild ${guildId}, user ${userId}. Relying on stored leader_id: ${guild?.leader_id}`
  );
  return guild?.leader_id === userId; // Return based on potentially stale DB data
};