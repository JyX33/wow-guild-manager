import * as battleNetService from '../services/battlenet.service';
import * as guildModel from '../models/guild.model';
import * as characterModel from '../models/character.model';
import * as guildMemberModel from '../models/guild_member.model';
import * as rankModel from '../models/rank.model';
import * as userModel from '../models/user.model'; // Needed? Maybe for leader lookup
import { DbGuild, BattleNetGuildRoster, BattleNetGuild, DbCharacter, BattleNetGuildMember, BattleNetCharacter, BattleNetCharacterEquipment, BattleNetMythicKeystoneProfile, BattleNetProfessions } from '../../../shared/types/guild'; // Added DbCharacter & BattleNetGuildMember
import { AppError } from '../utils/error-handler';
import config from '../config'; // For client credentials
import { withTransaction } from '../utils/transaction'; // Added withTransaction import
import db from '../db/db'; // Import db for raw queries if needed

// TODO: Implement caching mechanism (e.g., Redis, in-memory cache) if desired

class BattleNetSyncService {

  private isSyncing: boolean = false;
  private apiClientToken: string | null = null;
  private tokenExpiry: Date | null = null;

  /**
   * Ensures a valid client credentials token is available.
   */
  private async ensureClientToken(): Promise<string> {
    const now = new Date();
    // Refresh token if it's missing or expiring within the next minute
    if (!this.apiClientToken || !this.tokenExpiry || this.tokenExpiry <= new Date(now.getTime() + 60 * 1000)) {
      console.log('[SyncService] Obtaining/Refreshing Client Credentials Token...');
      try {
        // Assuming battleNetService needs adaptation for client_credentials grant
        // This might require adding a new method to battleNetService or handling it here.
        const tokenResponse = await battleNetService.getClientCredentialsToken(); // Needs implementation in battleNetService

        this.apiClientToken = tokenResponse.access_token;
        this.tokenExpiry = new Date(now.getTime() + tokenResponse.expires_in * 1000);
        console.log('[SyncService] Client Credentials Token obtained/refreshed.');
      } catch (error) {
        this.apiClientToken = null;
        this.tokenExpiry = null;
        console.error('[SyncService] Failed to obtain/refresh Client Credentials Token:', error);
        throw new AppError('Failed to get API token for sync service', 500, { code: 'SYNC_AUTH_ERROR' });
        }
      }
      // Throw if token is still null after attempting fetch/refresh
      if (!this.apiClientToken) {
         throw new AppError('API token is null after fetch attempt', 500, { code: 'SYNC_AUTH_ERROR' });
      }
      return this.apiClientToken;
    }

