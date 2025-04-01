import { BattleNetCharacter, BattleNetGuild, BattleNetGuildMember, BattleNetGuildRoster, DbCharacter, DbGuild, DbGuildMember } from '../../../shared/types/guild'; // Added DbGuildMember, BattleNetGuild, EnhancedCharacterData
import { BattleNetRegion } from '../../../shared/types/user'; // Added import for BattleNetRegion
import * as characterModel from '../models/character.model';
import * as guildModel from '../models/guild.model';
import * as guildMemberModel from '../models/guild_member.model'; // Added guildMemberModel import
import * as rankModel from '../models/rank.model';
import * as userModel from '../models/user.model'; // Needed? Maybe for leader lookup
import { BattleNetApiClient } from '../services/battlenet-api.client'; // Added import
import { AppError } from '../utils/error-handler';
import logger from '../utils/logger'; // Import the logger
import { createSlug } from '../utils/slugify'; // Import the slugify function
import { withTransaction } from '../utils/transaction'; // Added withTransaction import
import * as crypto from 'crypto'; // Added for toy hashing

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
    let region = character.region; // Start with existing region as fallback

    // Determine Region and Local Guild ID
    if (bnet_guild_id) {
      try {
        localGuild = await this.guildModel.findOne({ bnet_guild_id: bnet_guild_id });
        if (localGuild) {
          region = localGuild.region; // Use region from found local guild
        } else {
          logger.warn({ bnetGuildId: bnet_guild_id, charName: character.name, charId: character.id }, `[SyncService] Local guild record not found for BNet Guild ID ${bnet_guild_id}. Queueing guild sync.`);
          await this._queueMissingGuildSync(enhancedData.guild, character.region);
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
                    const toyIds = toysData.toys.map((t: { toy: { id: number } }) => t.toy.id);
                    toyIds.sort((a: number, b: number) => a - b); // Sort numerically
                    const idString = toyIds.join('|');
                    calculatedToyHash = crypto.createHash('sha256').update(idString).digest('hex');
                    logger.debug({ charName: character.name, realmSlug, region, hash: calculatedToyHash }, `[SyncService] Calculated toy hash.`);
                } else {
                    logger.debug({ charName: character.name, realmSlug, region }, `[SyncService] No toys found in collection, using default hash.`);
                    calculatedToyHash = NO_TOYS_HASH;
                }
            } else {
                 logger.debug({ charName: character.name, realmSlug, region }, `[SyncService] No toys href found in collections index, using default hash.`);
                 calculatedToyHash = NO_TOYS_HASH;
            }
        } catch (toyError) {
            logger.error({ err: toyError, charName: character.name, realmSlug, region }, `[SyncService] Error fetching toy collection for unknown character. Using default hash.`);
            calculatedToyHash = NO_TOYS_HASH; // Use default hash on error
        }
    } else if (character.user_id !== null) {
        // Explicitly set toy_hash to null for known users to clear any old value
        calculatedToyHash = null;
    }
    // --- End Toy Hash Calculation ---


    // Prepare update payload
    const updatePayload: Partial<DbCharacter> = {
      profile_json: enhancedData,
      equipment_json: enhancedData.equipment,
      mythic_profile_json: enhancedData.mythicKeystone === null ? undefined : enhancedData.mythicKeystone,
      // Ensure professions_json stores only the 'primaries' array if that's the intended structure
      professions_json: enhancedData.professions?.primaries,
      level: enhancedData.level,
      class: enhancedData.character_class.name,
      last_synced_at: new Date().toISOString(),
      bnet_character_id: bnet_character_id,
      // guild_id: localGuild?.id, // REMOVED - guild_id is not on characters table
      region: region, // Use determined region
      toy_hash: calculatedToyHash, // Add the calculated toy hash (can be null)
    };

    // Remove undefined keys to avoid accidentally setting columns to null
    Object.keys(updatePayload).forEach(key => updatePayload[key as keyof typeof updatePayload] === undefined && delete updatePayload[key as keyof typeof updatePayload]);


    return updatePayload;
  }

  /**
   * Checks if a guild exists based on Battle.net data and creates a minimal record
   * if it doesn't, marking it for sync.
   * @param bnetGuildData Guild data snippet from Battle.net (e.g., from character profile).
   * @param fallbackRegion Region to use if not directly available in bnetGuildData.
   * @private
   */
  private async _queueMissingGuildSync(
    bnetGuildData: BattleNetCharacter['guild'], // Use type from BattleNetCharacter
    fallbackRegion?: string | null // Allow null/undefined
  ): Promise<void> {
    if (!bnetGuildData) {
      logger.warn('[SyncService:_queueMissingGuildSync] Received null guild data, cannot queue.');
      return;
    }

    const { id: bnet_guild_id, name, realm } = bnetGuildData;
    const realmSlug = realm?.slug;
    let region: BattleNetRegion | undefined | null = undefined; // Use BattleNetRegion type

    // Attempt to determine region from realm slug (simple heuristic)
    if (realmSlug) {
        // Add more specific rules based on known Battle.net slug conventions if needed
        if (realmSlug.endsWith('-eu')) { region = 'eu'; }
        else if (realmSlug.endsWith('-kr')) { region = 'kr'; }
        else if (realmSlug.endsWith('-tw')) { region = 'tw'; }
        else if (realmSlug.endsWith('-cn')) { region = 'cn'; } // Assuming -cn for China
        else if (!realmSlug.includes('-')) { region = 'us'; } // Assume US if no region suffix
    }

    // If region couldn't be determined from slug, use the fallback
    if (!region && fallbackRegion) {
        // Ensure fallbackRegion is a valid BattleNetRegion type if possible
        // This might require validation depending on the source of fallbackRegion
        region = fallbackRegion as BattleNetRegion;
        logger.debug({ fallbackRegionUsed: region }, '[SyncService:_queueMissingGuildSync] Determined region using fallback.');
    }


    if (!name || !realmSlug || !region) {
      logger.error({ bnetGuildId: bnet_guild_id, name, realmSlug, determinedRegion: region, fallbackRegion }, '[SyncService:_queueMissingGuildSync] Missing essential data (name, realm slug, or region) to queue guild. Cannot proceed.');
      return;
    }

    try {
      // Check if guild already exists (by bnet_id or name/realm/region)
      let existingGuild = await this.guildModel.findOne({ bnet_guild_id: bnet_guild_id });
      if (!existingGuild) {
        existingGuild = await this.guildModel.findByNameRealmRegion(name, realmSlug, region);
      }

      if (!existingGuild) {
        // Guild does not exist, create a minimal record to trigger sync
        logger.info({ name, realmSlug, region, bnetGuildId: bnet_guild_id }, `[SyncService:_queueMissingGuildSync] Guild ${name}-${realmSlug} not found. Creating minimal record to queue for sync.`);
        await this.guildModel.create({
          name: name,
          realm: realmSlug,
          region: region,
          bnet_guild_id: bnet_guild_id,
          last_updated: null, // Ensure it gets picked up by findOutdatedGuilds
          last_roster_sync: null,
        });
      } else {
        // Guild exists, maybe force a sync if it's very old? Optional.
        // logger.debug({ name, realmSlug, region, guildId: existingGuild.id }, `[SyncService:_queueMissingGuildSync] Guild ${name}-${realmSlug} already exists (ID: ${existingGuild.id}).`);
      }
    } catch (error) {
      logger.error({ err: error, name, realmSlug, region, bnetGuildId: bnet_guild_id }, `[SyncService:_queueMissingGuildSync] Error checking or creating guild record for ${name}-${realmSlug}:`);
    }
  }



  async syncCharacter(character: DbCharacter): Promise<void> {
    // Check if character ID exists
    if (!character || !character.id) {
      logger.error('[SyncService] Attempted to sync character with missing ID.');
      return; // Cannot proceed without an ID
    }

    logger.info({ charName: character.name, realm: character.realm, charId: character.id }, `[SyncService] Starting sync for character: ${character.name} (${character.realm}) ID: ${character.id}`);

    // --- New Availability Check ---
    let associatedGuildMembers: DbGuildMember[] = [];
    try {
      // Use the injected guildMemberModel instance
      associatedGuildMembers = await this.guildMemberModel.findByCharacterIds([character.id]);
    } catch (fetchError) {
      logger.error({ err: fetchError, charId: character.id }, `[SyncService] Error fetching guild memberships for character ${character.id}. Skipping sync.`);
      return; // Cannot determine availability, skip sync
    }

    // If the character isn't in any guild tracked by the system, proceed normally.
    // If they are in guilds, check if *any* membership allows syncing.
    if (associatedGuildMembers.length > 0) {
      const isAnyMembershipAvailable = associatedGuildMembers.some(gm => gm.isAvailable);
      if (!isAnyMembershipAvailable) {
        logger.info({ charId: character.id, charName: character.name }, `[SyncService] Character ${character.name} (ID: ${character.id}) is marked as unavailable in all associated guilds. Skipping API sync.`);
        // Optionally update character's last_updated timestamp even if skipped?
        // await this.characterModel.update(character.id, { last_updated: new Date().toISOString() });
        return; // Skip the rest of the sync process
      }
      // If at least one membership is available, proceed with the API call.
      // Success/failure logic below will handle updating all memberships.
      logger.debug({ charId: character.id, charName: character.name }, `[SyncService] Character ${character.name} (ID: ${character.id}) is available in at least one guild. Proceeding with API sync.`);
    } else {
       logger.debug({ charId: character.id, charName: character.name }, `[SyncService] Character ${character.name} (ID: ${character.id}) has no associated guild memberships in DB. Proceeding with API sync.`);
    }
    // --- End New Availability Check ---


    try {
       // Ensure character region is defined before proceeding
       if (!character.region) {
         logger.warn({ charName: character.name, charId: character.id }, `[SyncService] Skipping character sync for ${character.name} (ID: ${character.id}) due to missing region.`);
         // Consider this a failure for availability tracking? Yes.
         throw new AppError(`Character ${character.name} (ID: ${character.id}) is missing region.`, 400);
       }

       // Token fetching is now handled within the apiClient methods

       // Fetch enhanced data using injected client
       // Note: getEnhancedCharacterData fetches profile, equipment, mythic keystone, professions
       const enhancedData = await this.apiClient.getEnhancedCharacterData( // Use apiClient
           character.realm,
           character.name.toLowerCase(), // Ensure lowercase name is passed as expected by client
           character.region as BattleNetRegion // Cast region after check
       );

       // Check if enhancedData is null (meaning fetch failed, e.g., 404)
       if (enhancedData === null) {
         logger.info({ charName: character.name, charId: character.id }, `[SyncService] Character ${character.name} (ID: ${character.id}) fetch failed (likely 404). Treating as sync failure.`);
         // Consider this a failure for the availability logic
         throw new AppError(`No profile data returned for ${character.name}-${character.realm}`, 404);
       }

      // Prepare the update payload using the helper method
      const updatePayload = await this._prepareCharacterUpdatePayload(character, enhancedData);

      // Update the character record in the database
      await this.characterModel.update(character.id, updatePayload);
      logger.info({ charName: character.name, realm: character.realm, charId: character.id }, `[SyncService] Successfully synced character: ${character.name} (${character.realm})`);

      // --- New Success Update for Guild Members ---
      if (associatedGuildMembers.length > 0) {
        for (const gm of associatedGuildMembers) {
          // Only update if necessary to reset failures or mark as available
          if (gm.consecutiveUpdateFailures !== 0 || !gm.isAvailable) {
            try {
              // Use the injected guildMemberModel instance's update method
              await this.guildMemberModel.update(gm.id, {
                consecutiveUpdateFailures: 0,
                isAvailable: true,
                // updated_at is handled by the model's update method
              });
               logger.debug({ charId: character.id, guildMemberId: gm.id }, `[SyncService] Reset failure count and marked available for guild member ${gm.id}.`);
            } catch (gmUpdateError) {
              logger.error({ err: gmUpdateError, charId: character.id, guildMemberId: gm.id }, `[SyncService] Error updating guild member ${gm.id} after successful character sync.`);
            }
          }
        }
      }
      // --- End New Success Update ---

    } catch (error) {
      logger.error({ err: error, charId: character.id, charName: character.name }, `[SyncService] Error syncing character ${character.name} (ID: ${character.id}):`);

      // --- New Failure Update for Guild Members ---
      if (associatedGuildMembers.length > 0) {
        for (const gm of associatedGuildMembers) {
          // Fetch the latest state in case of concurrent updates? For now, assume gm object is recent enough.
          const currentFailures = gm.consecutiveUpdateFailures || 0; // Default to 0 if null/undefined
          const newFailures = currentFailures + 1;
          const shouldBeAvailable = newFailures <= 3; // Becomes unavailable *after* 3 failures (i.e., on the 4th)

          // Only update if the state actually changes
          if (gm.consecutiveUpdateFailures !== newFailures || gm.isAvailable !== shouldBeAvailable) {
              try {
                // Use the injected guildMemberModel instance's update method
                await this.guildMemberModel.update(gm.id, {
                  consecutiveUpdateFailures: newFailures,
                  isAvailable: shouldBeAvailable,
                  // updated_at is handled by the model's update method
                });
                 logger.warn({ charId: character.id, guildMemberId: gm.id, failures: newFailures, nowAvailable: shouldBeAvailable }, `[SyncService] Incremented failure count to ${newFailures} for guild member ${gm.id}. Available: ${shouldBeAvailable}`);
              } catch (gmUpdateError) {
                logger.error({ err: gmUpdateError, charId: character.id, guildMemberId: gm.id }, `[SyncService] Error updating guild member ${gm.id} after failed character sync.`);
              }
          } else {
               logger.debug({ charId: character.id, guildMemberId: gm.id, failures: newFailures, available: shouldBeAvailable }, `[SyncService] Guild member ${gm.id} failure/availability state unchanged.`);
          }
        }
      }
      // --- End New Failure Update ---

      // Optionally update character record with error state/timestamp
      // await this.characterModel.update(character.id, { last_error: error.message, last_updated: new Date().toISOString() });
    }
  }

  /**
   * Main sync function to run periodically.
   */
  async runSync(): Promise<void> {
    if (this.isSyncing) {
      logger.info('[SyncService] Sync already in progress. Skipping.');
      return;
    }

    logger.info('[SyncService] Starting background sync run...');
    this.isSyncing = true;

    try {
      // 1. Sync Guilds in parallel
      const outdatedGuilds = await this.guildModel.findOutdatedGuilds();
      logger.info({ count: outdatedGuilds.length }, `[SyncService] Found ${outdatedGuilds.length} guilds to sync.`);
      if (outdatedGuilds.length > 0) {
        const guildSyncPromises = outdatedGuilds.map(guild =>
          this.syncGuild(guild).catch(error => {
            // Log individual guild sync errors but don't stop others
            logger.error({ err: error, guildId: guild.id, guildName: guild.name }, `[SyncService] Error syncing guild ${guild.id} (${guild.name}):`);
            // Return an error object to be identifiable in results
            return { status: 'rejected', reason: error, guildId: guild.id };
          })
        );
        const guildResults = await Promise.allSettled(guildSyncPromises);
        const guildsFulfilled = guildResults.filter(r => r.status === 'fulfilled').length;
        const guildsRejected = guildResults.length - guildsFulfilled;
        logger.info({ fulfilled: guildsFulfilled, rejected: guildsRejected }, `[SyncService] Guild sync results: ${guildsFulfilled} fulfilled, ${guildsRejected} rejected.`);
      }

      // 2. Sync Characters in parallel
      const outdatedCharacters = await this.characterModel.findOutdatedCharacters();
      logger.info({ count: outdatedCharacters.length }, `[SyncService] Found ${outdatedCharacters.length} characters to sync.`);
      if (outdatedCharacters.length > 0) {
        const characterSyncPromises = outdatedCharacters.map(character =>
          this.syncCharacter(character).catch(error => {
            // Log individual character sync errors
            logger.error({ err: error, charId: character.id, charName: character.name }, `[SyncService] Error syncing character ${character.id} (${character.name}):`);
            return { status: 'rejected', reason: error, characterId: character.id };
          })
        );
        const characterResults = await Promise.allSettled(characterSyncPromises);
        const charsFulfilled = characterResults.filter(r => r.status === 'fulfilled').length;
        const charsRejected = characterResults.length - charsFulfilled;
        logger.info({ fulfilled: charsFulfilled, rejected: charsRejected }, `[SyncService] Character sync results: ${charsFulfilled} fulfilled, ${charsRejected} rejected.`);
      }

      logger.info('[SyncService] Background sync run finished processing guilds and characters.');

    } catch (error) {
      logger.error({ err: error }, '[SyncService] Error during sync run:');
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