import * as crypto from 'crypto'; // Added for toy hashing
import { BattleNetCharacter, BattleNetGuild, BattleNetGuildMember, BattleNetGuildRoster, DbCharacter, DbGuild, DbGuildMember } from '../../../shared/types/guild'; // Added DbGuildMember, BattleNetGuild, EnhancedCharacterData
import { BattleNetRegion } from '../../../shared/types/user'; // Added import for BattleNetRegion
// Import default model instances
import characterModel from '../models/character.model';
import guildModel from '../models/guild.model';
import guildMemberModel from '../models/guild_member.model';
import rankModel from '../models/rank.model';
import userModel from '../models/user.model';
// Import class for instantiation
import { BattleNetApiClient } from '../services/battlenet-api.client';
import { AppError } from '../utils/error-handler';
import logger from '../utils/logger'; // Import the logger
import { createSlug } from '../utils/slugify'; // Import the slugify function
import { withTransaction } from '../utils/transaction'; // Added withTransaction import

// TODO: Implement caching mechanism (e.g., Redis, in-memory cache) if desired

// Remove export keyword from class definition
class BattleNetSyncService {

  private isSyncing: boolean = false;
  private apiClient: BattleNetApiClient;
  // Properties now hold the type of the imported instances
  private guildModel: typeof guildModel;
  private characterModel: typeof characterModel;
  private rankModel: typeof rankModel;
  private userModel: typeof userModel;
  private guildMemberModel: typeof guildMemberModel;


  // Inject dependencies via constructor
  constructor(
    apiClient: BattleNetApiClient,
    guildModelInj: typeof guildModel,
    characterModelInj: typeof characterModel,
    rankModelInj: typeof rankModel,
    userModelInj: typeof userModel,
    guildMemberModelInj: typeof guildMemberModel
  ) {
    this.apiClient = apiClient;
    this.guildModel = guildModelInj;
    this.characterModel = characterModelInj;
    this.rankModel = rankModelInj;
    this.userModel = userModelInj;
    this.guildMemberModel = guildMemberModelInj;
  }