  /**
   * Syncs basic data and roster for a single guild.
   */
  async syncGuild(guild: DbGuild): Promise<void> {
    console.log(`[SyncService] Starting sync for guild: ${guild.name} (${guild.realm})`);
    try {
      const token = await this.ensureClientToken();

      // 1. Fetch Guild Data from Battle.net
      const guildData = await battleNetService.getGuildData(guild.realm, guild.name, token, guild.region);

      // 2. Fetch Guild Roster from Battle.net
      const guildRoster = await battleNetService.getGuildRoster(guild.region, guild.realm, guild.name, token);

      // 3. Update Guild Record in DB
      const updatePayload: Partial<DbGuild> = {
        guild_data_json: guildData,
        roster_json: guildRoster,
        bnet_guild_id: guildData.id, // Store the Battle.net ID
        last_updated: new Date().toISOString(), // Timestamp for guild data fetch
        last_roster_sync: new Date().toISOString(), // Timestamp for roster fetch
        member_count: guildRoster.members.length, // Update member_count
      };

      // Find Guild Master from roster
      const guildMasterMember = guildRoster.members.find(m => m.rank === 0);
      if (guildMasterMember) {
         // Try to find the user associated with the Guild Master character
         const guildMasterUser = await userModel.findByCharacterName(
             guildMasterMember.character.name,
             guildMasterMember.character.realm.slug // Use slug from roster data
         );
         if (guildMasterUser) {
             updatePayload.leader_id = guildMasterUser.id;
             console.log(`[SyncService] Found user ${guildMasterUser.id} for GM ${guildMasterMember.character.name}, updating leader_id.`);
         } else {
             console.log(`[SyncService] User for GM ${guildMasterMember.character.name} not found in DB.`);
             // Optionally clear leader_id if GM character no longer linked to a user?
             // updatePayload.leader_id = null;
         }
      } else {
          console.log(`[SyncService] No Guild Master (rank 0) found in roster for ${guild.name}.`);
          // Optionally clear leader_id if no GM found?
          // updatePayload.leader_id = null;
      }


      await guildModel.update(guild.id, updatePayload);
      console.log(`[SyncService] Updated guild ${guild.name} with fresh data and roster.`);

      // 4. Sync Guild Members Table
      await this.syncGuildMembersTable(guild.id, guildRoster);

      // 5. Sync Ranks Table (Based on old guildRosterService logic)
      await this.syncGuildRanksTable(guild.id, guildRoster);
      await this.updateRankMemberCounts(guild.id, guildRoster); // Update counts in ranks table


    } catch (error) {
      console.error(`[SyncService] Error syncing guild ${guild.name} (ID: ${guild.id}):`, error);
      // Optionally update guild record with error state/timestamp
    }
  }

