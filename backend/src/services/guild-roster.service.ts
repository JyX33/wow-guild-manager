// This service is deprecated.
// Roster synchronization logic has been moved to backend/src/jobs/battlenet-sync.service.ts
// The sync service interacts directly with models.

// export const synchronizeGuildRoster = async (guildId: number, accessToken: string) => { ... };
// export const syncGuildRanks = async (guildId: number, guildRoster: BattleNetGuildRoster) => { ... };
// export const updateGuildRankInfo = async (guildId: number, rosterData: BattleNetGuildRoster) => { ... };

console.warn("Guild Roster Service is deprecated and should not be used directly.");