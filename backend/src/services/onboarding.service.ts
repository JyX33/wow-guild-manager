import logger from '../utils/logger.js';
// Removed unused import of battleNetService
import characterModel from '../models/character.model.js';
import guildModel from '../models/guild.model.js';
import userModel from '../models/user.model.js';
import { BattleNetApiClient } from './battlenet-api.client.js'; // Assuming we need the client for roster fetching
import { BattleNetRegion } from '../../../shared/types/user.js';
import { BattleNetGuildRoster, DbCharacter, BattleNetCharacter, EnhancedCharacterData, DbGuild } from '../../../shared/types/guild.js'; // Import necessary types & DbGuild
import { createSlug } from '../utils/slugify.js'; // Import the slugify function

// Define a type for the unique guild info extracted from character profiles
type CharacterGuildInfo = {
  bnet_guild_id: number;
  name: string;
  realmSlug: string;
  region: BattleNetRegion; // Ensure region is determined
};

export class OnboardingService {
  private battleNetApiClient: BattleNetApiClient;

  // Inject dependencies
  constructor(apiClient: BattleNetApiClient) {
    this.battleNetApiClient = apiClient;
  }

  /**
   * Prepares the update payload for a character based on fetched ENHANCED API data during onboarding.
   * This focuses on mapping the enhanced data to the DB schema.
   * @param character The original character record from the DB (DbCharacter).
   * @param enhancedData The data fetched from the Battle.net enhanced character endpoints.
   * @returns A promise that resolves to the partial DbCharacter update payload.
   * @private
   */
  private async _prepareOnboardingCharacterUpdatePayload(
    character: DbCharacter,
    enhancedData: EnhancedCharacterData // Ensure EnhancedCharacterData is imported
  ): Promise<Partial<DbCharacter>> {
    const bnet_character_id = enhancedData.id;
    const bnet_guild_id = enhancedData.guild?.id;
    let determinedRegion = character.region; // Start with character's current region

    if (bnet_guild_id) {
      try {
        const localGuild = await guildModel.findOne({ bnet_guild_id: bnet_guild_id });
        if (localGuild) {
          determinedRegion = localGuild.region;
          logger.debug({ charId: character.id, guildId: localGuild.id }, '[OnboardingService] Linked character to existing local guild during enhanced sync.');
        } else {
          logger.warn({ charId: character.id, bnetGuildId: bnet_guild_id }, '[OnboardingService] Local guild not found for character during enhanced sync. Guild link skipped for now.');
        }
      } catch (guildError) {
        logger.error({ err: guildError, charId: character.id, bnetGuildId: bnet_guild_id }, '[OnboardingService] Error fetching local guild during enhanced sync.');
      }
    }

    // Ensure region is valid before assigning
    const validRegion = determinedRegion && ['us', 'eu', 'kr', 'tw', 'cn'].includes(determinedRegion)
      ? determinedRegion as BattleNetRegion
      : undefined;

    const updatePayload: Partial<DbCharacter> = {
      profile_json: enhancedData,
      equipment_json: enhancedData.equipment,
      mythic_profile_json: enhancedData.mythicKeystone === null ? undefined : enhancedData.mythicKeystone,
      professions_json: enhancedData.professions?.primaries,
      level: enhancedData.level,
      class: enhancedData.character_class.name,
      last_synced_at: new Date().toISOString(),
      bnet_character_id: bnet_character_id,
      region: validRegion,
    };

    Object.keys(updatePayload).forEach(key => {
        if (updatePayload[key as keyof typeof updatePayload] === undefined) {
            delete updatePayload[key as keyof typeof updatePayload];
        }
    });

    return updatePayload;
  }


