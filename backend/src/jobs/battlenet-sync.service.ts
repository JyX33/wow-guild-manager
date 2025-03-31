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
            is_main: false,
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
    let region: string | undefined = undefined;

    if (bnet_guild_id) {
      try {
        // Find the local guild record using the Battle.net guild ID
        localGuild = await this.guildModel.findOne({ bnet_guild_id: bnet_guild_id });
        if (localGuild) {
          // Local guild found, use its region
          region = localGuild.region;
        } else {
          // Local guild NOT found, queue it for sync
          logger.warn({ bnetGuildId: bnet_guild_id, charName: character.name, charId: character.id }, `[SyncService] Local guild record not found for BNet Guild ID ${bnet_guild_id}. Queueing guild for sync.`);
          // Attempt to queue the guild based on data from character profile
          await this._queueMissingGuildSync(enhancedData.guild, character.region); // Pass character region as fallback
          // Fallback to existing character region for THIS character update
          region = character.region;
          // Do NOT set localGuild here, it remains null for this character update
        }
      } catch (guildError) {
        logger.error({ err: guildError, bnetGuildId: bnet_guild_id, charName: character.name, charId: character.id }, `[SyncService] Error fetching local guild for BNet Guild ID ${bnet_guild_id}. Cannot queue guild.`);
        // Fallback to existing character region on error
        region = character.region;
        // localGuild remains null or its previous value (likely null)
      }
    } else {
      // Character has no guild in their Battle.net profile
      // Use existing character region if available
      region = character.region;
      // Ensure localGuild is null if character is guildless on BNet
      localGuild = null;
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
    logger.info({ charName: character.name, realm: character.realm, charId: character.id }, `[SyncService] Starting sync for character: ${character.name} (${character.realm}) ID: ${character.id}`);
     try {
        // Ensure character region is defined before proceeding
        if (!character.region) {
          logger.warn({ charName: character.name, charId: character.id }, `[SyncService] Skipping character sync for ${character.name} (ID: ${character.id}) due to missing region.`);
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
          logger.info({ charName: character.name, charId: character.id }, `[SyncService] Skipping update for character ${character.name} (ID: ${character.id}) due to fetch failure.`);
          // Optionally update last_synced_at with an error flag or just skip? Skipping for now.
          return; // Exit the syncCharacter function for this character
        }

        // Prepare update payload using the helper method
        const updatePayload = await this._prepareCharacterUpdatePayload(character, enhancedData);

        // Update character record in DB
        await this.characterModel.update(character.id, updatePayload);
        logger.info({ charName: character.name, charId: character.id }, `[SyncService] Successfully synced character ${character.name} (ID: ${character.id})`);

     } catch (error) {
       logger.error({ err: error, charName: character.name, charId: character.id }, `[SyncService] Error syncing character ${character.name} (ID: ${character.id}):`);
       // Optionally update character record with error state/timestamp
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