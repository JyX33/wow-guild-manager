// Removed direct import of battleNetService
import { BattleNetApiClient } from '../services/battlenet-api.client'; // Added import
import * as guildModel from '../models/guild.model';
import * as characterModel from '../models/character.model';
import * as rankModel from '../models/rank.model';
import * as userModel from '../models/user.model'; // Needed? Maybe for leader lookup
import * as guildMemberModel from '../models/guild_member.model'; // Added guildMemberModel import
import { DbGuild, BattleNetGuildRoster, DbCharacter, BattleNetGuildMember, DbGuildMember } from '../../../shared/types/guild'; // Added DbGuildMember
import { BattleNetRegion } from '../../../shared/types/user'; // Added import for BattleNetRegion
import { AppError } from '../utils/error-handler';
import { withTransaction } from '../utils/transaction'; // Added withTransaction import

// TODO: Implement caching mechanism (e.g., Redis, in-memory cache) if desired

export class BattleNetSyncService { // Added export keyword

  private isSyncing: boolean = false;
  private apiClient: BattleNetApiClient;
  // Added properties for injected models
  private guildModel: typeof guildModel;
  private characterModel: typeof characterModel;
  private rankModel: typeof rankModel;
  private userModel: typeof userModel;
  private guildMemberModel: typeof guildMemberModel; // Added property


  // Inject dependencies via constructor
  constructor(
    apiClient: BattleNetApiClient,
    guildModelInj: typeof guildModel,
    characterModelInj: typeof characterModel,
    rankModelInj: typeof rankModel,
    userModelInj: typeof userModel,
    guildMemberModelInj: typeof guildMemberModel // Added parameter
  ) {
    this.apiClient = apiClient;
    this.guildModel = guildModelInj;
    this.characterModel = characterModelInj;
    this.rankModel = rankModelInj;
    this.userModel = userModelInj;
    this.guildMemberModel = guildMemberModelInj; // Added assignment
  }