  /**
   * Updates the core guild data in the database based on fetched API data.
   * @param guild The original guild record from the DB.
   * @param guildData The data fetched from the Battle.net guild endpoint.
   * @param guildRoster The data fetched from the Battle.net guild roster endpoint.
   * @private
   */
  private async _updateCoreGuildData(guild: DbGuild, guildData: BattleNetGuild, guildRoster: BattleNetGuildRoster): Promise<void> {
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
          logger.info({ userId: guildMasterUser.id, gmName: guildMasterMember.character.name, guildId: guild.id }, `[SyncService] Found user ${guildMasterUser.id} for GM ${guildMasterMember.character.name}, updating leader_id.`);
        } else {
          // User for GM character not found in our DB
          logger.info({ gmName: guildMasterMember.character.name, guildId: guild.id }, `[SyncService] User for GM ${guildMasterMember.character.name} not found in DB. Clearing leader_id.`);
          updatePayload.leader_id = null; // Clear leader_id as per plan
        }
      } catch (userLookupError) {
        // Error during user lookup
        logger.error({ err: userLookupError, gmName: guildMasterMember.character.name, guildId: guild.id }, `[SyncService] Error looking up user for GM ${guildMasterMember.character.name}. Clearing leader_id.`);
        updatePayload.leader_id = null; // Clear leader_id on error as per plan
      }
    } else {
      // No Guild Master found in roster
      logger.info({ guildName: guild.name, guildId: guild.id }, `[SyncService] No Guild Master (rank 0) found in roster for ${guild.name}. Clearing leader_id.`);
      updatePayload.leader_id = null; // Clear leader_id as per plan
    }

    await this.guildModel.update(guild.id, updatePayload);
    logger.info({ guildName: guild.name, guildId: guild.id }, `[SyncService] Updated core guild data for ${guild.name}.`);
  }


  /**
   * Syncs basic data and roster for a single guild.
   */
  async syncGuild(guild: DbGuild): Promise<void> {
    logger.info({ guildName: guild.name, realm: guild.realm, guildId: guild.id }, `[SyncService] Starting sync for guild: ${guild.name} (${guild.realm})`);
    try {
      // Token fetching is now handled within the apiClient methods
      // const token = await this.ensureClientToken(); // Removed

      // 1. Fetch Guild Data from Battle.net using injected client
      const realmSlug = createSlug(guild.realm);
      const guildNameSlug = createSlug(guild.name);
      const guildData = await this.apiClient.getGuildData(realmSlug, guildNameSlug, guild.region as BattleNetRegion); // Use apiClient, cast region, use slugs

      // 2. Fetch Guild Roster from Battle.net using injected client
      const guildRoster = await this.apiClient.getGuildRoster(guild.region as BattleNetRegion, realmSlug, guildNameSlug); // Use apiClient, cast region, use slugs

      // 3. Update Core Guild Data using the extracted private method
      await this._updateCoreGuildData(guild, guildData, guildRoster);

      // 4. Sync Guild Members Table
      await this.syncGuildMembersTable(guild.id, guildRoster, guild.region as BattleNetRegion); // Pass region

      // 5. Sync Ranks Table (Create ranks and update counts)
      await this._syncGuildRanks(guild.id, guildRoster); // Use combined method


    } catch (error) {
      logger.error({ err: error, guildId: guild.id, guildName: guild.name }, `[SyncService] Error syncing guild ${guild.name} (ID: ${guild.id}):`);
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
    existingCharacterMap: Map<string, number>,
    region: BattleNetRegion // Added region parameter
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
            // is_main: false, // REMOVED - is_main is on guild_members now
            region: region, // Add the region here
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
  async syncGuildMembersTable(guildId: number, roster: BattleNetGuildRoster, region: BattleNetRegion): Promise<void> { // Added region parameter
    logger.info({ guildId, rosterSize: roster.members.length }, `[SyncService] Syncing guild_members table for guild ID: ${guildId}. Roster size: ${roster.members.length}`);
    try {
      await withTransaction(async (client) => { // Use transaction helper
        // 1. Fetch existing members for the guild, joining with characters to get the realm slug
        const existingMembersResult = await client.query(
          `SELECT
             gm.id,
             gm.character_id,
             gm.character_name,
             gm.rank,
             c.realm -- Fetch realm slug from characters table
           FROM
             guild_members gm
           LEFT JOIN
             characters c ON gm.character_id = c.id
           WHERE
             gm.guild_id = $1`,
          [guildId]
        );
        // Define type for DB row (includes realm slug from characters table)
        type GuildMemberRow = { id: number; character_id: number | null; character_name: string | null; realm: string | null; rank: number };
        const existingMembersMap = new Map<string, { id: number; character_id: number | null; rank: number }>();
        existingMembersResult.rows.forEach((row: GuildMemberRow) => {
          // Use character_name and the fetched realm slug as a key for matching
          // Ensure both character_name and realm slug are present before creating the key
          if (row.character_name && row.realm) {
            const key = `${row.character_name.toLowerCase()}-${row.realm.toLowerCase()}`;
            existingMembersMap.set(key, { id: row.id, character_id: row.character_id, rank: row.rank });
          } else {
            // Log a warning if essential data for key creation is missing
            logger.warn({ guildId, memberId: row.id, characterId: row.character_id }, `[SyncService] Skipping existing member (ID: ${row.id}) due to missing name or realm slug needed for matching.`);
          }
        });
        logger.info({ count: existingMembersMap.size, guildId }, `[SyncService] Found ${existingMembersMap.size} existing members in DB for guild ${guildId}.`);

        const rosterMembersMap = new Map<string, BattleNetGuildMember>();
        roster.members.forEach(member => {
          const key = `${member.character.name.toLowerCase()}-${member.character.realm.slug.toLowerCase()}`;
          rosterMembersMap.set(key, member);
        });

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
        } = this._compareGuildMembers(rosterMembersMap, existingMembersMap, existingCharacterMap, region); // Pass region

        logger.info({ add: membersToAdd.length + charactersToCreate.length, update: membersToUpdate.length, remove: memberIdsToRemove.length, guildId }, `[SyncService] Changes determined: Add ${membersToAdd.length + charactersToCreate.length}, Update ${membersToUpdate.length}, Remove ${memberIdsToRemove.length}`);

        // 3. Create new character records if any
        const createdCharacterMap = new Map<string, number>();
        for (const charData of charactersToCreate) {
            try {
                const newChar = await this.characterModel.create(charData); // Use model's create
                const key = `${newChar.name.toLowerCase()}-${newChar.realm.toLowerCase()}`;
                createdCharacterMap.set(key, newChar.id);
                logger.info({ charName: newChar.name, realm: newChar.realm, charId: newChar.id }, `[SyncService] Created character ${newChar.name}-${newChar.realm} with ID ${newChar.id}`);
            } catch (createError) {
                logger.error({ err: createError, charName: charData.name }, `[SyncService] Failed to create character record for ${charData.name}:`);
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
                logger.error({ key, guildId }, `[SyncService] Mismatch finding character/roster data for new member ${key}`);
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
          logger.info({ count: newMembersData.length, guildId }, `[SyncService] Attempted to bulk insert ${newMembersData.length} new members.`);
        }

        // 5. Update existing members using the model method
        if (membersToUpdate.length > 0) {
          await this.guildMemberModel.bulkUpdate(membersToUpdate, client);
          logger.info({ count: membersToUpdate.length, guildId }, `[SyncService] Attempted to bulk update ${membersToUpdate.length} existing members.`);
        }

        // 6. Remove members no longer in roster using the model method
        if (memberIdsToRemove.length > 0) {
          await this.guildMemberModel.bulkDelete(memberIdsToRemove, client);
          logger.info({ count: memberIdsToRemove.length, guildId }, `[SyncService] Attempted to bulk delete ${memberIdsToRemove.length} members.`);
        }

        logger.info({ guildId }, `[SyncService] Finished syncing guild_members table for guild ID: ${guildId}.`);
      }); // End transaction
    } catch (error) {
      // Log the error before throwing the AppError
      logger.error({ err: error, guildId }, `Error syncing guild members table for guild ${guildId}`);
      throw new AppError(`Error syncing guild members table for guild ${guildId}: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }

  /**
   * Syncs the guild ranks table: ensures ranks exist and updates member counts.
   * Combines logic from syncGuildRanksTable and updateRankMemberCounts.
   * @param guildId The ID of the guild.
   * @param rosterData The fetched guild roster data.
   * @private
   */
  private async _syncGuildRanks(guildId: number, rosterData: BattleNetGuildRoster): Promise<void> {
    logger.info({ guildId }, `[SyncService] Syncing ranks for guild ID: ${guildId}`);
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
          logger.info({ guildId, rankId }, `[SyncService] Creating default rank entry for guild ${guildId}, rank ${rankId}`);
          try {
            // Use setGuildRank which handles create/update (returns the created/updated rank)
            rankRecord = await this.rankModel.setGuildRank(guildId, rankId, defaultName);
            if (!rankRecord) {
              logger.error({ rankId, guildId }, `[SyncService] Failed to create or retrieve rank ${rankId} for guild ${guildId}. Skipping count update.`);
              continue; // Skip count update if creation failed
            }
          } catch (createError) {
            logger.error({ err: createError, rankId, guildId }, `[SyncService] Error creating rank ${rankId} for guild ${guildId}:`);
            continue; // Skip count update on error
          }
        }

        // Update member count for the rank (existing or newly created)
        const currentCount = rankCounts[rankId] || 0;
        if (rankRecord.member_count !== currentCount) {
          try {
            await this.rankModel.updateMemberCount(guildId, rankId, currentCount);
          } catch (updateError) {
            logger.error({ err: updateError, rankId, guildId }, `[SyncService] Error updating member count for rank ${rankId}, guild ${guildId}:`);
          }
        } else {
           // logger.debug({ rankId, count: currentCount, guildId }, `[SyncService] Rank ${rankId} count (${currentCount}) is already up-to-date.`);
        }
      }

      // Handle ranks that exist in DB but not in roster (set count to 0)
      for (const existingRank of existingRanks) {
        if (!rosterRankIds.has(existingRank.rank_id) && existingRank.member_count !== 0) {
          logger.info({ rankId: existingRank.rank_id, guildId }, `[SyncService] Rank ${existingRank.rank_id} no longer in roster, setting count to 0.`);
          // Use try-catch for robustness
          try {
            await this.rankModel.updateMemberCount(guildId, existingRank.rank_id, 0);
          } catch (cleanupError) {
            logger.error({ err: cleanupError, rankId: existingRank.rank_id, guildId }, `[SyncService] Error setting member count to 0 for rank ${existingRank.rank_id}, guild ${guildId}:`);
          }
        }
      }

    } catch (error) {
      logger.error({ err: error, guildId }, `[SyncService] Error syncing ranks for guild ${guildId}:`);
    }
  }


  /**
   * Prepares the update payload for a character based on fetched API data.
   * Also returns the local guild record if found.
   * @param character The original character record from the DB.
   * @param enhancedData The data fetched from the Battle.net character endpoints.
   * @returns A promise that resolves to an object containing the partial DbCharacter update payload and the found local DbGuild (or null).
   * @private
   */
  private async _prepareCharacterUpdatePayload(
    character: DbCharacter,
    enhancedData: any // TODO: Add specific type for enhancedData
  ): Promise<{ updatePayload: Partial<DbCharacter>, localGuild: DbGuild | null }> { // Modified return type
    const bnet_character_id = enhancedData.id;
    const bnet_guild_data = enhancedData.guild; // Use the guild object from enhancedData
    const bnet_guild_id = bnet_guild_data?.id; // This is the Battle.net Guild ID
    let localGuild: DbGuild | null = null;
    let region = character.region; // Start with existing region as fallback

    // Determine Region and Local Guild ID
    if (bnet_guild_id) {
      try {
        localGuild = await this.guildModel.findOne({ bnet_guild_id: bnet_guild_id });
        if (localGuild) {
          region = localGuild.region; // Use region from found local guild
        } else {
          logger.warn({ bnetGuildId: bnet_guild_id, charName: character.name, charId: character.id }, `[SyncService] Local guild record not found for BNet Guild ID ${bnet_guild_id}. Queueing guild sync.`);
          // Pass the correct region type or null
          await this._queueMissingGuildSync(bnet_guild_data, (character.region as BattleNetRegion | null ?? null));
          // Keep original character region for this update
        }
      } catch (guildError) {
        logger.error({ err: guildError, bnetGuildId: bnet_guild_id, charName: character.name, charId: character.id }, `[SyncService] Error fetching local guild for BNet Guild ID ${bnet_guild_id}.`);
        // Keep original character region on error
      }
    } else {
      localGuild = null; // Ensure localGuild is null if character is guildless on BNet
    }

    // --- Calculate Toy Hash for Unknown Users ---
    let calculatedToyHash: string | null = null;
    const NO_TOYS_HASH = 'a3741d687719e1c015f4f115371c77064771f699817f81f09016350165a19111'; // sha256("NO_TOYS_FOUND")

    if (character.user_id === null && region) { // Only calculate if user_id is null and region is known
        const realmSlug = createSlug(character.realm);
        const characterName = character.name.toLowerCase(); // BNet API uses lowercase names
        try {
            logger.debug({ charName: character.name, realmSlug, region }, `[SyncService] Fetching collections index for unknown character.`);
            // 1. Fetch Collections Index
            const collectionsIndex = await this.apiClient.getCharacterCollectionsIndex(realmSlug, characterName, region as BattleNetRegion);

            if (collectionsIndex?.toys?.href) {
                logger.debug({ charName: character.name, realmSlug, region }, `[SyncService] Fetching toys from href: ${collectionsIndex.toys.href}`);
                // 2. Fetch Toys Data
                // Assuming a generic fetch method or a specific one exists in apiClient
                // Use the new generic fetch method, providing a job ID
                const toyJobId = `char-toys-${region}-${realmSlug}-${characterName}`;
                const toysData = await this.apiClient.getGenericBattleNetData<{ toys: { toy: { id: number } }[] }>(collectionsIndex.toys.href, toyJobId);

                if (toysData?.toys && toysData.toys.length > 0) {
                    // Add explicit types for map and sort parameters
                    const toyIds = toysData.toys.map((t: { toy: { id: number } }) => t.toy.id).sort((a: number, b: number) => a - b);
                    const toyString = toyIds.join(',');
                    calculatedToyHash = crypto.createHash('sha256').update(toyString).digest('hex');
                    logger.debug({ charName: character.name, toyCount: toyIds.length, hash: calculatedToyHash }, `[SyncService] Calculated toy hash for unknown character.`);
                } else {
                    calculatedToyHash = NO_TOYS_HASH;
                    logger.debug({ charName: character.name }, `[SyncService] No toys found for unknown character, using default hash.`);
                }
            } else {
                calculatedToyHash = NO_TOYS_HASH;
                logger.warn({ charName: character.name }, `[SyncService] Toys collection href not found for unknown character, using default hash.`);
            }
        } catch (toyError) {
            logger.error({ err: toyError, charName: character.name }, `[SyncService] Error fetching toys for unknown character ${character.name}:`);
            // Don't set hash on error, leave it as null or existing value
        }
    }
    // --- End Toy Hash Calculation ---

    const updatePayload: Partial<DbCharacter> = {
      bnet_character_id: bnet_character_id,
      region: region, // Update region based on local guild if found
      level: enhancedData.level,
      class: enhancedData.character_class?.name || character.class, // Fallback to existing class
      profile_json: enhancedData, // Store the full profile data
      updated_at: new Date().toISOString(), // Use updated_at
      last_synced_at: new Date().toISOString(), // Also update last_synced_at
      // Only update toy_hash if it was calculated (i.e., user_id is null and calculation succeeded)
      ...(calculatedToyHash !== null && { toy_hash: calculatedToyHash }),
      // Add other JSON fields from enhancedData if needed
      equipment_json: enhancedData.equipment,
      mythic_profile_json: enhancedData.mythicKeystone,
      professions_json: enhancedData.professions?.primaries,
    };

    return { updatePayload, localGuild }; // Return both payload and localGuild
  }


  /**
   * Queues a sync operation for a guild that was found on a character profile
   * but doesn't exist in the local database yet.
   * @param guildData Basic guild data from the character profile.
   * @param region The region of the character (used if guild data doesn't specify).
   * @private
   */
  private async _queueMissingGuildSync(
    guildData: { id: number; name: string; realm: { slug: string; name: string } } | undefined,
    region: BattleNetRegion | null // Accept null
  ): Promise<void> {
    if (!guildData || !region) { // Check if region is null here too
      logger.error({ guildData, region }, "[SyncService] Cannot queue missing guild sync: insufficient data (guildData or region missing).");
      return;
    }

    const { id: bnetGuildId, name: guildName, realm } = guildData;
    const realmName = realm.name; // Use the full realm name
    const realmSlug = realm.slug; // Use the realm slug

    try {
      // Check if guild already exists by BNet ID to avoid duplicates
      const existingGuild = await this.guildModel.findOne({ bnet_guild_id: bnetGuildId });
      if (existingGuild) {
        logger.info({ bnetGuildId, guildName, realmName }, `[SyncService] Guild ${guildName}-${realmName} (BNet ID: ${bnetGuildId}) already exists locally. Skipping queue.`);
        return;
      }

      // Check if guild exists by name/realm/region (in case BNet ID wasn't stored previously)
      const existingByName = await this.guildModel.findOne({ name: guildName, realm: realmName, region: region });
       if (existingByName) {
         logger.info({ guildName, realmName, region }, `[SyncService] Guild ${guildName}-${realmName} (${region}) already exists locally (found by name/realm). Updating BNet ID.`);
         // Update the existing record with the BNet ID if missing
         if (!existingByName.bnet_guild_id) {
           await this.guildModel.update(existingByName.id, { bnet_guild_id: bnetGuildId });
         }
         return; // Don't create a new one
       }


      logger.info({ bnetGuildId, guildName, realmName, region }, `[SyncService] Queueing sync for missing guild: ${guildName}-${realmName} (${region})`);

      // Create a basic guild record to track it
      const newGuildPayload: Partial<DbGuild> = {
        name: guildName,
        realm: realmName, // Store full realm name
        region: region,
        bnet_guild_id: bnetGuildId,
        last_updated: null, // Not synced yet
        last_roster_sync: null,
        // leader_id will be determined during the actual sync
      };
      const createdGuild = await this.guildModel.create(newGuildPayload);

      // TODO: Implement a proper job queue mechanism (e.g., BullMQ, RabbitMQ)
      // For now, we'll just call syncGuild directly, but this is NOT ideal for production
      // as it can lead to long-running processes and potential race conditions.
      logger.warn({ guildId: createdGuild.id }, "[SyncService] Triggering immediate sync for newly added guild (replace with proper queue).");
      await this.syncGuild(createdGuild); // Direct call (temporary)

    } catch (error) {
      logger.error({ err: error, bnetGuildId, guildName, realmName }, `[SyncService] Error queueing sync for missing guild ${guildName}-${realmName}:`);
    }
  }


  /**
   * Syncs detailed data for a single character.
   */
  async syncCharacter(character: DbCharacter): Promise<void> {
    const jobId = `char-sync-${character.region}-${character.realm}-${character.name}`; // Unique ID for logging/tracking
    logger.info({ charId: character.id, charName: character.name, realm: character.realm, region: character.region, jobId }, `[SyncService] Starting sync for character: ${character.name} (${character.realm}-${character.region})`);

    try {
      // --- New Availability Check ---
      // Fetch all guild memberships for this character
      const associatedGuildMembers = await this.guildMemberModel.findByCharacterIds([character.id]); // Use findByCharacterIds 

      // If the character isn't in any guild tracked by the system, proceed normally.
      // If they are in guilds, check if *any* membership allows syncing.
      if (associatedGuildMembers.length > 0) {
        const isAnyMembershipAvailable = associatedGuildMembers.some((gm: DbGuildMember) => gm.isAvailable === true); // Use correct camelCase name from type        

        if (!isAnyMembershipAvailable) {
          logger.info({ charId: character.id, charName: character.name}, `[SyncService] Character ${character.name} (ID: ${character.id}) is marked as unavailable (isAvailable=false or non-boolean) in all associated guilds. Skipping API sync.`);
          // Optionally update character's last_updated timestamp even if skipped?
          // await this.characterModel.update(character.id, { last_synced_at: new Date().toISOString() }); // Use last_synced_at
          return; // Skip the rest of the sync process
        }
        // If at least one membership is available, proceed with the API call.
        // Success/failure logic below will handle updating all memberships.
        logger.debug({ charId: character.id, charName: character.name }, `[SyncService] Character ${character.name} (ID: ${character.id}) is available in at least one guild. Proceeding with API sync.`);
      } else {
         logger.debug({ charId: character.id, charName: character.name }, `[SyncService] Character ${character.name} (ID: ${character.id}) has no associated guild memberships in DB. Proceeding with API sync.`);
      }
      // --- End New Availability Check ---


      // Token fetching is now handled within the apiClient methods
      // const token = await this.ensureClientToken(); // Removed

      // 1. Fetch Enhanced Character Data from Battle.net
      const realmSlug = createSlug(character.realm);
      const characterNameLower = character.name.toLowerCase(); // BNet API uses lowercase names
      // Use getEnhancedCharacterData instead of getCharacterProfileSummary
      const enhancedDataResult = await this.apiClient.getEnhancedCharacterData(realmSlug, characterNameLower, character.region as BattleNetRegion); // Pass jobId? No, handled internally by apiClient

      // 2. Prepare Update Payload using the private method
      // Destructure the result from _prepareCharacterUpdatePayload
      const { updatePayload, localGuild } = await this._prepareCharacterUpdatePayload(character, enhancedDataResult);

      // 3. Update Character in DB
      await this.characterModel.update(character.id, updatePayload);
      logger.info({ charId: character.id, charName: character.name, jobId }, `[SyncService] Successfully synced character ${character.name} (ID: ${character.id}).`);

      // 4. Update associated guild_members records with latest character info (if applicable)
      // This ensures character_name, character_class are up-to-date on the membership record
      // Only update if the character is actually in a guild according to the latest sync
      // Use the localGuild variable returned from _prepareCharacterUpdatePayload
      if (localGuild) {
          const localGuildId = localGuild.id; // Get ID from the localGuild object
          const memberUpdatePayload: Partial<DbGuildMember> = {
              character_name: updatePayload.name || character.name, // Use updated name or fallback
              character_class: updatePayload.class || character.class, // Use updated class or fallback
              // We don't update rank here, that's handled by guild sync
          };
          // Find the specific membership record for the current guild
          const currentMembership = await this.guildMemberModel.findOne({
              character_id: character.id,
              guild_id: localGuildId // Use localGuildId here
          });
          if (currentMembership) {
              await this.guildMemberModel.update(currentMembership.id, memberUpdatePayload);
              logger.debug({ charId: character.id, memberId: currentMembership.id, guildId: localGuildId, jobId }, `[SyncService] Updated associated guild member record ${currentMembership.id} for character ${character.name}.`);
          } else {
              logger.warn({ charId: character.id, guildId: localGuildId, jobId }, `[SyncService] Could not find guild member record to update for character ${character.name} in guild ${localGuildId}. Guild sync might be pending.`);
          }
      } else {
          // If character is guildless according to BNet, ensure no active memberships exist?
          // This might be too aggressive, guild sync should handle removals.
          // logger.debug({ charId: character.id, jobId }, `[SyncService] Character ${character.name} is guildless, skipping member record update.`);
      }


    } catch (error) {
      // Handle 404 specifically - Character likely doesn't exist on BNet anymore
      // Use error.status instead of error.statusCode
      if (error instanceof AppError && error.status === 404) {
        logger.warn({ charId: character.id, charName: character.name, realm: character.realm, region: character.region, jobId }, `[SyncService] Character ${character.name} not found on Battle.net (404). Marking as unavailable or consider deletion.`);
        // Option 1: Mark associated guild memberships as unavailable (Safer)
        try {
          // Update last_synced_at on the character record
          await this.characterModel.update(character.id, { last_synced_at: new Date().toISOString() }); // Use last_synced_at
          // Also mark associated guild memberships as unavailable
          // Fetch members first
          const membersToDeactivate = await this.guildMemberModel.findByCharacterIds([character.id]);
          if (membersToDeactivate.length > 0) {
              // Prepare payload for bulkUpdate (assuming it handles isAvailable)
              // Note: bulkUpdate in the model currently doesn't handle 'isAvailable'. Need to adjust if this is the desired behavior.
              // For now, let's assume we want to update 'isAvailable'
              const updates: { memberId: number; isAvailable: boolean }[] = membersToDeactivate.map(m => ({ memberId: m.id, isAvailable: false }));
              // TODO: Ensure guildMemberModel.bulkUpdate supports 'isAvailable' or use individual updates.
              // Assuming bulkUpdate is modified or we use individual updates:
              await this.guildMemberModel.bulkUpdate(updates); // Use bulkUpdate
              logger.info({ charId: character.id, charName: character.name, jobId, count: updates.length }, `[SyncService] Marked ${updates.length} associated memberships as unavailable for character ${character.name} due to 404.`);
          } else {
              logger.info({ charId: character.id, charName: character.name, jobId }, `[SyncService] No associated memberships found to mark as unavailable for character ${character.name} after 404.`);
          }
        } catch (inactiveError) {
          logger.error({ err: inactiveError, charId: character.id, charName: character.name, jobId }, `[SyncService] Failed to mark character ${character.name} memberships as unavailable after 404.`);
        }
        // Option 2: Delete character (More permanent, potential data loss if temporary BNet issue)
        // await this.characterModel.delete(character.id);
        // await this.guildMemberModel.deleteByCharacterId(character.id); // Cascade delete?
      } else {
        // Log other errors
        logger.error({ err: error, charId: character.id, charName: character.name, jobId }, `[SyncService] Error syncing character ${character.name} (ID: ${character.id}):`);
        // Optionally update character record with error state/timestamp
      }
    }
  }


  /**
   * Runs the full sync process: syncs all active guilds and then all active characters.
   */
  async runSync(): Promise<void> {
    if (this.isSyncing) {
      logger.warn('[SyncService] Sync process already running. Skipping new run.');
      return;
    }

    this.isSyncing = true;
    logger.info('[SyncService] Starting full sync cycle.');

    try {
      // 1. Sync outdated guilds first
      logger.info('[SyncService] Starting guild sync phase.');
      // Use findOutdatedGuilds instead of findActive
      const outdatedGuilds = await this.guildModel.findOutdatedGuilds();
      logger.info(`[SyncService] Found ${outdatedGuilds.length} outdated guilds to sync.`);
      for (const guild of outdatedGuilds) {
        await this.syncGuild(guild);
        // Optional: Add a small delay between guild syncs if needed
        // await new Promise(resolve => setTimeout(resolve, 500));
      }
      logger.info('[SyncService] Finished guild sync phase.');

      // 2. Sync outdated characters
      logger.info('[SyncService] Starting character sync phase.');
      // Use findOutdatedCharacters instead of findActive
      const outdatedCharacters = await this.characterModel.findOutdatedCharacters();
      logger.info(`[SyncService] Found ${outdatedCharacters.length} outdated characters to sync.`);
      for (const character of outdatedCharacters) {
        await this.syncCharacter(character);
        // Optional: Add a small delay between character syncs if needed
        // await new Promise(resolve => setTimeout(resolve, 100));
      }
      logger.info('[SyncService] Finished character sync phase.');

      logger.info('[SyncService] Full sync cycle completed successfully.');

    } catch (error) {
      logger.error({ err: error }, '[SyncService] Full sync cycle failed:');
    } finally {
      this.isSyncing = false;
      logger.info('[SyncService] Sync lock released.');
    }
  }
}

// Instantiate the dependencies
const apiClientInstance = new BattleNetApiClient();

// Instantiate the service with dependencies
const battleNetSyncServiceInstance = new BattleNetSyncService(
  apiClientInstance,
  guildModel,
  characterModel,
  rankModel,
  userModel,
  guildMemberModel
);

// Export the instance as default
export default battleNetSyncServiceInstance;