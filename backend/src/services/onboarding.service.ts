import logger from '../utils/logger';
// Removed unused import of battleNetService
import characterModel from '../models/character.model';
import guildModel from '../models/guild.model';
import userModel from '../models/user.model';
import { BattleNetApiClient } from './battlenet-api.client'; // Assuming we need the client for roster fetching
import { BattleNetRegion, UserRole} from '../../../shared/types/user';
import { BattleNetGuildRoster, DbCharacter,BattleNetCharacter, EnhancedCharacterData } from '../../../shared/types/guild'; // Import necessary types

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
  // Removed extra brace from line 26



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
    let localGuildId: number | undefined | null = undefined; // Use null to clear if guildless
    let determinedRegion = character.region; // Start with character's current region

    if (bnet_guild_id) {
      try {
        // Attempt to find the local guild by BNet ID ONLY.
        // We don't queue or create guilds here during onboarding's enhanced sync.
        const localGuild = await guildModel.findOne({ bnet_guild_id: bnet_guild_id });
        if (localGuild) {
          localGuildId = localGuild.id;
          determinedRegion = localGuild.region;
          logger.debug({ charId: character.id, guildId: localGuild.id }, '[OnboardingService] Linked character to existing local guild during enhanced sync.');
        } else {
          // Guild not found locally. Log it, but don't link (localGuildId remains undefined).
          // The regular sync service will handle creating/queueing this guild later.
          logger.warn({ charId: character.id, bnetGuildId: bnet_guild_id }, '[OnboardingService] Local guild not found for character during enhanced sync. Guild link skipped for now.');
          // Keep character's original region as determinedRegion
        }
      } catch (guildError) {
        logger.error({ err: guildError, charId: character.id, bnetGuildId: bnet_guild_id }, '[OnboardingService] Error fetching local guild during enhanced sync.');
        // Keep character's original region and don't link guild
      }
    } else {
       // Character is guildless according to enhanced data, ensure local link is cleared.
       localGuildId = null;
    }

    // Ensure region is valid before assigning
    const validRegion = determinedRegion && ['us', 'eu', 'kr', 'tw', 'cn'].includes(determinedRegion)
      ? determinedRegion as BattleNetRegion
      : undefined;


    const updatePayload: Partial<DbCharacter> = {
      // Store the full enhanced data structures
      profile_json: enhancedData,
      equipment_json: enhancedData.equipment,
      mythic_profile_json: enhancedData.mythicKeystone === null ? undefined : enhancedData.mythicKeystone,
      // Note: DbCharacter.professions_json expects only primaries array
      professions_json: enhancedData.professions?.primaries,
      // Update core fields
      level: enhancedData.level,
      class: enhancedData.character_class.name,
      last_synced_at: new Date().toISOString(), // Mark as synced now
      bnet_character_id: bnet_character_id,
      guild_id: localGuildId, // Assign found local guild ID or null
      region: validRegion, // Update region if determined
    };

    // Remove undefined properties to avoid overwriting existing DB values with undefined
    Object.keys(updatePayload).forEach(key => {
        if (updatePayload[key as keyof typeof updatePayload] === undefined) {
            delete updatePayload[key as keyof typeof updatePayload];
        }
    });

    return updatePayload;
  }

    // We might inject models too if preferred over direct imports
  // Removed stray brace from line 101

  /**
   * Processes a new or returning user after successful Battle.net authentication.
   * Fetches WoW profile, syncs characters, finds associated guilds,
   * checks for Guild Master status, and updates user role accordingly.
   *
   * @param userId The local database ID of the user.
   * @param accessToken The user's Battle.net access token.
   * @param region The Battle.net region the user authenticated against.
   */
  // Removed extra brace from line 111
  async processNewUser(userId: number, accessToken: string, region: BattleNetRegion): Promise<void> {
    logger.info({ userId, region }, '[OnboardingService] Starting onboarding process...');

    try {
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
        // Fetch the full DbCharacter objects for the processed IDs
        const charactersToEnhance = await characterModel.findByIds(syncResult.processedIds);

        // Process enhancements sequentially to avoid hitting rate limits hard
        for (const character of charactersToEnhance) {
          if (!character.name || !character.realm || !character.region) {
            logger.warn({ userId, charId: character.id }, '[OnboardingService] Skipping enhanced sync for character due to missing name, realm, or region.');
            continue; // Skip to the next character
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
            // Continue with the next character even if one fails
          }
        }
        logger.info({ userId }, '[OnboardingService] Enhanced data sync loop finished.');
      }
      // --- End: Fetch Enhanced Data ---


      // 3. Fetch User's Characters from DB AGAIN (to get potentially updated profile_json and IDs)
      // This is needed because the enhanced sync might have updated guild links etc.
      logger.debug({ userId }, '[OnboardingService] Re-fetching characters from DB after enhanced sync...');
      const dbCharacters: DbCharacter[] = await characterModel.findByUserId(userId); // Explicitly type as DbCharacter[]
      const userCharacterIds = new Set(dbCharacters.map(c => c.bnet_character_id).filter(id => id !== undefined)); // Store BNet IDs for matching
      logger.debug({ userId, count: dbCharacters.length }, '[OnboardingService] Fetched characters from DB.');


      // 4. Extract Unique Guilds from Character Profiles (using potentially updated data)
      const uniqueGuilds = new Map<number, CharacterGuildInfo>();
      for (const char of dbCharacters) {
        // Ensure profile_json and guild exist and have necessary info
        const guildInfo = (char as any).profile_json?.guild as BattleNetCharacter['guild']; // Access guild info stored during sync
        const charBnetId = (char as any).profile_json?.id; // Get character's BNet ID

        if (guildInfo?.id && guildInfo.name && guildInfo.realm?.slug && charBnetId) {
           // Add character's BNet ID to the set for later GM check
           userCharacterIds.add(charBnetId);

           if (!uniqueGuilds.has(guildInfo.id)) {
             // Attempt to determine region (similar logic to _queueMissingGuildSync)
             // Attempt to determine region
             let guildRegion: BattleNetRegion | undefined | null = undefined;
             const realmSlug = guildInfo.realm.slug; // Keep original realmSlug

             // 1. Try inferring from slug suffix
             if (realmSlug) {
                 if (realmSlug.endsWith('-eu')) { guildRegion = 'eu'; }
                 else if (realmSlug.endsWith('-kr')) { guildRegion = 'kr'; }
                 else if (realmSlug.endsWith('-tw')) { guildRegion = 'tw'; }
                 else if (realmSlug.endsWith('-cn')) { guildRegion = 'cn'; }
                 // Removed the incorrect 'us' default for slugs without hyphens
             }

             // 2. If not found via slug, use the character's region from DB if valid
             if (!guildRegion && char.region && ['us', 'eu', 'kr', 'tw', 'cn'].includes(char.region)) {
                  guildRegion = char.region as BattleNetRegion;
             }

             // 3. If still not found, fallback to user's login region ('region' passed to processNewUser)
             if (!guildRegion) {
                 guildRegion = region;
             }

             // Proceed with setting uniqueGuilds only if guildRegion is valid
             if (guildRegion && ['us', 'eu', 'kr', 'tw', 'cn'].includes(guildRegion)) {
                uniqueGuilds.set(guildInfo.id, {
                    bnet_guild_id: guildInfo.id,
                    name: guildInfo.name,
                    realmSlug: realmSlug, // Use the original realmSlug
                    region: guildRegion,
                });
             } else {
                 // Log with more context if region determination fails
                 logger.warn({ userId, charName: char.name, guildName: guildInfo.name, realmSlug, charRegion: char.region, loginRegion: region }, '[OnboardingService] Could not determine a valid region for guild found in character profile.');
             }
           }
        }
      }
      logger.info({ userId, count: uniqueGuilds.size }, '[OnboardingService] Extracted unique guilds from character profiles.');


      // 5. Check for Guild Master Status
      let isGuildMaster = false;
      logger.debug({ userId }, '[OnboardingService] Checking Guild Master status...');
      for (const guildInfo of uniqueGuilds.values()) {
        try {
          // Ensure guild exists locally (minimal record is fine)
          let localGuild = await guildModel.findOne({ bnet_guild_id: guildInfo.bnet_guild_id });
          if (!localGuild) {
            localGuild = await guildModel.findByNameRealmRegion(guildInfo.name, guildInfo.realmSlug, guildInfo.region);
          }
          if (!localGuild) {
            logger.info({ guildName: guildInfo.name, realm: guildInfo.realmSlug }, '[OnboardingService] Creating minimal guild record during onboarding with default region EU.');
            localGuild = await guildModel.create({
              name: guildInfo.name,
              realm: guildInfo.realmSlug,
              region: 'eu', // Default to 'eu' for minimal creation as requested
              bnet_guild_id: guildInfo.bnet_guild_id,
              last_updated: null,
              last_roster_sync: null,
            });
          }

          // Fetch Roster using the API Client (handles rate limiting)
          logger.debug({ userId, guildName: guildInfo.name }, '[OnboardingService] Fetching roster...');
          const roster: BattleNetGuildRoster = await this.battleNetApiClient.getGuildRoster(
            guildInfo.region,
            guildInfo.realmSlug,
            guildInfo.name // Assuming name is slugified correctly by API client or service
          );

          // Check if any of the user's characters are rank 0 in this roster
          for (const member of roster.members) {
            // Check if member's BNet character ID is in the user's set of character BNet IDs
            if (member.character.id && userCharacterIds.has(member.character.id) && member.rank === 0) {
              isGuildMaster = true;
              logger.info({ userId, guildName: guildInfo.name, charName: member.character.name }, '[OnboardingService] User confirmed as Guild Master.');
              break; // Found GM rank, no need to check other members in this guild
            }
          }
        } catch (rosterError: any) {
          // Log error fetching/processing roster but continue checking other guilds
          logger.error({ err: rosterError, userId, guildName: guildInfo.name, bnetGuildId: guildInfo.bnet_guild_id }, '[OnboardingService] Error fetching or processing roster for GM check.');
          // If the error is 404 Not Found for the roster, log it specifically
          const statusCode = rosterError?.status || rosterError?.response?.status;
          if (statusCode === 404) {
             logger.warn({ userId, guildName: guildInfo.name }, '[OnboardingService] Roster not found (404) for guild during GM check.');
          }
        }
        if (isGuildMaster) {
          break; // Found GM rank, no need to check other guilds
        }
      }

      // 6. Update User Role if GM
      if (isGuildMaster) {
        logger.info({ userId }, '[OnboardingService] Updating user role to GUILD_LEADER.');
        await userModel.updateRole(userId, UserRole.GUILD_LEADER);
      } else {
        // Optional: Ensure role is 'user' if they were previously GM but aren't anymore?
        // const currentUser = await userModel.findById(userId);
        // if (currentUser?.role === UserRole.GUILD_LEADER) {
        //    logger.info({ userId }, '[OnboardingService] User is no longer a Guild Master, updating role to USER.');
        //    await userModel.updateRole(userId, UserRole.USER);
        // }
         logger.info({ userId }, '[OnboardingService] User is not a Guild Master of any synced guilds.');
      }

      // 7. Update User Sync Timestamp
      logger.debug({ userId }, '[OnboardingService] Updating user sync timestamp.');
      await userModel.updateCharacterSyncTimestamp(userId);

      logger.info({ userId }, '[OnboardingService] Onboarding process completed successfully.');

    } catch (error) {
      logger.error({ err: error, userId }, '[OnboardingService] Error during onboarding process:');
      // Decide if this error should propagate or just be logged
      // For now, just logging, as character sync might partially succeed
    }
  }
}

// Export an instance (or handle instantiation elsewhere, e.g., dependency injection container)
// We need an instance of BattleNetApiClient first
// const apiClient = new BattleNetApiClient(); // Assuming singleton or appropriate instantiation
// export const onboardingService = new OnboardingService(apiClient);