  /**
   * Updates the core guild data in the database based on fetched API data.
   * @param guild The original guild record from the DB.
   * @param guildData The data fetched from the Battle.net guild endpoint.
   * @param guildRoster The data fetched from the Battle.net guild roster endpoint.
   * @private
   */
  private async _updateCoreGuildData(guild: DbGuild, guildData: any, guildRoster: BattleNetGuildRoster): Promise<void> {
    // TODO: Add specific types for guildData
    const updatePayload: Partial<DbGuild> = {
      guild_data_json: guildData,
      roster_json: guildRoster,
      bnet_guild_id: guildData.id, // Store the Battle.net ID
      last_updated: new Date().toISOString(), // Timestamp for guild data fetch
      last_roster_sync: new Date().toISOString(), // Timestamp for roster fetch
      member_count: guildRoster.members.length, // Update member_count
    };

    // Find Guild Master from roster
    const guildMasterMember = guildRoster.members.find((m: BattleNetGuildMember) => m.rank === 0);
    if (guildMasterMember) {
      try {
        // Try to find the user associated with the Guild Master character
        const guildMasterUser = await this.userModel.findByCharacterName(
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
      } catch (userLookupError) {
        console.error(`[SyncService] Error looking up user for GM ${guildMasterMember.character.name}:`, userLookupError);
        // Decide if we should clear leader_id or leave it as is on error
      }
    } else {
      console.log(`[SyncService] No Guild Master (rank 0) found in roster for ${guild.name}.`);
      // Optionally clear leader_id if no GM found?
      // updatePayload.leader_id = null;
    }

    await this.guildModel.update(guild.id, updatePayload);
    console.log(`[SyncService] Updated core guild data for ${guild.name}.`);
  }


  /**
   * Syncs basic data and roster for a single guild.
   */
  async syncGuild(guild: DbGuild): Promise<void> {
    console.log(`[SyncService] Starting sync for guild: ${guild.name} (${guild.realm})`);
    try {
      // Token fetching is now handled within the apiClient methods
      // const token = await this.ensureClientToken(); // Removed

      // 1. Fetch Guild Data from Battle.net using injected client
      const guildData = await this.apiClient.getGuildData(guild.realm, guild.name, guild.region as BattleNetRegion); // Use apiClient, cast region

      // 2. Fetch Guild Roster from Battle.net using injected client
      const guildRoster = await this.apiClient.getGuildRoster(guild.region as BattleNetRegion, guild.realm, guild.name); // Use apiClient, cast region

      // 3. Update Core Guild Data using the extracted private method
      await this._updateCoreGuildData(guild, guildData, guildRoster);

      // 4. Sync Guild Members Table
      await this.syncGuildMembersTable(guild.id, guildRoster);

      // 5. Sync Ranks Table (Create ranks and update counts)
      await this._syncGuildRanks(guild.id, guildRoster); // Use combined method


    } catch (error) {
      console.error(`[SyncService] Error syncing guild ${guild.name} (ID: ${guild.id}):`, error);
      // Optionally update guild record with error state/timestamp
    }
  }

  /**
   * Compares the roster data with existing members and characters to determine changes.
   * @param rosterMembersMap Map of roster members keyed by 'name-realm'.
   * @param existingMembersMap Map of existing guild members in DB keyed by 'name-realm'.
   * @param existingCharacterMap Map of existing characters in DB keyed by 'name-realm'.
   * @returns An object containing arrays of members to add, update, remove, and characters to create.
   * @private
   */
  private _compareGuildMembers(
    rosterMembersMap: Map<string, BattleNetGuildMember>,
    existingMembersMap: Map<string, { id: number; character_id: number | null; rank: number }>,
    existingCharacterMap: Map<string, number>
  ): {
    membersToAdd: { rosterMember: BattleNetGuildMember; characterId: number }[];
    membersToUpdate: { memberId: number; rank?: number; characterId?: number; memberData?: BattleNetGuildMember }[];
    memberIdsToRemove: number[];
    charactersToCreate: Partial<DbCharacter>[];
  } {
    const membersToAdd: { rosterMember: BattleNetGuildMember; characterId: number }[] = [];
    const membersToUpdate: { memberId: number; rank?: number; characterId?: number; memberData?: BattleNetGuildMember }[] = [];
    const memberIdsToRemove: number[] = [];
    const charactersToCreate: Partial<DbCharacter>[] = [];
    const processedExistingMembers = new Set(existingMembersMap.keys()); // Keep track of processed existing members

    for (const [key, rosterMember] of rosterMembersMap.entries()) {
      const existingMember = existingMembersMap.get(key);
      const existingCharacterId = existingCharacterMap.get(key);

      if (existingMember) {
        // Member exists in guild_members table
        processedExistingMembers.delete(key); // Mark as processed
        let needsUpdate = false;
        const updateData: { rank?: number; memberData?: BattleNetGuildMember; characterId?: number } = {};

        if (existingMember.rank !== rosterMember.rank) {
          updateData.rank = rosterMember.rank;
          needsUpdate = true;
        }
        // Check if character link is missing or incorrect
        if (!existingMember.character_id && existingCharacterId) {
          updateData.characterId = existingCharacterId;
          needsUpdate = true;
        }
        // Always update member_data_json for simplicity
        updateData.memberData = rosterMember;
        needsUpdate = true; // Force update to refresh member_data_json

        if (needsUpdate) {
          membersToUpdate.push({ memberId: existingMember.id, ...updateData });
        }
      } else {
        // Member is new to the guild_members table
        if (existingCharacterId) {
          // Character already exists in characters table
          membersToAdd.push({ rosterMember, characterId: existingCharacterId });
        } else {
          // Character also needs to be created
          charactersToCreate.push({
            name: rosterMember.character.name,
            realm: rosterMember.character.realm.slug,
            class: rosterMember.character.playable_class?.name || 'Unknown',
            level: rosterMember.character.level,
            role: 'DPS', // Default role, consider refining later
            is_main: false,
            // user_id will be null initially
            // profile_json will be added by character sync later
          });
          // We'll link character_id after creation
        }
      }
    }

    // Any members left in processedExistingMembers are no longer in the roster
    for (const key of processedExistingMembers) {
      const memberToRemove = existingMembersMap.get(key);
      if (memberToRemove) {
        memberIdsToRemove.push(memberToRemove.id);
      }
    }

    return { membersToAdd, membersToUpdate, memberIdsToRemove, charactersToCreate };
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

        // Removed initial declarations - these will be created by the _compareGuildMembers call
        // const membersToAdd: { rosterMember: BattleNetGuildMember; characterId: number }[] = [];
        // const membersToUpdate: { memberId: number; rank?: number; characterId?: number; memberData?: BattleNetGuildMember }[] = [];
        // const memberIdsToRemove: number[] = [];
        // const charactersToCreate: Partial<DbCharacter>[] = [];

       // Pre-fetch or identify characters that might need creation
       // const potentialNewCharKeys = roster.members // Removed unused variable
       //     .map(m => `${m.character.name.toLowerCase()}-${m.character.realm.slug.toLowerCase()}`)
       //     .filter(key => !existingMembersMap.has(key));

       // Fetch existing characters relevant to this roster efficiently
        const characterKeys = Array.from(rosterMembersMap.values()).map(member => ({
          name: member.character.name,
          realm: member.character.realm.slug
        }));
        const existingCharacters = await this.characterModel.findByMultipleNameRealm(characterKeys); // Use new efficient method

        const existingCharacterMap = new Map<string, number>();
        existingCharacters.forEach((char: DbCharacter) => { // Added type DbCharacter
            // Ensure name and realm are defined before creating the key
            if (char.name && char.realm) {
              const key = `${char.name.toLowerCase()}-${char.realm.toLowerCase()}`;
              existingCharacterMap.set(key, char.id);
            }
        });


        // 2. Compare roster with existing data using the helper method
        const {
          membersToAdd,
          membersToUpdate,
          memberIdsToRemove,
          charactersToCreate
        } = this._compareGuildMembers(rosterMembersMap, existingMembersMap, existingCharacterMap);

        console.log(`[SyncService] Changes determined: Add ${membersToAdd.length + charactersToCreate.length}, Update ${membersToUpdate.length}, Remove ${memberIdsToRemove.length}`);

        // 3. Create new character records if any
        const createdCharacterMap = new Map<string, number>();
        for (const charData of charactersToCreate) {
            try {
                const newChar = await this.characterModel.create(charData); // Use model's create
                const key = `${newChar.name.toLowerCase()}-${newChar.realm.toLowerCase()}`;
                createdCharacterMap.set(key, newChar.id);
                console.log(`[SyncService] Created character ${newChar.name}-${newChar.realm} with ID ${newChar.id}`);
            } catch (createError) {
                console.error(`[SyncService] Failed to create character record for ${charData.name}:`, createError);
            }
        }

        // 4. Prepare data and bulk create new guild members
        const newMembersData: Partial<DbGuildMember>[] = [];

        // Members whose characters already existed
        for (const { rosterMember, characterId } of membersToAdd) {
           newMembersData.push({
             guild_id: guildId,
             character_id: characterId,
             rank: rosterMember.rank,
             character_name: rosterMember.character.name,
             character_class: rosterMember.character.playable_class.name,
             member_data_json: rosterMember // Store the full roster member data
           });
        }

        // Members whose characters were just created
        for (const charData of charactersToCreate) {
            const key = `${charData.name?.toLowerCase()}-${charData.realm?.toLowerCase()}`;
            const characterId = createdCharacterMap.get(key);
            const rosterMember = rosterMembersMap.get(key);

            if (!characterId || !rosterMember) {
                console.error(`[SyncService] Mismatch finding character/roster data for new member ${key}`);
                continue; // Skip if data is inconsistent
            }
            newMembersData.push({
              guild_id: guildId,
              character_id: characterId,
              rank: rosterMember.rank,
              character_name: rosterMember.character.name,
              character_class: rosterMember.character.playable_class.name,
              member_data_json: rosterMember // Store the full roster member data
            });
        }

        // Perform bulk insert using the model method
        if (newMembersData.length > 0) {
          await this.guildMemberModel.bulkCreate(newMembersData, client);
          console.log(`[SyncService] Attempted to bulk insert ${newMembersData.length} new members.`);
        }

        // 5. Update existing members using the model method
        if (membersToUpdate.length > 0) {
          await this.guildMemberModel.bulkUpdate(membersToUpdate, client);
          console.log(`[SyncService] Attempted to bulk update ${membersToUpdate.length} existing members.`);
        }

        // 6. Remove members no longer in roster using the model method
        if (memberIdsToRemove.length > 0) {
          await this.guildMemberModel.bulkDelete(memberIdsToRemove, client);
          console.log(`[SyncService] Attempted to bulk delete ${memberIdsToRemove.length} members.`);
        }

        console.log(`[SyncService] Finished syncing guild_members table for guild ID: ${guildId}.`);
      }); // End transaction
    } catch (error) {
      throw new AppError(`Error syncing guild members table for guild ${guildId}: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }

  // Removed syncGuildRanksTable and updateRankMemberCounts methods
  // Their logic is combined in _syncGuildRanks


  /**
   * Syncs character details (profile, equipment, etc.).
   */
  /**
   * Syncs the guild ranks table: ensures ranks exist and updates member counts.
   * Combines logic from syncGuildRanksTable and updateRankMemberCounts.
   * @param guildId The ID of the guild.
   * @param rosterData The fetched guild roster data.
   * @private
   */
  private async _syncGuildRanks(guildId: number, rosterData: BattleNetGuildRoster): Promise<void> {
    console.log(`[SyncService] Syncing ranks for guild ID: ${guildId}`);
    try {
      // 1. Calculate rank counts from roster
      const rankCounts: { [key: number]: number } = {};
      const rosterRankIds = new Set<number>();
      rosterData.members.forEach(member => {
        const rankId = member.rank;
        rankCounts[rankId] = (rankCounts[rankId] || 0) + 1;
        rosterRankIds.add(rankId);
      });

      // 2. Get existing ranks from DB
      const existingRanks = await this.rankModel.getGuildRanks(guildId);
      const existingRankMap = new Map(existingRanks.map(r => [r.rank_id, r]));

      // 3. Ensure ranks exist and update counts
      for (const rankId of rosterRankIds) {
        let rankRecord = existingRankMap.get(rankId);

        // Create rank if it doesn't exist
        if (!rankRecord) {
          const defaultName = rankId === 0 ? "Guild Master" : `Rank ${rankId}`;
          console.log(`[SyncService] Creating default rank entry for guild ${guildId}, rank ${rankId}`);
          try {
            // Use setGuildRank which handles create/update (returns the created/updated rank)
            rankRecord = await this.rankModel.setGuildRank(guildId, rankId, defaultName);
            if (!rankRecord) {
              console.error(`[SyncService] Failed to create or retrieve rank ${rankId} for guild ${guildId}. Skipping count update.`);
              continue; // Skip count update if creation failed
            }
          } catch (createError) {
            console.error(`[SyncService] Error creating rank ${rankId} for guild ${guildId}:`, createError);
            continue; // Skip count update on error
          }
        }

        // Update member count for the rank (existing or newly created)
        const currentCount = rankCounts[rankId] || 0;
        if (rankRecord.member_count !== currentCount) {
          try {
            await this.rankModel.updateMemberCount(guildId, rankId, currentCount);
          } catch (updateError) {
            console.error(`[SyncService] Error updating member count for rank ${rankId}, guild ${guildId}:`, updateError);
          }
        } else {
           // console.log(`[SyncService] Rank ${rankId} count (${currentCount}) is already up-to-date.`);
        }
      }

      // Optionally: Handle ranks that exist in DB but not in roster (e.g., set count to 0?)
      // for (const existingRank of existingRanks) {
      //   if (!rosterRankIds.has(existingRank.rank_id) && existingRank.member_count !== 0) {
      //     console.log(`[SyncService] Rank ${existingRank.rank_id} no longer in roster, setting count to 0.`);
      //     await this.rankModel.updateMemberCount(guildId, existingRank.rank_id, 0);
      //   }
      // }

    } catch (error) {
      console.error(`[SyncService] Error syncing ranks for guild ${guildId}:`, error);
    }
  }


  /**
   * Prepares the update payload for a character based on fetched API data.
   * @param character The original character record from the DB.
   * @param enhancedData The data fetched from the Battle.net character endpoints.
   * @returns A promise that resolves to the partial DbCharacter update payload.
   * @private
   */
  private async _prepareCharacterUpdatePayload(
    character: DbCharacter,
    enhancedData: any // TODO: Add specific type for enhancedData
  ): Promise<Partial<DbCharacter>> {
    const bnet_character_id = enhancedData.id;
    const bnet_guild_id = enhancedData.guild?.id; // This is the Battle.net Guild ID
    let localGuild: DbGuild | null = null;
    let region: string | undefined = undefined;

    if (bnet_guild_id) {
      try {
        // Find the local guild record using the Battle.net guild ID
        localGuild = await this.guildModel.findOne({ bnet_guild_id: bnet_guild_id });
        if (localGuild) {
          region = localGuild.region;
        } else {
          console.warn(`[SyncService] Local guild record not found for BNet Guild ID ${bnet_guild_id} (Character: ${character.name})`);
          region = character.region; // Fallback to existing character region
        }
      } catch (guildError) {
        console.error(`[SyncService] Error fetching local guild for BNet Guild ID ${bnet_guild_id} (Character: ${character.name}):`, guildError);
        region = character.region; // Fallback to existing character region on error
      }
    } else {
      // If character has no guild in profile, use existing region if available
      region = character.region;
    }

    // Prepare update payload
    const updatePayload: Partial<DbCharacter> = {
      profile_json: enhancedData,
      equipment_json: enhancedData.equipment,
      mythic_profile_json: enhancedData.mythicKeystone === null ? undefined : enhancedData.mythicKeystone,
      professions_json: enhancedData.professions,
      level: enhancedData.level,
      class: enhancedData.character_class.name,
      last_synced_at: new Date().toISOString(),
      bnet_character_id: bnet_character_id,
      guild_id: localGuild?.id,
      region: region,
    };

    return updatePayload;
  }


  async syncCharacter(character: DbCharacter): Promise<void> {
    console.log(`[SyncService] Starting sync for character: ${character.name} (${character.realm}) ID: ${character.id}`);
     try {
        // Ensure character region is defined before proceeding
        if (!character.region) {
          console.warn(`[SyncService] Skipping character sync for ${character.name} (ID: ${character.id}) due to missing region.`);
          return; // Cannot sync without region
        }

        // Token fetching is now handled within the apiClient methods
        // const token = await this.ensureClientToken(); // Removed

        // Fetch enhanced data using injected client
        // Note: getEnhancedCharacterData fetches profile, equipment, mythic keystone, professions
        const enhancedData = await this.apiClient.getEnhancedCharacterData( // Use apiClient
            character.realm,
            character.name.toLowerCase(), // Ensure lowercase name is passed as expected by client
            character.region as BattleNetRegion // Cast region after check
        );

        // Check if enhancedData is null (meaning fetch failed, e.g., 404)
        if (enhancedData === null) {
          console.log(`[SyncService] Skipping update for character ${character.name} (ID: ${character.id}) due to fetch failure.`);
          // Optionally update last_synced_at with an error flag or just skip? Skipping for now.
          return; // Exit the syncCharacter function for this character
        }

        // Prepare update payload using the helper method
        const updatePayload = await this._prepareCharacterUpdatePayload(character, enhancedData);

        // Update character record in DB
        await this.characterModel.update(character.id, updatePayload);
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
      const outdatedGuilds = await this.guildModel.findOutdatedGuilds(); // Assumes this method exists/works
      console.log(`[SyncService] Found ${outdatedGuilds.length} guilds to sync.`);
      for (const guild of outdatedGuilds) {
        await this.syncGuild(guild);
        // Optional: Add delay between guilds to spread load/rate limits
        // await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // 2. Sync Characters (fetch outdated characters)
      const outdatedCharacters = await this.characterModel.findOutdatedCharacters(); // Use the new method
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

// Create an instance of the API client
// TODO: Consider if this client should be a singleton itself and imported from its own file
const apiClient = new BattleNetApiClient();

// Export a singleton instance, injecting the client and models
const battleNetSyncService = new BattleNetSyncService(
  apiClient,
  guildModel,
  characterModel,
  rankModel,
  userModel,
  guildMemberModel // Added guildMemberModel
);
export default battleNetSyncService;