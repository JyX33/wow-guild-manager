import * as crypto from 'crypto';
import axios from 'axios'; // For HTTP error detection

// Shared Types
import {
  BattleNetGuild,
  BattleNetGuildMember,
  BattleNetGuildRoster,
  DbCharacter,
  DbGuild,
  DbGuildMember,
  GuildRank, // Import GuildRank for type usage
} from '../../../shared/types/guild.js';
import { BattleNetRegion } from '../../../shared/types/user.js';
import { EnhancedCharacterData } from '../../../shared/types/index.js'; // Import from index.js

// Models
import characterModelInstance, { CharacterModel } from '../models/character.model.js';
import guildModelInstance, { GuildModel } from '../models/guild.model.js';
import guildMemberModelInstance, { GuildMemberModel } from '../models/guild_member.model.js';
import rankModelInstance, { RankModel } from '../models/rank.model.js';
import userModelInstance, { UserModel } from '../models/user.model.js';

// Services
import { BattleNetApiClient } from '../services/battlenet-api.client.js';

// Utilities
import { AppError } from '../utils/error-handler.js';
import logger from '../utils/logger.js';
import { createSlug } from '../utils/slugify.js';
import { withTransaction } from '../utils/transaction.js';

/**
 * Type definition for rows fetched from guild_members joined with characters.
 * Includes necessary fields for member comparison and key generation.
 */
type GuildMemberComparisonRow = {
  id: number;
  character_id: number | null;
  character_name: string | null;
  realm: string | null; // Realm slug from the characters table
  rank: number;
  is_available: boolean | null;
};

/**
 * Type definition for the structure expected from the Battle.net toy collection endpoint.
 */
type ToyCollectionData = {
  toys: { toy: { id: number } }[];
};

// Constant for SHA256 hash of "NO_TOYS_FOUND"
const NO_TOYS_HASH = 'a3741d687719e1c015f4f115371c77064771f699817f81f09016350165a19111';

/**
 * @class BattleNetSyncService
 * @description Service responsible for synchronizing guild and character data
 *              from the Battle.net API with the local database.
 *              Handles fetching data, comparing it with existing records,
 *              and performing necessary database updates (create, update, delete/mark unavailable).
 */
class BattleNetSyncService {
  private isSyncing: boolean = false;
  private readonly apiClient: BattleNetApiClient;
  private readonly guildModel: GuildModel;
  private readonly characterModel: CharacterModel;
  private readonly rankModel: RankModel;
  private readonly userModel: UserModel;
  private readonly guildMemberModel: GuildMemberModel;

  /**
   * Creates an instance of BattleNetSyncService.
   * Injects necessary model and client instances for data access and API communication.
   * @param {BattleNetApiClient} apiClientInstance - Instance for Battle.net API communication.
   * @param {GuildModel} guildModelInstance - Instance for guild data access.
   * @param {CharacterModel} characterModelInstance - Instance for character data access.
   * @param {RankModel} rankModelInstance - Instance for rank data access.
   * @param {UserModel} userModelInstance - Instance for user data access.
   * @param {GuildMemberModel} guildMemberModelInstance - Instance for guild member data access.
   */
  constructor(
    apiClientInstance: BattleNetApiClient,
    guildModelInstance: GuildModel,
    characterModelInstance: CharacterModel,
    rankModelInstance: RankModel,
    userModelInstance: UserModel,
    guildMemberModelInstance: GuildMemberModel
  ) {
    this.apiClient = apiClientInstance;
    this.guildModel = guildModelInstance;
    this.characterModel = characterModelInstance;
    this.rankModel = rankModelInstance;
    this.userModel = userModelInstance;
    this.guildMemberModel = guildMemberModelInstance;
  }

  /**
   * Generates a unique key for a character based on name and realm slug.
   * Normalizes inputs to lowercase for consistent map keying and comparison.
   * @param {string} name - Character name.
   * @param {string} realmSlug - Character realm slug.
   * @returns {string} The generated key (e.g., "playername-arealm").
   * @private
   */
  private _createCharacterKey(name: string, realmSlug: string): string {
    // Ensure inputs are strings and handle potential null/undefined before lowercasing
    const safeName = String(name || '').toLowerCase();
    const safeRealmSlug = String(realmSlug || '').toLowerCase();
    return `${safeName}-${safeRealmSlug}`;
  }