  /**
   * Syncs the dedicated guild_members table based on roster data.
   */
  async syncGuildMembersTable(guildId: number, roster: BattleNetGuildRoster): Promise<void> {
    console.log(`[SyncService] Syncing guild_members table for guild ID: ${guildId}. Roster size: ${roster.members.length}`);
    try {
      await withTransaction(async (client) => { // Use transaction helper
        // 1. Fetch existing members for the guild (including character_id for linking)
        const existingMembersResult = await client.query(
          `SELECT id, character_id, character_name, rank FROM guild_members WHERE guild_id = $1`,
          [guildId]
        );
        // Define type for DB row
        type GuildMemberRow = { id: number; character_id: number | null; character_name: string | null; realm: string | null; rank: number };
        const existingMembersMap = new Map<string, { id: number; character_id: number | null; rank: number }>();
        existingMembersResult.rows.forEach((row: GuildMemberRow) => {
          // Use character_name and realm as a key for matching
          // Ensure realm is available on guild_members or fetched differently if needed
          const key = `${row.character_name?.toLowerCase()}-${row.realm?.toLowerCase()}`;
          existingMembersMap.set(key, { id: row.id, character_id: row.character_id, rank: row.rank });
        });
        console.log(`[SyncService] Found ${existingMembersMap.size} existing members in DB for guild ${guildId}.`);

        const rosterMembersMap = new Map<string, BattleNetGuildMember>();
        roster.members.forEach(member => {
          const key = `${member.character.name.toLowerCase()}-${member.character.realm.slug.toLowerCase()}`;
          rosterMembersMap.set(key, member);
        });

         const membersToAdd: { rosterMember: BattleNetGuildMember; characterId: number }[] = [];
         // Make rank and characterId optional in the update type, as they might not always change
         const membersToUpdate: { memberId: number; rank?: number; characterId?: number; memberData?: BattleNetGuildMember }[] = [];
         const memberIdsToRemove: number[] = [];
         const charactersToCreate: Partial<DbCharacter>[] = [];
        const characterLinkUpdates: { memberId: number; characterId: number }[] = [];

        // Pre-fetch or identify characters that might need creation
        const potentialNewCharKeys = roster.members
            .map(m => `${m.character.name.toLowerCase()}-${m.character.realm.slug.toLowerCase()}`)
            .filter(key => !existingMembersMap.has(key));

        // TODO: Improve efficiency - Query only for characters matching potentialNewCharKeys
        const existingCharacters = await characterModel.findAll(); // Inefficient, better to query by name/realm list
        const existingCharacterMap = new Map<string, number>();
        existingCharacters.forEach(char => {
            const key = `${char.name.toLowerCase()}-${char.realm.toLowerCase()}`;
            existingCharacterMap.set(key, char.id);
        });


        // 2. Compare and identify changes
        for (const [key, rosterMember] of rosterMembersMap.entries()) {
          const existingMember = existingMembersMap.get(key);
          const existingCharacterId = existingCharacterMap.get(key);

          if (existingMember) {
            // Member exists in guild_members table
            let needsUpdate = false;
            const updateData: { rank?: number; memberData?: BattleNetGuildMember; characterId?: number } = {};

            if (existingMember.rank !== rosterMember.rank) {
              updateData.rank = rosterMember.rank;
              needsUpdate = true;
            }
            // Check if character link is missing or incorrect (should ideally not happen if sync is robust)
            if (!existingMember.character_id && existingCharacterId) {
                updateData.characterId = existingCharacterId;
                needsUpdate = true;
            }
            // Always update member_data_json? Or only if rank changes? Let's update always for simplicity.
            updateData.memberData = rosterMember;
            needsUpdate = true; // Force update to refresh member_data_json

            if (needsUpdate) {
                membersToUpdate.push({ memberId: existingMember.id, ...updateData });
            }

            existingMembersMap.delete(key); // Mark as processed
          } else {
            // Member is new to the guild_members table
            if (existingCharacterId) {
                // Character already exists in characters table
                membersToAdd.push({ rosterMember, characterId: existingCharacterId });
            } else {
                // Character also needs to be created
                charactersToCreate.push({
                    // user_id might be null initially
                    name: rosterMember.character.name,
                    realm: rosterMember.character.realm.slug,
                    class: rosterMember.character.playable_class?.name || 'Unknown', // Provide default if class is missing
                    level: rosterMember.character.level,
                    role: 'DPS', // Default role
                    is_main: false,
                    // profile_json will be added by character sync later
                });
                // We'll link character_id after creation
            }
          }
        }

        // Any members left in existingMembersMap are no longer in the roster
        for (const [, existingMember] of existingMembersMap.entries()) {
          memberIdsToRemove.push(existingMember.id);
        }

        console.log(`[SyncService] Changes: Add ${membersToAdd.length + charactersToCreate.length}, Update ${membersToUpdate.length}, Remove ${memberIdsToRemove.length}`);

        // 3. Create new character records if any
        const createdCharacterMap = new Map<string, number>();
        for (const charData of charactersToCreate) {
            try {
                const newChar = await characterModel.create(charData); // Use model's create
                const key = `${newChar.name.toLowerCase()}-${newChar.realm.toLowerCase()}`;
                createdCharacterMap.set(key, newChar.id);
                console.log(`[SyncService] Created character ${newChar.name}-${newChar.realm} with ID ${newChar.id}`);
            } catch (createError) {
                console.error(`[SyncService] Failed to create character record for ${charData.name}:`, createError);
            }
        }

        // 4. Add new guild members
        for (const { rosterMember } of membersToAdd) {
            const key = `${rosterMember.character.name.toLowerCase()}-${rosterMember.character.realm.slug.toLowerCase()}`;
            const characterId = existingCharacterMap.get(key) || createdCharacterMap.get(key);

            if (!characterId) {
                console.error(`[SyncService] Could not find/create character ID for new member ${rosterMember.character.name}`);
                continue;
            }

            await client.query(
              `INSERT INTO guild_members (guild_id, character_id, rank, character_name, character_class, member_data_json, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
               ON CONFLICT (guild_id, character_id) DO NOTHING`,
              [
                guildId,
                characterId,
                rosterMember.rank,
                rosterMember.character.name,
                rosterMember.character.playable_class.name,
                JSON.stringify(rosterMember)
              ]
            );
        }
        // Add members whose characters were just created
        for (const charData of charactersToCreate) {
            const key = `${charData.name?.toLowerCase()}-${charData.realm?.toLowerCase()}`;
            const characterId = createdCharacterMap.get(key);
            const rosterMember = rosterMembersMap.get(key); // Find the corresponding roster member

            if (!characterId || !rosterMember) {
                console.error(`[SyncService] Mismatch finding character/roster data for ${key}`);
                continue;
            }
             await client.query(
              `INSERT INTO guild_members (guild_id, character_id, rank, character_name, character_class, member_data_json, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
               ON CONFLICT (guild_id, character_id) DO NOTHING`,
              [
                guildId,
                characterId,
                rosterMember.rank,
                rosterMember.character.name,
                rosterMember.character.playable_class.name,
                JSON.stringify(rosterMember)
              ]
            );
        }


        // 5. Update existing members
        for (const memberToUpdate of membersToUpdate) {
          const updates = [];
          const values = [];
          let valueIndex = 1;

          if (memberToUpdate.rank !== undefined) {
              updates.push(`rank = $${valueIndex++}`);
              values.push(memberToUpdate.rank);
          }
          if (memberToUpdate.characterId !== undefined) {
              updates.push(`character_id = $${valueIndex++}`);
              values.push(memberToUpdate.characterId);
          }
           if (memberToUpdate.memberData !== undefined) {
              updates.push(`member_data_json = $${valueIndex++}`);
              values.push(JSON.stringify(memberToUpdate.memberData));
           }
          updates.push(`updated_at = NOW()`);

          if (updates.length > 1) { // Only update if there are changes + updated_at
               values.push(memberToUpdate.memberId); // Add the ID for the WHERE clause
               await client.query(
                   `UPDATE guild_members SET ${updates.join(', ')} WHERE id = $${valueIndex}`,
                   values
               );
          }
        }

        // 6. Remove members no longer in roster
        if (memberIdsToRemove.length > 0) {
          await client.query(
            `DELETE FROM guild_members WHERE id = ANY($1::int[])`,
            [memberIdsToRemove]
          );
        }

        console.log(`[SyncService] Finished syncing guild_members table for guild ID: ${guildId}.`);
      }); // End transaction
    } catch (error) {
      throw new AppError(`Error syncing guild members table for guild ${guildId}: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }

  /**
   * Ensures ranks from the roster exist in the ranks table.
   * Based on logic from old guildRosterService.syncGuildRanks
   */
  async syncGuildRanksTable(guildId: number, guildRoster: BattleNetGuildRoster): Promise<void> {
    try {
      const existingRanks = await rankModel.getGuildRanks(guildId);
      const rosterRanks = new Set<number>();
      guildRoster.members.forEach(member => rosterRanks.add(member.rank));

      for (const rankId of rosterRanks) {
        const existingRank = existingRanks.find(r => r.rank_id === rankId);
        if (!existingRank) {
          const defaultName = rankId === 0 ? "Guild Master" : `Rank ${rankId}`;
          console.log(`[SyncService] Creating default rank entry for guild ${guildId}, rank ${rankId}`);
          // Use setGuildRank which handles create/update
          await rankModel.setGuildRank(guildId, rankId, defaultName);
        }
      }
    } catch (error) {
       console.error(`[SyncService] Error syncing ranks table for guild ${guildId}:`, error);
       // Continue sync even if rank sync fails?
    }
  }

  /**
   * Updates the member_count in the ranks table.
   * Based on logic from old guildRosterService.updateGuildRankInfo
   */
  async updateRankMemberCounts(guildId: number, rosterData: BattleNetGuildRoster): Promise<void> {
    try {
        const rankCounts: { [key: number]: number } = {};
        rosterData.members.forEach(member => {
            const rankId = member.rank;
            rankCounts[rankId] = (rankCounts[rankId] || 0) + 1;
        });

        // Update the member counts in the rank table
        for (const rankIdStr in rankCounts) {
            const rankId = parseInt(rankIdStr);
            // Ensure the rank exists before trying to update count (syncGuildRanksTable should handle creation)
            const rankExists = await rankModel.findOne({ guild_id: guildId, rank_id: rankId });
            if (rankExists) {
                 // Assuming rankModel has updateMemberCount or similar method
                 // If not, use rankModel.update(rankExists.id, { member_count: rankCounts[rankId] })
                 await rankModel.updateMemberCount(
                    guildId,
                    rankId,
                    rankCounts[rankId]
                 );
            } else {
                console.warn(`[SyncService] Rank ${rankId} not found for guild ${guildId} when updating member count.`);
            }
        }
    } catch (error) {
        console.error(`[SyncService] Error updating rank member counts for guild ${guildId}:`, error);
    }
  }


  /**
   * Syncs character details (profile, equipment, etc.).
   */
  async syncCharacter(character: DbCharacter): Promise<void> {
    console.log(`[SyncService] Starting sync for character: ${character.name} (${character.realm}) ID: ${character.id}`);
     try {
        const token = await this.ensureClientToken();

        // Fetch enhanced data using battleNetService.getEnhancedCharacterData
        // Note: getEnhancedCharacterData fetches profile, equipment, mythic keystone, professions
        const enhancedData = await battleNetService.getEnhancedCharacterData(
            character.realm,
            character.name,
            token,
            character.region // Assuming region is on the DbCharacter object
        );

        // Prepare update payload - Pass objects directly, DB driver handles JSONB conversion
        const updatePayload: Partial<DbCharacter> = {
            profile_json: enhancedData, // Pass the object directly
            equipment_json: enhancedData.equipment, // Pass the object directly
            mythic_profile_json: enhancedData.mythicKeystone === null ? undefined : enhancedData.mythicKeystone, // Handle null by assigning undefined
            professions_json: enhancedData.professions, // Pass the array directly
            level: enhancedData.level, // Update level
            class: enhancedData.character_class.name, // Update class
            // Update other relevant fields if necessary (e.g., average_item_level?)
            last_synced_at: new Date().toISOString()
        };

        // Update character record in DB
        await characterModel.update(character.id, updatePayload);
        console.log(`[SyncService] Successfully synced character ${character.name} (ID: ${character.id})`);

     } catch (error) {
       console.error(`[SyncService] Error syncing character ${character.name} (ID: ${character.id}):`, error);
       // Optionally update character record with error state/timestamp
     }
  }

  /**
   * Main sync function to run periodically.
   */
  async runSync(): Promise<void> {
    if (this.isSyncing) {
      console.log('[SyncService] Sync already in progress. Skipping.');
      return;
    }

    console.log('[SyncService] Starting background sync run...');
    this.isSyncing = true;

    try {
      // 1. Sync Guilds (fetch outdated guilds)
      const outdatedGuilds = await guildModel.findOutdatedGuilds(); // Assumes this method exists/works
      console.log(`[SyncService] Found ${outdatedGuilds.length} guilds to sync.`);
      for (const guild of outdatedGuilds) {
        await this.syncGuild(guild);
        // Optional: Add delay between guilds to spread load/rate limits
        // await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // 2. Sync Characters (fetch outdated characters)
      const outdatedCharacters = await characterModel.findOutdatedCharacters(); // Use the new method
      console.log(`[SyncService] Found ${outdatedCharacters.length} characters to sync.`);
      for (const character of outdatedCharacters) {
         await this.syncCharacter(character);
         // Optional delay to spread load
         // await new Promise(resolve => setTimeout(resolve, 500)); // e.g., 500ms delay
      }

      console.log('[SyncService] Background sync run finished.');

    } catch (error) {
      console.error('[SyncService] Error during sync run:', error);
    } finally {
      this.isSyncing = false;
    }
  }
}

// Export a singleton instance
const battleNetSyncService = new BattleNetSyncService();
export default battleNetSyncService;