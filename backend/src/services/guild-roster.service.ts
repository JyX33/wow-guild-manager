import * as guildModel from '../models/guild.model';
import * as characterModel from '../models/character.model';
import * as rankModel from '../models/rank.model';
import * as battleNetService from './battlenet.service';
import { BattleNetGuildRoster } from '../../../shared/types/guild';

export const synchronizeGuildRoster = async (guildId: number, accessToken: string) => {
  const guild = await guildModel.findById(guildId);
  if (!guild) throw new Error('Guild not found');
  
  // Fetch roster from Battle.net
  const rosterData = await battleNetService.getGuildRoster(
    guild.region,
    guild.realm,
    guild.name,
    accessToken
  );
  
  // Sync guild ranks
  await syncGuildRanks(guildId, rosterData);
  
  // Update rank counts
  await updateGuildRankInfo(guildId, rosterData);
  
  // Update each character in our database with correct guild_id
  for (const member of rosterData.members) {
    const character = await characterModel.findByNameRealm(
      member.character.name,
      member.character.realm.slug
    );
    
    if (character) {
      // Update guild association
      await characterModel.update(character.id, {
        guild_id: guildId,
        // Update rank information as well
        guild_rank: member.rank
      });
    }
  }
  
  // Update guild's last_updated timestamp
  await guildModel.update(guildId, {
    last_updated: new Date().toISOString(),
    last_roster_sync: new Date().toISOString()
  });
  
  return rosterData;
};

export const syncGuildRanks = async (guildId: number, guildRoster: BattleNetGuildRoster) => {
  // Get existing custom ranks
  const existingRanks = await rankModel.getGuildRanks(guildId);
  
  // Find all unique ranks in the roster
  const rosterRanks = new Set();
  guildRoster.members.forEach(member => {
    rosterRanks.add(member.rank);
  });
  
  // For each roster rank, ensure it exists in database
  for (const rankId of rosterRanks) {
    const existingRank = existingRanks.find(r => r.rank_id === rankId);
    
    if (!existingRank) {
      // Create default rank with Battle.net's naming convention
      const defaultName = rankId === 0 ? "Guild Master" : `Rank ${rankId}`;
      
      await rankModel.setGuildRank(
        guildId,
        rankId,
        defaultName
      );
    }
  }
};

export const updateGuildRankInfo = async (guildId: number, rosterData: BattleNetGuildRoster) => {
  // Get the guild first
  const guild = await guildModel.findById(guildId);
  
  // Count members by rank
  const rankCounts = {};
  rosterData.members.forEach(member => {
    const rankId = member.rank;
    rankCounts[rankId] = (rankCounts[rankId] || 0) + 1;
  });
  
  // Store this information in guild_data
  const guildData = guild.guild_data || {};
  
  await guildModel.update(guildId, {
    guild_data: {
      ...guildData,
      rank_counts: rankCounts
    }
  });
  
  // Also update the rank counts in the rank table
  for (const rankId in rankCounts) {
    await rankModel.updateMemberCount(
      guildId,
      parseInt(rankId),
      rankCounts[rankId]
    );
  }
};