  /**
   * Updates the core guild data (metadata, roster JSON, leader, member count) in the database.
   * Also attempts to find and link the guild leader based on the roster.
   * @param {DbGuild} guild - The original guild record from the DB.
   * @param {BattleNetGuild} bnetGuildData - Data fetched from the Battle.net guild endpoint.
   * @param {BattleNetGuildRoster} bnetGuildRoster - Data fetched from the Battle.net guild roster endpoint.
   * @returns {Promise<void>} Resolves when the update is complete.
   * @private
   */
  private async _updateCoreGuildData(guild: DbGuild, bnetGuildData: BattleNetGuild, bnetGuildRoster: BattleNetGuildRoster): Promise<void> {
    const logContext = { guildId: guild.id, guildName: guild.name, realm: guild.realm, region: guild.region };
    logger.debug(logContext, `[SyncService] Preparing to update core data for guild.`);

    const updatePayload: Partial<DbGuild> = {
      guild_data_json: bnetGuildData,
      roster_json: bnetGuildRoster,
      bnet_guild_id: bnetGuildData.id,
      last_updated: new Date().toISOString(),
      last_roster_sync: new Date().toISOString(),
      member_count: bnetGuildRoster.members.length,
      leader_id: null, // Default to null, update if GM is found and linked
    };

    // Find the Guild Master (rank 0) in the roster
    const guildMasterMember = bnetGuildRoster.members.find((m: BattleNetGuildMember) => m.rank === 0);

    if (guildMasterMember) {
      const gmName = guildMasterMember.character.name;
      const gmRealmSlug = guildMasterMember.character.realm.slug;
      const gmLogContext = { ...logContext, gmName, gmRealmSlug };
      logger.debug(gmLogContext, `[SyncService] Found potential GM in roster: ${gmName}-${gmRealmSlug}. Attempting to link user.`);

      try {
        // Attempt to find a local user matching the GM's character name and realm slug
        const guildMasterUser = await this.userModel.findByCharacterName(gmName, gmRealmSlug);
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
      await this.guildModel.update(guild.id, updatePayload);
      logger.info(logContext, `[SyncService] Successfully updated core guild data.`);
    } catch (updateError: unknown) {
      logger.error({ err: updateError, ...logContext }, `[SyncService] Failed to update core guild data in database.`);
      // Consider re-throwing or handling more specifically if this failure is critical
      // For now, log the error and allow the sync process to potentially continue.
    }
  }


  /**
   * Syncs core data, roster, members, and ranks for a single guild.
   * Fetches guild and roster data from Battle.net.
   * Updates the local guild record with fetched data.
   * Synchronizes the `guild_members` table based on the roster.
   * Synchronizes the `ranks` table based on the roster.
   * Handles 404 errors from Battle.net by marking the guild to be excluded from future syncs.
   * @param {DbGuild} guild - The guild database record to sync.
   * @returns {Promise<void>} Resolves when the sync is complete or rejects on critical error.
   */
  async syncGuild(guild: DbGuild): Promise<void> {
    const guildIdentifier = `${guild.name} (${guild.realm} - ${guild.region})`;
    const logContext = { guildId: guild.id, guildName: guild.name, realm: guild.realm, region: guild.region };
    logger.info(logContext, `[SyncService] Starting sync for guild: ${guildIdentifier}`);

    try {
      const realmSlug = createSlug(guild.realm);
      const guildNameSlug = createSlug(guild.name);
      const region = guild.region as BattleNetRegion; // Assume region is valid

      // 1. Fetch Core Guild Data from Battle.net
      let bnetGuildData: BattleNetGuild;
      try {
        logger.debug(logContext, `[SyncService] Fetching core guild data from Battle.net for ${guildIdentifier}.`);
        bnetGuildData = await this.apiClient.getGuildData(realmSlug, guildNameSlug, region);
        logger.debug(logContext, `[SyncService] Successfully fetched core guild data.`);
      } catch (error: unknown) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          logger.warn(logContext, `[SyncService] Guild ${guildIdentifier} not found on Battle.net (404). Marking to exclude from future sync.`);
          await this.guildModel.update(guild.id, { exclude_from_sync: true, last_updated: new Date().toISOString() });
          return; // Stop sync for this guild
        }
        // Re-throw other errors for the outer catch block
        logger.error({ err: error, ...logContext }, `[SyncService] Failed to fetch core guild data for ${guildIdentifier}.`);
        throw error; // Propagate critical API errors
      }

      // 2. Fetch Guild Roster from Battle.net
      let bnetGuildRoster: BattleNetGuildRoster;
      try {
        logger.debug(logContext, `[SyncService] Fetching guild roster data from Battle.net for ${guildIdentifier}.`);
        bnetGuildRoster = await this.apiClient.getGuildRoster(region, realmSlug, guildNameSlug);
        logger.debug({ ...logContext, rosterSize: bnetGuildRoster.members.length }, `[SyncService] Successfully fetched guild roster with ${bnetGuildRoster.members.length} members.`);
      } catch (error: unknown) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          logger.warn(logContext, `[SyncService] Guild roster for ${guildIdentifier} not found on Battle.net (404). Marking to exclude from future sync.`);
          // Still update last_updated time even if roster fails
          await this.guildModel.update(guild.id, { exclude_from_sync: true, last_updated: new Date().toISOString() });
          return; // Stop sync for this guild
        }
        // Re-throw other errors
        logger.error({ err: error, ...logContext }, `[SyncService] Failed to fetch guild roster data for ${guildIdentifier}.`);
        throw error; // Propagate critical API errors
      }

      // 3. Update Core Guild Data in Local DB (incl. leader lookup)
      // This method handles its own logging and errors internally
      await this._updateCoreGuildData(guild, bnetGuildData, bnetGuildRoster);

      // 4. Synchronize the `guild_members` Table
      // This operation is critical and handles its own transaction and errors internally
      await this.syncGuildMembersTable(guild.id, bnetGuildRoster, region);

      // 5. Synchronize the `ranks` Table
      // This operation handles its own errors internally
      await this._syncGuildRanks(guild.id, bnetGuildRoster);

      logger.info(logContext, `[SyncService] Successfully completed sync cycle for guild ${guildIdentifier}.`);

    } catch (error: unknown) {
      // Catch errors not handled internally by sub-methods (e.g., API fetch failures re-thrown)
      logger.error({ err: error, ...logContext }, `[SyncService] Unhandled error during sync for guild ${guildIdentifier}. Sync cycle for this guild aborted.`);
      // Optionally update guild record with error state/timestamp here if needed
      try {
        // Update timestamp even on failure to prevent immediate re-sync attempts
        await this.guildModel.update(guild.id, { last_updated: new Date().toISOString() });
      } catch (updateError) {
        logger.error({ err: updateError, ...logContext }, `[SyncService] Failed to update guild timestamp after unhandled sync error.`);
      }
    }
  }
  
  /**
   * Compares the fetched Battle.net roster data with existing local guild members and characters
   * to determine the necessary database operations (add, update, deactivate members; create characters).
   *
   * @param rosterMembersMap Map of members from the fetched Battle.net roster, keyed by 'name-realm'.
   * @param existingMembersMap Map of existing members in the local `guild_members` table for this guild, keyed by 'name-realm'.
   * @param existingCharacterMap Map of existing characters in the local `characters` table relevant to this roster, keyed by 'name-realm', mapping to character ID.
   * @param region The region of the guild being synced, used when creating new character records.
   * @param guildId The ID of the guild being processed (for logging).
   * @returns An object detailing the changes needed.
   * @private
   */
  private _compareGuildMembers(
    rosterMembersMap: Map<string, BattleNetGuildMember>,
    existingMembersMap: Map<string, { id: number; character_id: number | null; rank: number }>,
    existingCharacterMap: Map<string, number>,
    region: BattleNetRegion,
    guildId: number
  ): {
    membersToAdd: { rosterMember: BattleNetGuildMember; characterId: number }[];
    membersToUpdate: { memberId: number; rank?: number; characterId?: number; bnetMemberData?: BattleNetGuildMember }[]; // Renamed memberData
    memberIdsToDeactivate: number[]; // Renamed from memberIdsToMarkUnavailable
    charactersToCreate: Partial<DbCharacter>[];
  } {
    const membersToAdd: { rosterMember: BattleNetGuildMember; characterId: number }[] = [];
    const membersToUpdate: { memberId: number; rank?: number; characterId?: number; bnetMemberData?: BattleNetGuildMember }[] = [];
    const memberIdsToDeactivate: number[] = []; // Renamed
    const charactersToCreate: Partial<DbCharacter>[] = [];
    const processedExistingMemberKeys = new Set(existingMembersMap.keys()); // Track keys from DB to find those removed from roster

    logger.debug({ guildId, rosterSize: rosterMembersMap.size, existingMemberCount: existingMembersMap.size, existingCharCount: existingCharacterMap.size }, `[SyncService] Comparing BNet roster with local guild members.`);

    // Iterate through the members found in the latest Battle.net roster
    for (const [key, rosterMember] of rosterMembersMap.entries()) {
      const existingMember = existingMembersMap.get(key);
      const existingCharacterId = existingCharacterMap.get(key);
      // Consistent log context for character-specific messages
      const charLogContext = { guildId, charName: rosterMember.character.name, realmSlug: rosterMember.character.realm.slug, key };

      if (existingMember) {
        // --- Case 1: Member exists in local guild_members table ---
        processedExistingMemberKeys.delete(key); // Mark as processed (still in roster)
        const memberUpdatePayload: { rank?: number; characterId?: number; bnetMemberData?: BattleNetGuildMember } = {}; // Renamed memberData
        let needsUpdate = false;

        // Check for rank change
        if (existingMember.rank !== rosterMember.rank) {
          memberUpdatePayload.rank = rosterMember.rank;
          needsUpdate = true;
          logger.trace({ ...charLogContext, memberId: existingMember.id, oldRank: existingMember.rank, newRank: rosterMember.rank }, `[SyncService] Member rank changed.`);
        }

        // Check if character link is missing but character exists in `characters` table
        if (!existingMember.character_id && existingCharacterId) {
          memberUpdatePayload.characterId = existingCharacterId;
          needsUpdate = true;
          logger.trace({ ...charLogContext, memberId: existingMember.id, characterId: existingCharacterId }, `[SyncService] Linking existing character to member.`);
        } else if (existingMember.character_id && !existingCharacterId) {
            // This case is unlikely if character sync runs, but log it.
            logger.warn({ ...charLogContext, memberId: existingMember.id }, `[SyncService] Member ${existingMember.id} has character_id but no matching character found in map. Character might be unavailable or deleted.`);
        }

        // Always include the latest roster data in the update payload to refresh member_data_json
        // and ensure is_available=true is set during the bulk update.
        memberUpdatePayload.bnetMemberData = rosterMember; // Renamed memberData
        needsUpdate = true; // Force update to refresh JSON and ensure is_available=true

        if (needsUpdate) {
          logger.trace({ ...charLogContext, memberId: existingMember.id, updates: Object.keys(memberUpdatePayload) }, `[SyncService] Queuing update for existing member.`);
          membersToUpdate.push({ memberId: existingMember.id, ...memberUpdatePayload });
        } else {
          // Log if no update is needed (e.g., only JSON refresh, which we force anyway)
          logger.trace({ ...charLogContext, memberId: existingMember.id }, `[SyncService] No significant changes detected for existing member, but will refresh JSON.`);
        }
      } else {
        // --- Case 2: Member is new to this guild in local guild_members table ---
        if (existingCharacterId) {
          // Character already exists in `characters` table, just need to add the guild membership
          logger.trace({ ...charLogContext, characterId: existingCharacterId }, `[SyncService] Queuing addition of existing character to guild members.`);
          membersToAdd.push({ rosterMember, characterId: existingCharacterId });
        } else {
          // Character also needs to be created in `characters` table
          logger.trace(charLogContext, `[SyncService] New character found in roster. Queuing for creation.`);
          charactersToCreate.push({
            name: rosterMember.character.name,
            realm: rosterMember.character.realm.slug, // Store slug consistently
            class: rosterMember.character.playable_class?.name || 'Unknown', // Default if missing
            level: rosterMember.character.level,
            role: 'DPS', // TODO: Consider refining role based on class/spec if possible/needed
            region: region,
            // user_id will be null initially
            // profile_json etc. will be added by character sync later
            // is_available defaults to true on creation
          });
          // The character_id will be linked after creation in the calling function (syncGuildMembersTable)
        }
      }
    }

    // --- Case 3: Members in local DB but NOT in the latest roster ---
    // Any members left in processedExistingMemberKeys were not found in the current roster.
    for (const key of processedExistingMemberKeys) {
      const memberToDeactivate = existingMembersMap.get(key); // Renamed
      if (memberToDeactivate) {
        logger.trace({ guildId, memberId: memberToDeactivate.id, key }, `[SyncService] Member no longer in roster. Queuing to mark as unavailable (deactivate).`);
        memberIdsToDeactivate.push(memberToDeactivate.id); // Renamed
      } else {
          // Should not happen if the key came from the map, but log defensively
          logger.warn({ guildId, key }, `[SyncService] Could not find member data for key '${key}' during deactivation check.`);
      }
    }

    return { membersToAdd, membersToUpdate, memberIdsToDeactivate: memberIdsToDeactivate, charactersToCreate }; // Renamed
  }


  /**
   * Synchronizes the `guild_members` table for a specific guild based on the latest roster data.
   * - Fetches existing members and relevant characters from the local DB.
   * - Compares the local data with the fetched Battle.net roster using `_compareGuildMembers`.
   * - Determines members to add, update, or mark as unavailable.
   * - Creates necessary character records for new members.
   * - Performs all database modifications within a single transaction for atomicity.
   * @param {number} guildId - The ID of the guild being synced.
   * @param {BattleNetGuildRoster} roster - The fetched guild roster data from Battle.net.
   * @param {BattleNetRegion} region - The region of the guild, used for creating new characters.
   * @returns {Promise<void>} Resolves when the sync is complete or rejects on transaction error.
   */
  async syncGuildMembersTable(guildId: number, bnetRoster: BattleNetGuildRoster, region: BattleNetRegion): Promise<void> { // Renamed roster -> bnetRoster
    const rosterSize = bnetRoster.members.length;
    const logContext = { guildId, rosterSize };
    logger.info(logContext, `[SyncService] Starting guild_members table sync. Roster size: ${rosterSize}`);

    try {
      // Transaction is handled by withTransaction wrapper
      await withTransaction(async (client) => { // Keep client here as it's passed by withTransaction
        logger.debug(logContext, '[SyncService] Beginning transaction for guild member sync.');

        // --- Step 1: Fetch existing members for this guild ---
        logger.debug(logContext, '[SyncService] Fetching existing guild members from DB.');
        // Use client provided by withTransaction for direct queries
        const existingMembersResult = await client.query(
          `SELECT
             gm.id,
             gm.character_id,
             gm.character_name,
             gm.is_available,
             gm.rank,
             c.realm -- Fetch realm slug from characters table for key generation
           FROM
             guild_members gm
           LEFT JOIN
             characters c ON gm.character_id = c.id
           WHERE
             gm.guild_id = $1`,
          [guildId]
        );

        // Map existing members by 'name-realm' key for efficient lookup.
        const existingMembersMap = new Map<string, { id: number; character_id: number | null; rank: number; is_available: boolean | null }>();
        existingMembersResult.rows.forEach((row: GuildMemberComparisonRow) => {
          if (row.character_name && row.realm) {
            const key = this._createCharacterKey(row.character_name, row.realm);
            existingMembersMap.set(key, { id: row.id, character_id: row.character_id, rank: row.rank, is_available: row.is_available });
          } else {
            logger.warn({ ...logContext, memberId: row.id, characterId: row.character_id }, `[SyncService] Skipping existing member (ID: ${row.id}) from map due to missing name or realm slug.`);
          }
        });
        logger.info({ ...logContext, count: existingMembersMap.size }, `[SyncService] Mapped ${existingMembersMap.size} existing members from DB.`);

        // --- Step 2: Create map of members from the fetched Battle.net roster ---
        const rosterMembersMap = new Map<string, BattleNetGuildMember>();
        bnetRoster.members.forEach(member => { // Use renamed bnetRoster
          if (member.character?.name && member.character?.realm?.slug) {
            const key = this._createCharacterKey(member.character.name, member.character.realm.slug);
            rosterMembersMap.set(key, member);
          } else {
            logger.warn({ ...logContext, memberData: member }, `[SyncService] Skipping BNet roster member due to missing name or realm slug.`);
          }
        });
        logger.debug({ ...logContext, count: rosterMembersMap.size }, `[SyncService] Mapped ${rosterMembersMap.size} members from BNet roster.`);


        // --- Step 3: Fetch existing character records relevant to this roster ---
        logger.debug(logContext, '[SyncService] Fetching existing character records matching BNet roster members.');
        const characterKeysForLookup = Array.from(rosterMembersMap.values())
          .filter(member => member.character?.name && member.character?.realm?.slug)
          .map(member => ({
            name: member.character.name,
            realm: member.character.realm.slug
          }));

        // Model methods should handle transactions implicitly or via context, remove explicit client pass
        const existingCharacters = characterKeysForLookup.length > 0
            ? await this.characterModel.findByMultipleNameRealm(characterKeysForLookup)
            : [];

        const existingCharacterMap = new Map<string, number>();
        existingCharacters.forEach((char: DbCharacter) => {
            if (char.name && char.realm) {
              const key = this._createCharacterKey(char.name, char.realm);
              existingCharacterMap.set(key, char.id);
            }
        });
        logger.info({ ...logContext, count: existingCharacterMap.size }, `[SyncService] Mapped ${existingCharacterMap.size} existing characters matching BNet roster.`);

        // --- Step 4: Compare roster with local data ---
        const {
          membersToAdd,
          membersToUpdate,
          memberIdsToDeactivate, // Already renamed
          charactersToCreate
        } = this._compareGuildMembers(rosterMembersMap, existingMembersMap, existingCharacterMap, region, guildId);

        logger.info({
          ...logContext,
          addMembers: membersToAdd.length,
          createChars: charactersToCreate.length,
          updateMembers: membersToUpdate.length,
          deactivateMembers: memberIdsToDeactivate.length, // Use renamed variable
        }, `[SyncService] Member comparison results: Add=${membersToAdd.length}, Create+Add=${charactersToCreate.length}, Update=${membersToUpdate.length}, Deactivate=${memberIdsToDeactivate.length}`); // Use renamed variable

        // --- Step 5: Create new character records ---
        const createdCharacterMap = new Map<string, number>();
        if (charactersToCreate.length > 0) {
          logger.debug({ ...logContext, count: charactersToCreate.length }, '[SyncService] Creating new character records.');
          const creationPromises = charactersToCreate.map(async (charData) => {
            try {
              // Model methods handle transactions implicitly or via context, remove explicit client pass
              const newChar = await this.characterModel.create(charData);
              const key = this._createCharacterKey(newChar.name, newChar.realm);
              createdCharacterMap.set(key, newChar.id);
              logger.info({ ...logContext, charName: newChar.name, realm: newChar.realm, charId: newChar.id }, `[SyncService] Created character ${newChar.name}-${newChar.realm} (ID: ${newChar.id})`);
            } catch (createError: unknown) {
              logger.error({ err: createError, ...logContext, charName: charData.name, realm: charData.realm }, `[SyncService] Failed to create character record for ${charData.name}-${charData.realm}.`);
              // Continue processing other characters
            }
          });
          await Promise.all(creationPromises);
          logger.info({ ...logContext, count: createdCharacterMap.size }, `[SyncService] Finished creating ${createdCharacterMap.size} new characters.`);
        }

        // --- Step 6: Prepare data for bulk creating new guild_members records ---
        const newMembersData = []; // Let TS infer type

        // 6a. Add members whose characters already existed
        for (const { rosterMember, characterId } of membersToAdd) {
           newMembersData.push({
             guild_id: guildId,
             character_id: characterId,
             rank: rosterMember.rank,
             character_name: rosterMember.character.name,
             character_class: rosterMember.character.playable_class?.name || 'Unknown',
             member_data_json: rosterMember,
             is_available: true, // New members from current roster are available
             is_main: false, // Default to false
           });
        }

        // 6b. Add members whose characters were just created
        for (const charData of charactersToCreate) {
            if (!charData.name || !charData.realm) {
                logger.warn({ ...logContext, charData }, `[SyncService] Skipping member creation for character data missing name/realm.`);
                continue;
            }
            const key = this._createCharacterKey(charData.name, charData.realm);
            const newCharacterId = createdCharacterMap.get(key);
            const rosterMember = rosterMembersMap.get(key);

            if (!newCharacterId) {
                logger.error({ ...logContext, key }, `[SyncService] Could not find newly created character ID for key '${key}' during member creation. Skipping.`);
                continue;
            }
            if (!rosterMember) {
                logger.error({ ...logContext, key }, `[SyncService] Could not find BNet roster member data for key '${key}' during member creation. Skipping.`);
                continue;
            }

            newMembersData.push({
              guild_id: guildId,
              character_id: newCharacterId,
              rank: rosterMember.rank,
              character_name: rosterMember.character.name,
              character_class: rosterMember.character.playable_class?.name || 'Unknown',
              member_data_json: rosterMember,
              is_available: true, // New members are available
              is_main: false, // Default to false
            });
        }

        // --- Step 7: Perform bulk insert for new members ---
        if (newMembersData.length > 0) {
          logger.debug({ ...logContext, count: newMembersData.length }, '[SyncService] Bulk inserting new guild members.');
          try {
            // Model methods handle transactions implicitly or via context, remove explicit client pass
            await this.guildMemberModel.bulkCreate(newMembersData);
            logger.info({ ...logContext, count: newMembersData.length }, `[SyncService] Bulk inserted ${newMembersData.length} new members.`);
          } catch (bulkCreateError: unknown) {
            logger.error({ err: bulkCreateError, ...logContext }, `[SyncService] Error during bulk insert of new members.`);
            throw bulkCreateError; // Re-throw to ensure transaction rollback
          }
        }

        // --- Step 8: Prepare and perform bulk update for existing members ---
        if (membersToUpdate.length > 0) {
          logger.debug({ ...logContext, count: membersToUpdate.length }, '[SyncService] Bulk updating existing guild members.');
          const updatesWithAvailability = membersToUpdate.map(update => ({
            memberId: update.memberId,
            rank: update.rank,
            character_id: update.characterId,
            member_data_json: update.bnetMemberData, // Use renamed property
            is_available: true, // Mark as available since they are in the current roster
          }));
          try {
            // Model methods handle transactions implicitly or via context, remove explicit client pass
            await this.guildMemberModel.bulkUpdate(updatesWithAvailability);
            logger.info({ ...logContext, count: membersToUpdate.length }, `[SyncService] Bulk updated ${membersToUpdate.length} existing members.`);
          } catch (bulkUpdateError: unknown) {
            logger.error({ err: bulkUpdateError, ...logContext }, `[SyncService] Error during bulk update of existing members.`);
            throw bulkUpdateError; // Re-throw to ensure transaction rollback
          }
        }

        // --- Step 9: Mark members no longer in roster as unavailable (deactivate) ---
        if (memberIdsToDeactivate.length > 0) { // Use renamed variable
          logger.debug({ ...logContext, count: memberIdsToDeactivate.length }, '[SyncService] Marking members no longer in BNet roster as unavailable.'); // Use renamed variable
          const updatesToDeactivate = memberIdsToDeactivate.map((memberId: number) => ({ // Use renamed variable and add type
              memberId: memberId,
              is_available: false,
          }));
          try {
            // Model methods handle transactions implicitly or via context, remove explicit client pass
            await this.guildMemberModel.bulkUpdate(updatesToDeactivate);
            logger.info({ ...logContext, count: memberIdsToDeactivate.length }, `[SyncService] Marked ${memberIdsToDeactivate.length} members as unavailable.`); // Use renamed variable
          } catch (bulkUnavailableError: unknown) {
            logger.error({ err: bulkUnavailableError, ...logContext }, `[SyncService] Error during bulk marking members as unavailable.`);
            throw bulkUnavailableError; // Re-throw to ensure transaction rollback
          }
        }

        logger.info(logContext, `[SyncService] Successfully finished guild_members table sync. Committing transaction.`);
      }); // End transaction
    } catch (error: unknown) {
      // Catch errors from withTransaction (e.g., if any bulk operation failed and re-threw)
      logger.error({ err: error, ...logContext }, `[SyncService] Transaction failed during guild members table sync. Changes rolled back.`);
      // Re-throw or handle as needed for the calling function (syncGuild)
      throw new AppError(`Error syncing guild members table for guild ${guildId}: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }

  /**
   * Synchronizes the `ranks` table for a specific guild.
   * - Ensures ranks present in the roster exist in the local DB, creating them with default names if necessary.
   * - Updates the `member_count` for each rank based on the current roster.
   * - Marks ranks no longer present in the roster as having 0 members.
   * @param {number} guildId - The ID of the guild.
   * @param {BattleNetGuildRoster} rosterData - The fetched guild roster data from Battle.net.
   * @returns {Promise<void>} Resolves when rank sync is complete or rejects on critical error.
   * @private
   */
  /**
   * Synchronizes the `ranks` table for a specific guild.
   * - Ensures ranks present in the roster exist in the local DB, creating them with default names if necessary.
   * - Updates the `member_count` for each rank based on the current roster.
   * - Marks ranks no longer present in the roster as having 0 members.
   * @param guildId The ID of the guild.
   * @param bnetRoster The fetched guild roster data from Battle.net.
   * @returns Resolves when rank sync is complete or rejects on critical error.
   * @private
   */
  private async _syncGuildRanks(guildId: number, bnetRoster: BattleNetGuildRoster): Promise<void> { // Renamed rosterData -> bnetRoster
    const logContext = { guildId };
    logger.info(logContext, `[SyncService] Starting rank sync.`);
    try {
      // 1. Calculate member counts per rank and collect unique rank IDs from the roster.
      const rankCounts: { [key: number]: number } = {};
      const rosterRankIds = new Set<number>();
      bnetRoster.members.forEach(member => { // Use renamed bnetRoster
        const rankId = member.rank;
        rankCounts[rankId] = (rankCounts[rankId] || 0) + 1;
        rosterRankIds.add(rankId);
      });
      logger.debug({ ...logContext, rankIds: Array.from(rosterRankIds), counts: rankCounts }, `[SyncService] Calculated rank counts from BNet roster.`);

      // 2. Fetch existing rank records for this guild from the local DB.
      const existingRanks = await this.rankModel.getGuildRanks(guildId);
      const existingRankMap = new Map(existingRanks.map(r => [r.rank_id, r]));
      logger.debug({ ...logContext, count: existingRankMap.size }, `[SyncService] Fetched ${existingRankMap.size} existing ranks from DB.`);

      // 3. Iterate through ranks found in the roster. Update existing or create new rank records.
      const updatePromises: Promise<void>[] = []; // Collect update/create promises

      for (const rankId of rosterRankIds) {
        const rankRecord = existingRankMap.get(rankId);
        const currentCount = rankCounts[rankId] || 0;
        const rankLogContext = { ...logContext, rankId };

        // Create rank if it doesn't exist using setGuildRank (upsert logic)
        if (!rankRecord) {
          const defaultName = rankId === 0 ? "Guild Master" : `Rank ${rankId}`;
          logger.info(rankLogContext, `[SyncService] Rank ${rankId} not found locally. Ensuring rank exists with default name "${defaultName}" and setting count to ${currentCount}.`);
          // First, ensure the rank exists (upsert name)
          updatePromises.push(
            this.rankModel.setGuildRank(guildId, rankId, defaultName)
              .then(() => {
                // After ensuring rank exists, update its count
                return this.rankModel.updateMemberCount(guildId, rankId, currentCount);
              })
              .catch(err => logger.error({ err, ...rankLogContext }, `[SyncService] Failed to create/update rank ${rankId} or its count.`)) // Log error but don't stop others
          );
        } else {
          // Rank exists, update member count if it differs
          if (rankRecord.member_count !== currentCount) {
            logger.debug(rankLogContext, `[SyncService] Updating member count for rank ${rankId} from ${rankRecord.member_count} to ${currentCount}.`);
            // Only update the count
            updatePromises.push(
              this.rankModel.updateMemberCount(guildId, rankId, currentCount)
                .catch(err => logger.error({ err, ...rankLogContext }, `[SyncService] Failed to update member count for rank ${rankId}.`)) // Log error but don't stop others
            );
          } else {
            logger.trace(rankLogContext, `[SyncService] Rank ${rankId} member count (${currentCount}) is unchanged.`);
          }
          // Remove from map to track ranks no longer in roster
          existingRankMap.delete(rankId);
        }
      }

      // 4. Iterate through ranks that were in the DB but NOT in the latest roster. Set their member count to 0.
      for (const [rankId, rankRecord] of existingRankMap.entries()) {
        // Check if the rank still exists in the map (wasn't deleted in step 3) and count needs update
        if (rankRecord.member_count !== 0) {
          const rankLogContext = { ...logContext, rankId };
          logger.info(rankLogContext, `[SyncService] Rank ${rankId} ("${rankRecord.rank_name}") no longer in BNet roster. Setting member count to 0.`); // Use rank_name
          // Only update the count
          updatePromises.push(
            this.rankModel.updateMemberCount(guildId, rankId, 0)
              .catch(err => logger.error({ err, ...rankLogContext }, `[SyncService] Failed to set member count to 0 for rank ${rankId}.`)) // Log error but don't stop others
          );
        }
      }

      // 5. Wait for all rank updates/creations to complete.
      // Use Promise.allSettled to ensure all attempts complete, even if some fail.
      const results = await Promise.allSettled(updatePromises);
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          // Errors are already logged within the .catch blocks above
          logger.warn({ ...logContext, reason: result.reason }, `[SyncService] A rank update/creation promise failed (already logged).`);
        }
      });

      logger.info(logContext, `[SyncService] Finished rank sync.`);

    } catch (error: unknown) {
      // Catch errors from initial setup (e.g., getGuildRanks)
      logger.error({ err: error, ...logContext }, `[SyncService] Critical error during rank sync setup.`);
      // Do not re-throw, allow overall sync process to continue if possible.
    }
  }

  /**
   * Calculates a SHA256 hash of a character's collected toys based on their IDs.
   * This is primarily used for characters not linked to a user account (`user_id` is null)
   * as a potential way to identify matching characters across different guilds or syncs.
   *
   * Fetches the character's collections index, then fetches the toy data from the provided href.
   * Returns a hash string representing the sorted list of toy IDs, a constant hash (`NO_TOYS_HASH`)
   * if no toys are found or the collection link is missing, or null if an API error occurs during fetching.
   *
   * @param {Pick<DbCharacter, 'id' | 'name' | 'realm' | 'region' | 'user_id'>} character - Essential character details including user_id.
   * @returns {Promise<string | null>} The SHA256 hash of sorted toy IDs, `NO_TOYS_HASH`, or null on error/skip condition.
   * @private
   */
  private async _calculateCharacterToyHash(character: Pick<DbCharacter, 'id' | 'name' | 'realm' | 'region' | 'user_id'>): Promise<string | null> {
    // Skip calculation if character is linked to a user
    if (character.user_id !== null) {
      logger.trace({ charId: character.id, charName: character.name }, `[SyncService][ToyHash] Skipping calculation for linked character.`);
      return null;
    }
    // Skip if essential info is missing
    if (!character.name || !character.realm || !character.region) {
      logger.warn({ charId: character.id, name: character.name, realm: character.realm, region: character.region }, '[SyncService][ToyHash] Cannot calculate: Missing character name, realm, or region.');
      return null;
    }

    const region = character.region as BattleNetRegion;
    const realmSlug = createSlug(character.realm);
    const characterNameLower = character.name.toLowerCase();
    const logContext = { charId: character.id, charName: character.name, realmSlug, region };
    logger.debug(logContext, `[SyncService][ToyHash] Calculating for unlinked character ${character.name}.`);

    try {
      // 1. Fetch the collections index to get the toys href
      logger.trace(logContext, `[SyncService][ToyHash] Fetching collections index.`);
      const collectionsIndex = await this.apiClient.getCharacterCollectionsIndex(realmSlug, characterNameLower, region);

      // If no toys href is available in the index, assume no toys or inaccessible collection
      if (!collectionsIndex?.toys?.href) {
        logger.debug(logContext, `[SyncService][ToyHash] Toys collection href not found in index. Using NO_TOYS_HASH.`);
        return NO_TOYS_HASH;
      }

      // 2. Fetch the actual toy data using the href from the index
      const toysHref = collectionsIndex.toys.href;
      logger.trace({ ...logContext, href: toysHref }, `[SyncService][ToyHash] Fetching toys data from href.`);
      const toyJobId = `char-toys-${region}-${realmSlug}-${characterNameLower}`;
      const toysData = await this.apiClient.getGenericBattleNetData<ToyCollectionData>(toysHref, toyJobId);

      // 3. Process the fetched toy data
      if (toysData?.toys && Array.isArray(toysData.toys) && toysData.toys.length > 0) {
        const toyIds = toysData.toys
          .map((t) => t?.toy?.id)
          .filter((id): id is number => typeof id === 'number')
          .sort((a, b) => a - b);

        if (toyIds.length === 0) {
             logger.debug(logContext, `[SyncService][ToyHash] No valid toy IDs found in fetched data. Using NO_TOYS_HASH.`);
             return NO_TOYS_HASH;
        }

        const toyIdString = toyIds.join(',');
        const calculatedHash = crypto.createHash('sha256').update(toyIdString).digest('hex');
        logger.debug({ ...logContext, toyCount: toyIds.length, hash: calculatedHash }, `[SyncService][ToyHash] Calculated hash.`);
        return calculatedHash;
      } else {
        // Handle case where toy data is fetched but the 'toys' array is empty, missing, or not an array
        logger.debug(logContext, `[SyncService][ToyHash] No toys found or invalid format in fetched data. Using NO_TOYS_HASH.`);
        return NO_TOYS_HASH;
      }
    } catch (error: unknown) {
      // Handle specific errors like 404 (character/collection not found)
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        logger.warn(logContext, `[SyncService][ToyHash] Collections index or toys endpoint returned 404. Assuming no toys/profile issue. Using NO_TOYS_HASH.`);
        return NO_TOYS_HASH; // Treat 404 as "no toys found" for hashing
      } else {
        // Log other unexpected errors
        logger.error({ err: error, ...logContext }, `[SyncService][ToyHash] Error calculating toy hash. Returning null.`);
        return null; // Indicate an error occurred
      }
    }
  }


  /**
   * Prepares the update payload for a character based on fetched enhanced Battle.net API data.
   * Determines character's region based on their guild (if found locally) and calculates toy hash if needed.
   * @param {DbCharacter} character - The original character record from the DB.
   * @param {EnhancedCharacterData} enhancedData - Combined data fetched from Battle.net character endpoints (profile, equipment, etc.).
   * @returns {Promise<{ updatePayload: Partial<DbCharacter>, localGuild: DbGuild | null }>} An object containing the partial DbCharacter update payload and the found local DbGuild record (or null).
   * @private
   */
  /**
   * Prepares the update payload for a character based on fetched enhanced Battle.net API data.
   * Determines character's region based on their guild (if found locally) and calculates toy hash if needed.
   * @param character The original character record from the DB.
   * @param enhancedData Combined data fetched from Battle.net character endpoints (profile, equipment, etc.).
   * @returns An object containing the partial DbCharacter update payload and the found local DbGuild record (or null).
   * @private
   */
  private async _prepareCharacterUpdatePayload(
    character: DbCharacter,
    enhancedData: EnhancedCharacterData
  ): Promise<{ updatePayload: Partial<DbCharacter>, localGuild: DbGuild | null }> {
    const logContext = { charId: character.id, charName: character.name, realm: character.realm, region: character.region };
    logger.debug(logContext, `[SyncService][PayloadPrep] Preparing update payload.`);

    const bnetCharacterId = enhancedData.id;
    const bnetGuildData = enhancedData.guild; // Guild info from character profile summary
    const bnetGuildId = bnetGuildData?.id;
    let localGuild: DbGuild | null = null;
    let determinedRegion = character.region as BattleNetRegion | null; // Start with existing region

    // --- Step 1: Determine Character's Region and Find Local Guild Record ---
    if (bnetGuildId && bnetGuildData) {
      const guildLogContext = { ...logContext, bnetGuildId, bnetGuildName: bnetGuildData.name };
      logger.debug(guildLogContext, `[SyncService][PayloadPrep] Character is in BNet guild ${bnetGuildData.name}. Checking local DB.`);
      try {
        // Find local guild matching the Battle.net Guild ID
        localGuild = await this.guildModel.findOne({ bnet_guild_id: bnetGuildId });
        if (localGuild) {
          // If local guild found, use its region for the character update
          determinedRegion = localGuild.region as BattleNetRegion;
          logger.debug({ ...guildLogContext, localGuildId: localGuild.id, determinedRegion }, `[SyncService][PayloadPrep] Found local guild record. Using region ${determinedRegion}.`);
        } else {
          // Guild exists on BNet profile but not locally. Queue it for sync.
          logger.warn(guildLogContext, `[SyncService][PayloadPrep] Local guild record not found for BNet Guild ID ${bnetGuildId}. Queueing guild sync.`);
          const fullRealmName = enhancedData.realm?.name || character.realm; // Prefer BNet data, fallback to character record
          // Queue sync using the character's current region as the best guess
          await this._queueMissingGuildSync(
            { id: bnetGuildId, name: bnetGuildData.name, realm: { slug: enhancedData.realm.slug, name: fullRealmName } },
            character.region as BattleNetRegion // Pass character's current region
          );
          // Keep the original character region for *this* character's update payload.
          // The separate guild sync will handle updating the guild's region if necessary.
          determinedRegion = character.region as BattleNetRegion | null;
          logger.debug(guildLogContext, `[SyncService][PayloadPrep] Kept original region ${determinedRegion} for character update after queueing missing guild.`);
        }
      } catch (guildError: unknown) {
        logger.error({ err: guildError, ...guildLogContext }, `[SyncService][PayloadPrep] Error fetching local guild. Keeping original character region.`);
        determinedRegion = character.region as BattleNetRegion | null; // Fallback on error
        localGuild = null; // Ensure localGuild is null if lookup failed
      }
    } else {
      localGuild = null; // Character is guildless on Battle.net
      determinedRegion = character.region as BattleNetRegion | null; // Keep the character's existing region
      logger.debug(logContext, `[SyncService][PayloadPrep] Character is guildless according to BNet.`);
    }

    // --- Step 2: Calculate Toy Hash (only if character is not linked to a user) ---
    // Pass the potentially updated region to the hash calculation
    const finalRegionForHash = determinedRegion ?? character.region as BattleNetRegion;
    const calculatedToyHash = await this._calculateCharacterToyHash({ ...character, region: finalRegionForHash });

    // --- Step 3: Construct the Base Update Payload for the Character ---
    const updatePayload: Partial<DbCharacter> = {
      bnet_character_id: bnetCharacterId,
      region: determinedRegion ?? character.region as BattleNetRegion, // Use determined region or fallback
      level: enhancedData.level,
      class: enhancedData.character_class?.name || character.class, // Fallback to existing class
      // Update name and realm slug from BNet data for consistency
      name: enhancedData.name,
      realm: enhancedData.realm.slug, // Store the slug consistently
      // Store structured JSON data fetched earlier
      profile_json: enhancedData, // Store the entire enhanced data object (which includes profile summary)
      equipment_json: enhancedData.equipment,
      mythic_profile_json: enhancedData.mythicKeystone ?? undefined, // Convert null to undefined
      professions_json: enhancedData.professions?.primaries, // Store only primary professions
      // Timestamps and availability
      updated_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
      is_available: true, // Mark as available (will be false if 404 occurred earlier)
      // Optional fields (uncomment if added to DbCharacter type)
      // race: enhancedData.race?.name,
      // gender: enhancedData.gender?.name,
      // faction: enhancedData.faction?.name,
      // active_spec: enhancedData.active_spec?.name,
      // average_item_level: enhancedData.average_item_level,
      // equipped_item_level: enhancedData.equipped_item_level,
    };

    // --- Step 4: Conditionally Add Toy Hash to Payload ---
    if (calculatedToyHash !== null) {
      updatePayload.toy_hash = calculatedToyHash;
      logger.debug({ ...logContext, toyHash: calculatedToyHash }, `[SyncService][PayloadPrep] Added toy hash to update payload.`);
    } else {
      logger.trace(logContext, `[SyncService][PayloadPrep] No toy hash calculated or needed.`);
    }

    logger.debug(logContext, `[SyncService][PayloadPrep] Finished preparing update payload.`);
    return { updatePayload, localGuild };
  }


  /**
   * Queues a sync operation for a guild found on a character profile but not in the local DB.
   * Creates a basic guild record to track it and triggers an immediate sync.
   * **Note:** The immediate sync trigger is a temporary solution and should be replaced
   * with a proper background job queue (e.g., BullMQ, RabbitMQ) in a production environment.
   *
   * @param {object | undefined} guildData - Basic guild data from the character profile ({ id, name, realm: { slug, name } }).
   * @param {BattleNetRegion | null} region - The region of the character/guild.
   * @returns {Promise<void>} Resolves when the check/creation/queueing is done.
   * @private
   */
  /**
   * Queues a sync operation for a guild found on a character profile but not in the local DB.
   * Creates a basic guild record to track it and triggers an immediate sync.
   * **Note:** The immediate sync trigger is a temporary solution and should be replaced
   * with a proper background job queue (e.g., BullMQ, RabbitMQ) in a production environment.
   *
   * @param guildData Basic guild data from the character profile ({ id, name, realm: { slug, name } }).
   * @param region The region of the character/guild.
   * @returns Resolves when the check/creation/queueing is done.
   * @private
   */
  private async _queueMissingGuildSync(
    guildData: { id: number; name: string; realm: { slug: string; name: string } } | undefined,
    region: BattleNetRegion | null
  ): Promise<void> {
    const logPrefix = '[SyncService][QueueGuild]';
    // Validate input data
    if (!guildData?.id || !guildData.name || !guildData.realm?.name || !region) {
      logger.error({ guildData, region }, `${logPrefix} Cannot queue missing guild sync: insufficient data provided.`);
      return;
    }

    const { id: bnetGuildId, name: guildName, realm } = guildData;
    const realmName = realm.name; // Use the full realm name for DB storage consistency
    const logContext = { bnetGuildId, guildName, realmName, region };
    logger.info(logContext, `${logPrefix} Checking if guild needs to be created and queued.`);

    try {
      // 1. Check if guild already exists by BNet ID (most reliable check)
      const existingByBNetId = await this.guildModel.findOne({ bnet_guild_id: bnetGuildId });
      if (existingByBNetId) {
        logger.info(logContext, `${logPrefix} Guild already exists locally (found by BNet ID). Skipping queue.`);
        // Optional: Trigger sync if outdated? Consider adding logic here if needed.
        return;
      }

      // 2. Check if guild exists by name/realm/region (handle cases where BNet ID wasn't stored previously)
      const existingByName = await this.guildModel.findOne({ name: guildName, realm: realmName, region: region });
       if (existingByName) {
         logger.info({ ...logContext, localGuildId: existingByName.id }, `${logPrefix} Guild already exists locally (found by name/realm/region). Updating BNet ID if missing.`);
         // Update the existing record with the BNet ID if it's missing
         if (!existingByName.bnet_guild_id) {
           try {
             await this.guildModel.update(existingByName.id, { bnet_guild_id: bnetGuildId });
             logger.info({ ...logContext, localGuildId: existingByName.id }, `${logPrefix} Added BNet ID ${bnetGuildId} to existing guild.`);
           } catch (updateError) {
             logger.error({ err: updateError, ...logContext, localGuildId: existingByName.id }, `${logPrefix} Failed to update BNet ID for existing guild.`);
           }
         }
         // Optional: Trigger sync if outdated?
         return; // Don't create a duplicate
       }

      // 3. Create a basic guild record to track it, as it doesn't exist locally
      logger.info(logContext, `${logPrefix} Creating new local record for missing guild.`);
      const newGuildPayload: Partial<DbGuild> = {
        name: guildName,
        realm: realmName, // Store full realm name
        region: region,
        bnet_guild_id: bnetGuildId,
        last_updated: null, // Needs sync
        last_roster_sync: null, // Needs sync
        exclude_from_sync: false, // Should be synced
        // leader_id, member_count etc. will be determined during the actual sync
      };
      const createdGuild = await this.guildModel.create(newGuildPayload);
      logger.info({ ...logContext, localGuildId: createdGuild.id }, `${logPrefix} Created local guild record ${createdGuild.id}.`);

      // --- TEMPORARY: Trigger immediate sync ---
      // TODO: Replace this direct call with a proper job queue mechanism.
      // This direct call is NOT suitable for production environments.
      logger.warn({ ...logContext, localGuildId: createdGuild.id }, `${logPrefix} Triggering IMMEDIATE sync for newly added guild (replace with proper queue).`);
      // Intentionally NOT awaiting this in the main flow to avoid blocking character sync.
      // A queue is the correct solution for background processing.
      this.syncGuild(createdGuild).catch(syncError => {
          logger.error({ err: syncError, ...logContext, localGuildId: createdGuild.id }, `${logPrefix} Background sync for newly added guild failed.`);
      });
      // --- End Temporary ---

    } catch (error: unknown) {
      logger.error({ err: error, ...logContext }, `${logPrefix} Error checking/creating/queueing sync for missing guild.`);
      // Don't re-throw, allow the calling process (character sync) to continue if possible.
    }
  }


  /**
   * Syncs detailed data for a single character.
   * Fetches enhanced data from Battle.net, prepares payload, updates character record,
   * and updates the associated guild member record if applicable.
   * Handles 404 errors by marking the character as unavailable.
   * @param {DbCharacter} character - The character database record to sync.
   * @returns {Promise<void>} Resolves when sync is complete or handled (e.g., 404).
   */
  /**
   * Syncs detailed data for a single character.
   * Fetches enhanced data from Battle.net, prepares payload, updates character record,
   * and updates the associated guild member record if applicable.
   * Handles 404 errors by marking the character as unavailable.
   * @param {DbCharacter} character - The character database record to sync.
   * @returns {Promise<void>}
   */
  async syncCharacter(character: DbCharacter): Promise<void> {
    const jobId = `char-sync-${character.region}-${character.realm}-${character.name}`;
    const logContext = { charId: character.id, charName: character.name, realm: character.realm, region: character.region, jobId };
    logger.info(logContext, `[SyncService] Starting sync for character: ${character.name} (${character.realm}-${character.region})`);

    // Skip sync if character is marked as unavailable in the DB
    if (!character.is_available) {
        logger.info(logContext, `[SyncService] Skipping sync for unavailable character ${character.name}.`);
        return;
    }

    try {
      // 1. Fetch Enhanced Character Data from Battle.net
      const realmSlug = createSlug(character.realm); // Use consistent slug function
      const characterNameLower = character.name.toLowerCase();
      const region = character.region as BattleNetRegion; // Assume valid region

      // This method should internally handle potential 404s and return null
      const enhancedDataResult = await this.apiClient.getEnhancedCharacterData(realmSlug, characterNameLower, region);

      // --- Handle 404 (Character Not Found / Null Result) ---
      if (enhancedDataResult === null) {
        logger.warn(logContext, `[SyncService] Character ${character.name} not found on Battle.net (404 or null result). Marking character as unavailable.`);
        try {
          // Mark character as unavailable in DB
          await this.characterModel.update(character.id, {
            is_available: false,
            last_synced_at: new Date().toISOString() // Update sync time even on failure
          });
          logger.info(logContext, `[SyncService] Marked character ${character.name} (ID: ${character.id}) as unavailable due to 404/null result.`);

          // Also mark associated guild memberships as unavailable
          try {
              const membersToMark = await this.guildMemberModel.findAll({ character_id: character.id });
              const memberIdsToMark = membersToMark.map(m => m.id);
              if (memberIdsToMark.length > 0) {
                  const updates = memberIdsToMark.map(id => ({ memberId: id, is_available: false }));
                  await this.guildMemberModel.bulkUpdate(updates); // Use bulkUpdate to set is_available=false
                  logger.info(logContext, `[SyncService] Marked ${memberIdsToMark.length} guild memberships for character ${character.name} (ID: ${character.id}) as unavailable.`);
              } else {
                  logger.info(logContext, `[SyncService] No active guild memberships found for character ${character.name} (ID: ${character.id}) to mark as unavailable.`);
              }
          } catch (memberUpdateError: unknown) {
              logger.error({ err: memberUpdateError, ...logContext }, `[SyncService] Failed to mark guild memberships as unavailable for character ${character.name}.`);
          }

        } catch (updateError: unknown) {
          logger.error({ err: updateError, ...logContext }, `[SyncService] Failed to mark character ${character.name} or memberships as unavailable after 404/null result.`);
        }
        return; // Stop processing this character
      }
      // --- End Handle 404 ---

      // 2. Prepare Update Payload (includes toy hash calculation, region determination)
      const { updatePayload, localGuild } = await this._prepareCharacterUpdatePayload(character, enhancedDataResult);

      // 3. Update Character in DB
      // Ensure is_available is set to true on successful sync
      // The payload from _prepareCharacterUpdatePayload might not explicitly set it, so ensure it here.
      const finalUpdatePayload = { ...updatePayload, is_available: true };
      await this.characterModel.update(character.id, finalUpdatePayload);
      logger.info(logContext, `[SyncService] Successfully synced character ${character.name} (ID: ${character.id}).`);


      // 4. Update associated guild_members record if character is in a known local guild
      if (localGuild) {
          const localGuildId = localGuild.id;
          // Find the specific membership record for this character in this guild
          const currentMembership = await this.guildMemberModel.findOne({
              character_id: character.id,
              guild_id: localGuildId
          });

          if (currentMembership) {
              // Update member record with potentially changed name/class and mark as available
              const memberUpdatePayload: Partial<DbGuildMember> & { is_available: boolean } = { // Ensure is_available is part of the type
                  character_name: finalUpdatePayload.name || character.name, // Use updated name or fallback
                  character_class: finalUpdatePayload.class || character.class, // Use updated class or fallback
                  is_available: true, // Ensure member is marked available if character syncs
                  // Rank is updated by guild sync, not character sync
              };
              await this.guildMemberModel.update(currentMembership.id, memberUpdatePayload);
              logger.debug({ ...logContext, memberId: currentMembership.id, guildId: localGuildId }, `[SyncService] Updated associated guild member record ${currentMembership.id}.`);
          } else {
              // This might happen if character sync runs before guild sync adds the member
              logger.warn({ ...logContext, guildId: localGuildId }, `[SyncService] Could not find guild member record to update for character ${character.name} in guild ${localGuildId}. Guild sync might be pending or character left.`);
          }
      } else {
          // Character is guildless according to BNet. Guild sync handles marking old memberships unavailable.
          logger.debug(logContext, `[SyncService] Character ${character.name} is guildless according to BNet, skipping member record update.`);
      }

    } catch (error: unknown) {
      // Catch unexpected errors during the sync process (excluding the handled 404/null case)
      logger.error({ err: error, ...logContext }, `[SyncService] Unexpected error syncing character ${character.name} (ID: ${character.id}):`);
      // Optionally update character record with error state/timestamp here
      try {
          await this.characterModel.update(character.id, {
              last_synced_at: new Date().toISOString() // Still update sync time on error
          });
      } catch (updateError: unknown) {
          logger.error({ err: updateError, ...logContext }, `[SyncService] Failed to update last_synced_at after error for character ${character.name}.`);
      }
    }
  }


  /**
   * Runs the main synchronization cycle for guilds and characters.
   * 1. Finds and syncs guilds marked as outdated or needing a sync.
   * 2. Finds and syncs characters marked as outdated or needing a sync.
   * Uses an `isSyncing` flag to prevent concurrent executions.
   * Allows for graceful abortion via the `abortSync` method.
   * @returns {Promise<void>} Resolves when the sync cycle completes or is aborted, rejects on critical setup failure.
   */
  /**
   * Runs the main synchronization cycle for guilds and characters.
   * 1. Finds and syncs guilds marked as outdated or needing a sync.
   * 2. Finds and syncs characters marked as outdated or needing a sync.
   * Uses an `isSyncing` flag to prevent concurrent executions.
   * Allows for graceful abortion via the `abortSync` method.
   * @returns Resolves when the sync cycle completes or is aborted, rejects on critical setup failure.
   */
  async runSync(): Promise<void> {
    const logPrefix = '[SyncService][RunSync]';
    if (this.isSyncing) {
      logger.warn(`${logPrefix} Sync process already running. Skipping new run.`);
      return;
    }

    this.isSyncing = true;
    logger.info(`${logPrefix} Starting full sync cycle.`);
    const startTime = Date.now();
    let guildsSynced = 0;
    let charactersSynced = 0;
    let aborted = false; // Track if aborted internally

    try {
      // --- Phase 1: Sync Outdated Guilds ---
      logger.info(`${logPrefix} Starting guild sync phase.`);
      const guildsToSync = await this.guildModel.findOutdatedGuilds();
      logger.info(`${logPrefix} Found ${guildsToSync.length} outdated guilds to sync.`);

      for (const guild of guildsToSync) {
        if (!this.isSyncing) {
             logger.warn(`${logPrefix} Sync aborted during guild phase.`);
             aborted = true;
             break; // Exit the loop
        }
        const guildLogContext = { guildId: guild.id, guildName: guild.name, realm: guild.realm, region: guild.region };
        logger.debug(guildLogContext, `${logPrefix} Syncing guild ${guild.id}.`);
        try {
          await this.syncGuild(guild);
          guildsSynced++;
          logger.debug(guildLogContext, `${logPrefix} Finished syncing guild ${guild.id}.`);
        } catch (guildSyncError) {
            // syncGuild handles its internal errors, but catch any re-thrown critical errors
            logger.error({ err: guildSyncError, ...guildLogContext }, `${logPrefix} Critical error during syncGuild. Continuing with next guild.`);
        }
        // Optional: Add a small delay to avoid hitting API rate limits aggressively
        // await new Promise(resolve => setTimeout(resolve, 200));
      }
      logger.info(`${logPrefix} Finished guild sync phase. Synced ${guildsSynced} of ${guildsToSync.length} guilds.`);

      // --- Phase 2: Sync Outdated Characters ---
      if (!this.isSyncing) { // Check again before starting character phase
          logger.info(`${logPrefix} Sync aborted before character phase.`);
      } else {
          logger.info(`${logPrefix} Starting character sync phase.`);
          const charactersToSync = await this.characterModel.findOutdatedCharacters();
          logger.info(`${logPrefix} Found ${charactersToSync.length} outdated characters to sync.`);

          for (const character of charactersToSync) {
             if (!this.isSyncing) {
                 logger.warn(`${logPrefix} Sync aborted during character phase.`);
                 aborted = true;
                 break; // Exit the loop
             }
             const charLogContext = { charId: character.id, charName: character.name, realm: character.realm, region: character.region };
             logger.debug(charLogContext, `${logPrefix} Syncing character ${character.id}.`);
             try {
                await this.syncCharacter(character);
                charactersSynced++;
                logger.debug(charLogContext, `${logPrefix} Finished syncing character ${character.id}.`);
             } catch (charSyncError) {
                 // syncCharacter handles its internal errors, but catch any re-thrown critical errors
                 logger.error({ err: charSyncError, ...charLogContext }, `${logPrefix} Critical error during syncCharacter. Continuing with next character.`);
             }
             // Optional: Add a small delay
             // await new Promise(resolve => setTimeout(resolve, 50));
          }
          logger.info(`${logPrefix} Finished character sync phase. Synced ${charactersSynced} of ${charactersToSync.length} characters.`);
      }

      // --- Completion Logging ---
      const duration = Date.now() - startTime;
      const durationSeconds = (duration / 1000).toFixed(2);
      if (aborted) {
          logger.warn(`${logPrefix} Sync cycle aborted after ${durationSeconds}s. Guilds synced: ${guildsSynced}, Characters synced: ${charactersSynced}.`);
      } else {
          logger.info(`${logPrefix} Full sync cycle completed successfully in ${durationSeconds}s. Guilds synced: ${guildsSynced}, Characters synced: ${charactersSynced}.`);
      }

    } catch (error: unknown) {
      // Catch critical errors during setup (e.g., finding outdated items)
      const duration = Date.now() - startTime;
      const durationSeconds = (duration / 1000).toFixed(2);
      logger.error({ err: error }, `${logPrefix} Full sync cycle failed due to a critical setup error after ${durationSeconds}s.`);
    } finally {
      // Ensure the lock is always released
      if (this.isSyncing) { // Check if it wasn't already set to false by abortSync
          this.isSyncing = false;
          logger.info(`${logPrefix} Sync lock released.`);
      } else {
          // If aborted is true, abortSync already logged the release
          if (!aborted) {
              logger.info(`${logPrefix} Sync lock already released (likely aborted).`);
          }
      }
    }
  }

  /**
   * Sets the `isSyncing` flag to false, allowing the current sync cycle loops
   * in `runSync` to terminate gracefully after their current iteration.
   * @public
   */
   public abortSync(): void {
       const logPrefix = '[SyncService][Abort]';
       if (this.isSyncing) {
           logger.warn(`${logPrefix} Received request to abort sync process. Sync will stop gracefully after current item.`);
           this.isSyncing = false; // Release the lock and signal loops to stop
           // The finally block in runSync will log the actual lock release message
       } else {
           logger.info(`${logPrefix} Received abort request, but sync is not currently running.`);
       }
   }
}

// --- Dependency Instantiation & Export ---
// This pattern instantiates dependencies and the service itself directly in this file.
// For larger applications, consider using a Dependency Injection (DI) container
// (e.g., TypeDI, InversifyJS) or managing instantiation in a central application setup file
// (like `server.ts` or `app.ts`) for better testability and maintainability.

// Instantiate dependencies (assuming models are singletons exported from their files)
const apiClientInstance = new BattleNetApiClient();

// Instantiate the service with its dependencies
const battleNetSyncServiceInstance = new BattleNetSyncService(
  apiClientInstance,
  guildModelInstance,
  characterModelInstance,
  rankModelInstance,
  userModelInstance,
  guildMemberModelInstance
);

// Export the singleton instance for use elsewhere in the application
export default battleNetSyncServiceInstance;