  /**
   * Processes a new or returning user after successful Battle.net authentication.
   * Fetches WoW profile, syncs characters, finds associated guilds,
   * identifies Guild Masters, and updates guild leader IDs (linking to users.id) accordingly.
   *
   * @param userId The local database ID of the user.
   * @param accessToken The user's Battle.net access token.
   * @param region The Battle.net region the user authenticated against.
   */
  async processNewUser(userId: number, accessToken: string, region: BattleNetRegion): Promise<void> {
    logger.info({ userId, region }, '[OnboardingService] Starting onboarding process...');

    try { // Main try block for the whole process
      // 1. Fetch WoW Profile
      logger.debug({ userId }, '[OnboardingService] Fetching WoW profile...');
      const wowProfile = await this.battleNetApiClient.getWowProfile(region, accessToken);
      const wowAccounts = wowProfile.wow_accounts || [];
      logger.debug({ userId, accountCount: wowAccounts.length }, '[OnboardingService] WoW profile fetched.');

      // 2. Sync Characters (Creates/Updates character records in DB)
      logger.debug({ userId }, '[OnboardingService] Syncing characters from profile...');
      const syncResult = await characterModel.syncCharactersFromBattleNet(userId, wowAccounts);
      logger.debug({ userId, ...syncResult }, '[OnboardingService] Initial character sync from profile completed.');

      // --- Start: Fetch Enhanced Data for Synced Characters ---
      if (syncResult.processedIds && syncResult.processedIds.length > 0) {
        logger.info({ userId, count: syncResult.processedIds.length }, '[OnboardingService] Starting enhanced data sync for processed characters...');
        const charactersToEnhance = await characterModel.findByIds(syncResult.processedIds);

        for (const character of charactersToEnhance) {
          if (!character.name || !character.realm || !character.region) {
            logger.warn({ userId, charId: character.id }, '[OnboardingService] Skipping enhanced sync for character due to missing name, realm, or region.');
            continue;
          }
          try {
            logger.debug({ userId, charId: character.id, charName: character.name }, '[OnboardingService] Fetching enhanced data...');
            const enhancedData = await this.battleNetApiClient.getEnhancedCharacterData(
              character.realm,
              character.name.toLowerCase(),
              character.region as BattleNetRegion
            );

            if (enhancedData) {
              logger.debug({ userId, charId: character.id, charName: character.name }, '[OnboardingService] Preparing update payload...');
              const updatePayload = await this._prepareOnboardingCharacterUpdatePayload(character, enhancedData);
              logger.debug({ userId, charId: character.id, charName: character.name }, '[OnboardingService] Updating character with enhanced data...');
              await characterModel.update(character.id, updatePayload);
              logger.info({ userId, charId: character.id, charName: character.name }, '[OnboardingService] Enhanced data sync successful.');
            } else {
              logger.info({ userId, charId: character.id, charName: character.name }, '[OnboardingService] No enhanced data found (e.g., 404), skipping update.');
            }
          } catch (enhancementError) {
            logger.error({ err: enhancementError, userId, charId: character.id, charName: character.name }, '[OnboardingService] Error during enhanced data sync for character.');
          }
        } // End loop through charactersToEnhance
        logger.info({ userId }, '[OnboardingService] Enhanced data sync loop finished.');
      }
      // --- End: Fetch Enhanced Data ---


      // 3. Fetch User's Characters from DB AGAIN (to get potentially updated profile_json and IDs)
      logger.debug({ userId }, '[OnboardingService] Re-fetching characters from DB after enhanced sync...');
      const dbCharacters: DbCharacter[] = await characterModel.findByUserId(userId);
      logger.debug({ userId, count: dbCharacters.length }, '[OnboardingService] Fetched characters from DB.');


      // 4. Extract Unique Guilds from Character Profiles (using potentially updated data)
      const uniqueGuilds = new Map<number, CharacterGuildInfo>();
      for (const char of dbCharacters) {
        const guildInfoFromProfile = (char as any).profile_json?.guild as BattleNetCharacter['guild'];
        const charBnetId = (char as any).profile_json?.id;

        if (guildInfoFromProfile?.id && guildInfoFromProfile.name && guildInfoFromProfile.realm?.slug && charBnetId) {
           if (!uniqueGuilds.has(guildInfoFromProfile.id)) {
             let guildRegion: BattleNetRegion | undefined | null = undefined;
             const realmSlug = guildInfoFromProfile.realm.slug;
             const guildHref = guildInfoFromProfile.key.href;

             if (guildHref) {
                // Extract region from the guild href URL
                if (guildHref.startsWith('https://eu.')) { guildRegion = 'eu'; }
                else if (guildHref.startsWith('https://us.')) { guildRegion = 'us'; }
                else if (guildHref.startsWith('https://kr.')) { guildRegion = 'kr'; }
                else if (guildHref.startsWith('https://tw.')) { guildRegion = 'tw'; }
             }
             if (!guildRegion && char.region && ['us', 'eu', 'kr', 'tw', 'cn'].includes(char.region)) {
                  guildRegion = char.region as BattleNetRegion;
             }
             if (!guildRegion) {
                 guildRegion = region; // Fallback to user's login region
             }

             if (guildRegion && ['us', 'eu', 'kr', 'tw', 'cn'].includes(guildRegion)) {
                uniqueGuilds.set(guildInfoFromProfile.id, {
                    bnet_guild_id: guildInfoFromProfile.id,
                    name: guildInfoFromProfile.name,
                    realmSlug: realmSlug,
                    region: guildRegion,
                });
             } else {
                 logger.warn({ userId, charName: char.name, guildName: guildInfoFromProfile.name, realmSlug, charRegion: char.region, loginRegion: region }, '[OnboardingService] Could not determine a valid region for guild found in character profile.');
             }
           }
        }
      } // End loop through dbCharacters
      logger.info({ userId, count: uniqueGuilds.size }, '[OnboardingService] Extracted unique guilds from character profiles.');


      // 5. Find and Set Guild Leader ID (User ID) for each Guild
      logger.debug({ userId }, '[OnboardingService] Starting guild leader identification process...');
      for (const guildInfo of uniqueGuilds.values()) {
        let localGuild: DbGuild | null = null;
        try { // Try block for processing a single guild
          // Ensure guild exists locally
          localGuild = await guildModel.findOne({ bnet_guild_id: guildInfo.bnet_guild_id });
          if (!localGuild) {
            localGuild = await guildModel.findByNameRealmRegion(guildInfo.name, guildInfo.realmSlug, guildInfo.region);
          }
          if (!localGuild) {
            logger.info({ guildName: guildInfo.name, realm: guildInfo.realmSlug }, '[OnboardingService] Creating minimal guild record during onboarding.');
            localGuild = await guildModel.create({
              name: guildInfo.name,
              realm: guildInfo.realmSlug,
              region: guildInfo.region,
              bnet_guild_id: guildInfo.bnet_guild_id,
              last_updated: null,
              last_roster_sync: null,
            });
          }

          // Fetch Roster using the API Client
          logger.debug({ userId, guildName: guildInfo.name }, '[OnboardingService] Fetching roster...');
          const roster: BattleNetGuildRoster = await this.battleNetApiClient.getGuildRoster(
            guildInfo.region,
            guildInfo.realmSlug,
            createSlug(guildInfo.name)
          );

          // Find the Guild Master (rank 0) in the roster
          let gmBnetId: number | undefined = undefined;
          let gmCharacterName: string | undefined = undefined;
          for (const member of roster.members) {
            if (member.rank === 0) {
              gmBnetId = member.character.id;
              gmCharacterName = member.character.name;
              logger.debug({ userId, guildName: guildInfo.name, gmCharName: gmCharacterName, gmBnetId }, '[OnboardingService] Found potential GM in roster.');
              break;
            }
          }

          // If a GM was found, try to find their local character record to get the user_id
          if (gmBnetId && localGuild) {
            try { // Try block for looking up local GM by bnet_id
              const localGmCharacter = await characterModel.findOne({ bnet_character_id: gmBnetId });

              if (localGmCharacter && localGmCharacter.user_id) {
                // GM character found locally, and has a user_id. Update guild leader_id with USER ID.
                logger.debug({ userId, guildId: localGuild.id, leaderUserId: localGmCharacter.user_id }, '[OnboardingService] Found local GM character. Updating guild leader_id with user ID...');
                await guildModel.update(localGuild.id, {
                  leader_id: localGmCharacter.user_id, // Use the USER's ID
                  last_roster_sync: new Date().toISOString(),
                });
                logger.info({ userId, guildName: guildInfo.name, guildId: localGuild.id, leaderUserId: localGmCharacter.user_id }, '[OnboardingService] Successfully updated guild leader ID (user ID).');

              } else if (localGmCharacter) {
                 // GM character found, but user_id is missing (should not happen ideally)
                 logger.error({ userId, guildId: localGuild.id, gmLocalId: localGmCharacter.id, gmBnetId }, '[OnboardingService] Found local GM character but user_id is missing. Cannot set leader_id.');
                 // Update only sync time
                 try { await guildModel.update(localGuild.id, { last_roster_sync: new Date().toISOString() }); } catch (e) { /* ignore */ }
              } else {
                // GM found in roster, but no matching local character record found by bnet_id yet
                logger.warn({ userId, guildName: guildInfo.name, gmBnetId, gmCharacterName }, '[OnboardingService] GM found in roster, but no corresponding local character record found by bnet_id. Leader ID not set.');
                // Update only sync time
                try { await guildModel.update(localGuild.id, { last_roster_sync: new Date().toISOString() }); } catch (e) { /* ignore */ }
              }
            } catch (lookupError) { // Catch for lookup try block
              logger.error({ err: lookupError, userId, guildName: guildInfo.name, gmBnetId }, '[OnboardingService] Database error looking up local GM by bnet_id.');
              // Attempt to update only last_roster_sync even if lookup failed
              if (localGuild) {
                try { await guildModel.update(localGuild.id, { last_roster_sync: new Date().toISOString() }); } catch (e) { /* ignore */ }
              }
            } // End lookup try/catch
          } else if (localGuild) { // Case where no GM (rank 0) was found in roster OR gmBnetId was null/undefined
             logger.info({ userId, guildName: guildInfo.name, guildId: localGuild.id }, '[OnboardingService] No rank 0 member found in roster or GM BNet ID missing. Updating sync time only.');
             try { await guildModel.update(localGuild.id, { last_roster_sync: new Date().toISOString() }); } catch (e) { /* ignore */ }
          } else {
              // Case where localGuild itself doesn't exist (should be rare)
              logger.warn({ userId, guildName: guildInfo.name, bnetGuildId: guildInfo.bnet_guild_id }, '[OnboardingService] Cannot update sync time as local guild record does not exist.');
          } // End if/else if/else chain for GM processing

        } catch (rosterError: any) { // Catch for the main guild processing try block
          logger.error({ err: rosterError, userId, guildName: guildInfo.name, bnetGuildId: guildInfo.bnet_guild_id }, '[OnboardingService] Error fetching or processing roster for guild leader identification.');
          const statusCode = rosterError?.status || rosterError?.response?.status;
          if (statusCode === 404) {
             logger.warn({ userId, guildName: guildInfo.name }, '[OnboardingService] Roster not found (404) for guild during leader identification.');
          }
        } // End main guild processing try/catch
      } // End loop through uniqueGuilds

      // 6. Update User Sync Timestamp
      logger.debug({ userId }, '[OnboardingService] Updating user sync timestamp.');
      await userModel.updateCharacterSyncTimestamp(userId);

      logger.info({ userId }, '[OnboardingService] Onboarding process completed successfully.');

    } catch (error: any) { // Catch for the main processNewUser try block
      logger.error({ err: error, userId }, '[OnboardingService] Error during onboarding process:');
    } // End main processNewUser try/catch
  } // End processNewUser method
} // End OnboardingService class

// Export an instance (or handle instantiation elsewhere, e.g., dependency injection container)
// We need an instance of BattleNetApiClient first
// const apiClient = new BattleNetApiClient(); // Assuming singleton or appropriate instantiation
// export const onboardingService = new OnboardingService(apiClient);