import { Request, Response } from 'express';
import {
  BattleNetCharacter, // Added
  BattleNetCharacterEquipment,
  BattleNetGuildRoster, // Added
  BattleNetMythicKeystoneProfile, // Added
  BattleNetProfessions, // Added
  CharacterRole, // Added for mapping
  DbCharacter, // Added
  DbGuildMember, // Added for DB fetch
  EnhancedGuildMember, // Keep for parsing roster_json
  Guild, // Import the application-level Guild type
  GuildMember, // Added for mapping
} from '../../../shared/types/guild.js';
import * as characterModel from '../models/character.model.js'; // Added
import * as guildModel from '../models/guild.model.js';
import * as guildMemberModel from '../models/guild_member.model.js'; // Added
import * as rankModel from '../models/rank.model.js';
import * as userModel from '../models/user.model.js';
import { AppError, asyncHandler, ERROR_CODES } from '../utils/error-handler.js';
import logger from '../utils/logger.js'; // Import the logger
import { CharacterClassificationService, ClassifiedMember } from '../services/character-classification.service.js'; // Added for classified roster
// Import the modules themselves, not just the default instance
import * as characterModelModule from '../models/character.model.js';
import * as guildMemberModelModule from '../models/guild_member.model.js';

// Instantiate the service (or use DI)
const characterClassificationService = new CharacterClassificationService(characterModelModule, guildMemberModelModule);


/**
 * Determines the character role based on the active specialization name.
 * @param specName The name of the active specialization (e.g., "Protection", "Holy").
 * @returns The determined CharacterRole ('Tank', 'Healer', 'DPS'). Defaults to 'DPS'.
 */
const determineRoleFromSpec = (specName: string | undefined): CharacterRole => {
  if (!specName) {
    return 'DPS'; // Default if spec name is missing
  }
  const lowerSpecName = specName.toLowerCase();

  // Tank Specs
  if (lowerSpecName.includes('protection') || lowerSpecName.includes('guardian') || lowerSpecName.includes('blood') || lowerSpecName.includes('brewmaster') || lowerSpecName.includes('vengeance')) {
    return 'Tank';
  }
  // Healer Specs
  if (lowerSpecName.includes('holy') || lowerSpecName.includes('discipline') || lowerSpecName.includes('restoration') || lowerSpecName.includes('preservation') || lowerSpecName.includes('mistweaver')) {
    return 'Healer';
  }
  // Default to DPS
  return 'DPS';
};


export default {
  // --- REFACTORED getGuildByName ---
  getGuildByName: asyncHandler(async (req: Request, res: Response) => {
    logger.info({ method: req.method, path: req.path, params: req.params, query: req.query, userId: req.session?.userId }, 'Handling getGuildByName request');
    const { region, realm, name } = req.params;
    const guild = await guildModel.findByNameRealmRegion(name, realm, region);
    if (!guild) {
       throw new AppError('Guild not found in local database', 404, {
        code: ERROR_CODES.NOT_FOUND,
        request: req
      });
    }
    res.json({
      success: true,
      data: guild
    });
  }),
  // --- END REFACTORED getGuildByName ---

  getGuildById: asyncHandler(async (req: Request, res: Response) => {
    logger.info({ method: req.method, path: req.path, params: req.params, query: req.query, userId: req.session?.userId }, 'Handling getGuildById request');
    const { guildId } = req.params;
    const guildIdInt = parseInt(guildId);

    if (isNaN(guildIdInt)) {
      throw new AppError('Invalid guild ID', 400, {
        code: ERROR_CODES.VALIDATION_ERROR,
        request: req
      });
    }

    const guild = await guildModel.findById(guildIdInt);

    if (!guild) {
      throw new AppError('Guild not found', 404, {
        code: ERROR_CODES.NOT_FOUND,
        request: req
      });
    }

    // TODO: Ensure the returned guild object structure matches frontend expectations,
    // potentially parsing from guild_data_json if needed here or in the model.
    res.json({
      success: true,
      data: guild
    });
  }),

  // --- REFACTORED getGuildMembers ---
  getGuildMembers: asyncHandler(async (req: Request, res: Response) => {
    logger.info({ method: req.method, path: req.path, params: req.params, query: req.query, userId: req.session?.userId }, 'Handling getGuildMembers request');
    const { guildId } = req.params;
    const guildIdInt = parseInt(guildId);

    if (isNaN(guildIdInt)) {
      throw new AppError('Invalid guild ID', 400, {
        code: ERROR_CODES.VALIDATION_ERROR,
        request: req
      });
    }

    // 1. Fetch Guild Members from DB
    const dbGuildMembers: DbGuildMember[] = await guildMemberModel.findByGuildAndRanks(guildIdInt);
    logger.debug({ guildId: guildIdInt, count: dbGuildMembers.length }, `Found ${dbGuildMembers.length} members in DB for guild ${guildIdInt}`);

    // 2. Handle Empty Roster
    if (dbGuildMembers.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // 3. Extract Character IDs
    const characterIds = dbGuildMembers.map(member => member.character_id);

    // 4. Fetch Character Details
    const dbCharacters = await characterModel.findByIds(characterIds);
    logger.debug({ guildId: guildIdInt, count: dbCharacters.length }, `Fetched ${dbCharacters.length} character details from DB`);

    // 5. Create Character Map
    const characterMap = new Map<number, DbCharacter>();
    dbCharacters.forEach(char => characterMap.set(char.id, char));

    // 7. Map Members to Response
    const guildMembers: GuildMember[] = dbGuildMembers.map(dbMember => {
      const character = characterMap.get(dbMember.character_id);
      const memberName = dbMember.character_name || 'Unknown'; // Use name from guild_members table

      let characterClass = 'Unknown';
      let role: CharacterRole = 'DPS'; // Default role
      let userId: number | undefined = undefined;

      if (character) {
        characterClass = character.class || 'Unknown';
        userId = character.user_id ?? undefined; // Assign user_id if available

        try {
          // Attempt to parse profile_json and determine role from spec
          const profileData = character.profile_json as BattleNetCharacter | null; // No need for (character as any)
          const specName = profileData?.active_spec?.name;
          role = determineRoleFromSpec(specName); // Use helper function
        } catch (parseError) {
          // Log error if JSON parsing fails, but continue with default role
          logger.warn({ err: parseError, charName: character.name, charId: character.id, guildId: guildIdInt }, `Could not parse profile_json for character ${character.name}`);
        }
      } else {
        // Fallback if character data is missing in DB (less likely now but good practice)
        characterClass = dbMember.character_class || 'Unknown';
        logger.warn({ guildMemberId: dbMember.id, characterId: dbMember.character_id, guildId: guildIdInt }, `Character data not found in DB for guild member ID ${dbMember.id}, character ID ${dbMember.character_id}. Using default role.`);
      }

      // Construct the GuildMember object for the API response
      return {
        id: dbMember.id, // Use the guild_members table PK
        guild_id: guildIdInt,
        character_id: dbMember.character_id,
        character_name: memberName,
        character_class: characterClass,
        character_role: role, // Use determined or default role
        rank: dbMember.rank,
        isMain: dbMember.is_main ?? false, // Use is_main from guild_members
        user_id: userId, // Include user_id if found
        // battletag: ??? // Still not available without joining users table
      };
    });

    // 8. Return Result
    res.json({
      success: true,
      data: guildMembers
    });
  }),
  // --- END REFACTORED getGuildMembers ---


  // --- REFACTORED getUserGuilds ---
  // @ts-ignore // TODO: Investigate TS7030 with asyncHandler
  getUserGuilds: asyncHandler(async (req: Request, res: Response) => {
    logger.info({ method: req.method, path: req.path, params: req.params, query: req.query, userId: req.user?.id }, 'Handling getUserGuilds request'); // Use req.user?.id for logging
    if (!req.user) throw new AppError('Authentication required', 401);
    const userId = req.user.id; // Get user ID from authenticated request

    // 1. Get user's characters from the database
    const userCharacters = await userModel.getUserCharacters(userId);
    logger.debug({ userId, characterCount: userCharacters.length }, `Found ${userCharacters.length} characters for user ${userId}`);

    if (userCharacters.length === 0) {
      logger.debug({ userId }, `User ${userId} has no characters.`);
      return res.json({ success: true, data: [] });
    }

    // 2. Extract character IDs
    const characterIds = userCharacters.map(char => char.id);

    // 3. Find guild memberships for these characters
    const guildMemberships = await guildMemberModel.findByCharacterIds(characterIds); // Assumes this function exists
    logger.debug({ userId, membershipCount: guildMemberships.length }, `Found ${guildMemberships.length} guild memberships for user's characters.`);

    // 4. Extract unique guild IDs from memberships
    const guildIds = [
      ...new Set(
        guildMemberships
          .map(member => member.guild_id)
          .filter((id): id is number => id !== null && id !== undefined) // Filter out null/undefined IDs
      )
    ];

    if (guildIds.length === 0) {
      // User's characters are not members of any guilds known to the system via guild_members
      logger.debug({ userId }, `User ${userId}'s characters have no associated guilds in guild_members.`);
      return res.json({ success: true, data: [] });
    }

    // 5. Fetch the corresponding guild records from the database
    const dbGuilds = await guildModel.findByIds(guildIds);

    // 6. Map DB guilds to the response format, checking leadership
    const responseGuilds: Guild[] = dbGuilds.map(dbGuild => {
      const isGuildMaster = dbGuild.leader_id === userId;
      const guildData = (dbGuild as any).guild_data_json || {};

      return {
        id: dbGuild.id,
        name: dbGuild.name,
        realm: dbGuild.realm,
        region: dbGuild.region,
        last_updated: dbGuild.last_updated,
        leader_id: dbGuild.leader_id,
        guild_data_json: guildData,
        is_guild_master: isGuildMaster,
      };
    });

    logger.debug({ userId, guildCount: responseGuilds.length }, `Returning ${responseGuilds.length} unique guilds for user ${userId}`);
    res.json({
      success: true,
      data: responseGuilds
    });
  }),
  // --- END REFACTORED getUserGuilds ---


  // --- REFACTORED getEnhancedGuildMembers ---
  // @ts-ignore // TODO: Investigate TS7030 with asyncHandler
  getEnhancedGuildMembers: asyncHandler(async (req: Request, res: Response) => {
    logger.info({ method: req.method, path: req.path, params: req.params, query: req.query, userId: req.session?.userId }, 'Handling getEnhancedGuildMembers request');
    const { guildId } = req.params;
    const guildIdInt = parseInt(guildId);

     if (isNaN(guildIdInt)) {
      throw new AppError('Invalid guild ID', 400, { code: ERROR_CODES.VALIDATION_ERROR, request: req });
    }

    // 1. Fetch relevant guild members from DB
    const allowedRanks = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]; // Define ranks to fetch
    const dbGuildMembers = await guildMemberModel.findByGuildAndRanks(guildIdInt, allowedRanks);
    logger.debug({ guildId: guildIdInt, count: dbGuildMembers.length }, `Found ${dbGuildMembers.length} members with allowed ranks in DB`);

    if (dbGuildMembers.length === 0) {
      return res.json({ success: true, data: [], stats: { total: 0, successful: 0, failed: 0, errors: [] } });
    }

    // 2. Extract character IDs
    const characterIds = dbGuildMembers.map(member => member.character_id);

    // 3. Fetch corresponding character details from DB
    const dbCharacters = await characterModel.findByIds(characterIds);
    logger.debug({ guildId: guildIdInt, count: dbCharacters.length }, `Fetched ${dbCharacters.length} character details from DB`);

    // 4. Create a map for easy lookup
    const characterMap = new Map<number, DbCharacter>();
    dbCharacters.forEach(char => characterMap.set(char.id, char));

    // 5. Iterate, parse JSONB, and construct response
    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ name: string; error: string }> = [];

    // Use map and filter to handle potential nulls from error cases
    const mappedMembers = dbGuildMembers.map(member => {
      const character = characterMap.get(member.character_id);
      const memberName = member.character_name; // Use name from guild_members table

      if (!character) {
        logger.warn({ guildMemberId: member.id, characterId: member.character_id, guildId: guildIdInt }, `Character data not found in DB for guild member ID ${member.id}, character ID ${member.character_id}`);
        errorCount++;
        errors.push({ name: memberName || `Unknown (ID: ${member.character_id})`, error: 'Character data missing in DB' });
        return null; // Return null for filtering later
      }

      try {
        // Parse JSONB fields (handle potential nulls)
        const profileData = (character as any).profile_json as BattleNetCharacter | null;
        const equipmentData = (character as any).equipment_json as BattleNetCharacterEquipment | null;
        const mythicData = (character as any).mythic_profile_json as BattleNetMythicKeystoneProfile | null;
        const professionsData = (character as any).professions_json as BattleNetProfessions | null;

        // Determine role (example logic, adjust as needed)
        const specName = profileData?.active_spec?.name;
        const role: CharacterRole = specName?.includes('Protection') || specName?.includes('Guardian') || specName?.includes('Blood') || specName?.includes('Brewmaster') || specName?.includes('Vengeance') ? 'Tank'
                                   : specName?.includes('Holy') || specName?.includes('Discipline') || specName?.includes('Restoration') || specName?.includes('Preservation') || specName?.includes('Mistweaver') ? 'Healer'
                                   : 'DPS';

        successCount++;

        // Construct the EnhancedGuildMember object
        const enhancedMember: EnhancedGuildMember = {
          id: member.id,
          guild_id: member.guild_id,
          character_name: member.character_name || 'Unknown', // Use DB value
          character_class: character.class || 'Unknown', // Use value from synced character record
          character_role: role,
          rank: member.rank,
          character: { // Construct this from DB character record + parsed JSONB
            id: character.id,
            // Provide a default value (e.g., 0 or -1) if user_id is null, or adjust Character type if null is allowed
            user_id: character.user_id ?? 0, // Using 0 as default for missing user_id
            name: character.name,
            realm: character.realm,
            class: character.class,
            level: character.level,
            role: role, // Use determined role
            // is_main should come from the DbGuildMember record (`member`), not DbCharacter
            is_main: member.is_main ?? false, // Default to false if null/undefined
            // Parse specific fields from JSONB data
            achievement_points: profileData?.achievement_points || 0,
            equipped_item_level: profileData?.equipped_item_level || 0,
            average_item_level: profileData?.average_item_level || 0,
            last_login_timestamp: profileData?.last_login_timestamp || 0,
            itemLevel: profileData?.equipped_item_level || 0, // Redundant? Keep for compatibility?
            mythicKeystone: mythicData || null, // Assign parsed mythic data
            activeSpec: profileData?.active_spec || null, // Assign parsed spec data
            professions: professionsData?.primaries || [], // Assign parsed professions
            // Include other relevant fields from DbCharacter if needed
            character_data: profileData || undefined, // Optional: include parsed profile for flexibility?
            equipment: equipmentData || undefined, // Optional: include parsed equipment
          }
        };
        return enhancedMember;

      } catch (parseError) {
        errorCount++;
        const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
        logger.warn({ err: parseError, charName: character.name, charId: character.id, guildId: guildIdInt }, `Could not parse JSONB data for character ${character.name}: ${errorMessage}`);
        errors.push({ name: character.name, error: `JSONB parse error: ${errorMessage}` });
        return null; // Return null for filtering later
      }
    });

    // Filter out null entries caused by errors
    const enhancedMembers = mappedMembers.filter((m): m is EnhancedGuildMember => m !== null);

    const completionStats = {
      total: dbGuildMembers.length,
      successful: successCount,
      failed: errorCount,
      errors: errors
    };

    logger.debug({ guildId: guildIdInt, stats: completionStats }, 'Enhancement complete');

    res.json({
      success: true,
      data: enhancedMembers,
      stats: completionStats
    });
  }),
  // --- END REFACTORED getEnhancedGuildMembers ---


  // --- REFACTORED getGuildRanks ---
  getGuildRanks: asyncHandler(async (req: Request, res: Response) => {
    logger.info({ method: req.method, path: req.path, params: req.params, query: req.query, userId: req.session?.userId }, 'Handling getGuildRanks request');
    const { guildId } = req.params;
    const guildIdInt = parseInt(guildId);

     if (isNaN(guildIdInt)) {
      throw new AppError('Invalid guild ID', 400, { code: ERROR_CODES.VALIDATION_ERROR, request: req });
    }

    const guild = await guildModel.findById(guildIdInt);

    if (!guild) {
      throw new AppError('Guild not found', 404, {
        code: ERROR_CODES.NOT_FOUND,
        request: req
      });
    }

    const customRanks = await rankModel.getGuildRanks(guildIdInt);

    // --- BATTLE.NET LOGIC REMOVED ---

    const rankMap = new Map();

    // Get unique ranks from DB roster_json
    const rosterData = (guild as any).roster_json as BattleNetGuildRoster | null; // Assuming roster_json column exists
    const uniqueRanks = new Set(rosterData?.members?.map(member => member.rank) || []); // Get ranks from JSONB

    // TODO: Potentially fetch default rank names from guild_data_json if stored there
    // const guildData = (guild as any).guild_data_json as BattleNetGuild | null;
    // const defaultRankNames = guildData?.ranks?.reduce(...) // If ranks are in guild data

    uniqueRanks.forEach(rankId => {
      // Use default names for now, enhance later if needed by parsing guild_data_json
      rankMap.set(rankId, {
        rank_id: rankId,
        rank_name: rankId === 0 ? "Guild Master" : `Rank ${rankId}`, // Placeholder name
        is_custom: false
      });
    });

    // Merge custom names from DB
    customRanks.forEach(rank => {
      if (rankMap.has(rank.rank_id)) {
         rankMap.set(rank.rank_id, {
           ...rankMap.get(rank.rank_id), // Keep original rank_id
           rank_name: rank.rank_name, // Override name
           is_custom: true
         });
      } else {
         // This case shouldn't happen if sync is correct, but handle defensively
         logger.warn({ guildId: guildIdInt, rankId: rank.rank_id }, `Custom rank ${rank.rank_id} found in DB but not in roster_json.`);
         rankMap.set(rank.rank_id, {
           ...rank,
           is_custom: true
         });
      }
    });

    const ranks = Array.from(rankMap.values()).sort((a, b) => a.rank_id - b.rank_id);

    res.json({
      success: true,
      data: ranks
    });
  }),
  // --- END REFACTORED getGuildRanks ---


  // --- updateRankName (Likely OK) ---
  updateRankName: asyncHandler(async (req: Request, res: Response) => {
    logger.info({ method: req.method, path: req.path, params: req.params, body: req.body, userId: req.session?.userId }, 'Handling updateRankName request');
    const { guildId, rankId } = req.params;
    const { rank_name } = req.body;

    if (!rank_name || typeof rank_name !== 'string') {
      throw new AppError('Rank name is required', 400, {
        code: ERROR_CODES.VALIDATION_ERROR,
        request: req
      });
    }

    if (rank_name.length > 50) {
      throw new AppError('Rank name cannot exceed 50 characters', 400, {
        code: ERROR_CODES.VALIDATION_ERROR,
        request: req
      });
    }

    const guild = await guildModel.findById(parseInt(guildId));

    if (!guild) {
      throw new AppError('Guild not found', 404, {
        code: ERROR_CODES.NOT_FOUND,
        request: req
      });
    }

    // This interacts only with the DB rankModel, so it should be fine.
    const updatedRank = await rankModel.setGuildRank(
      parseInt(guildId),
      parseInt(rankId),
      rank_name
    );

    res.json({
      success: true,
      data: updatedRank
    });
  }),
  // --- END updateRankName ---


  // --- REFACTORED getGuildRankStructure ---
  getGuildRankStructure: asyncHandler(async (req: Request, res: Response) => {
    logger.info({ method: req.method, path: req.path, params: req.params, query: req.query, userId: req.session?.userId }, 'Handling getGuildRankStructure request');
    const { guildId } = req.params;
    const guildIdInt = parseInt(guildId);

     if (isNaN(guildIdInt)) {
      throw new AppError('Invalid guild ID', 400, { code: ERROR_CODES.VALIDATION_ERROR, request: req });
    }

    const guild = await guildModel.findById(guildIdInt); // Cast removed, assuming findById returns correct type

    if (!guild) {
      throw new AppError('Guild not found', 404, {
        code: ERROR_CODES.NOT_FOUND,
        request: req
      });
    }

    const ranks = await rankModel.getGuildRanks(guildIdInt); // Fetch custom names

    // Get rank counts from parsed roster_json or guild_members table aggregation
    // Assuming roster_json column exists on the guild object returned by findById
    const rosterData = (guild as any).roster_json as BattleNetGuildRoster | null;
    const rankCounts: { [key: number]: number } = {};
    if (rosterData?.members) {
        rosterData.members.forEach(member => {
            rankCounts[member.rank] = (rankCounts[member.rank] || 0) + 1;
        });
    }


    const enhancedRanks = ranks.map(rank => ({
      ...rank,
      member_count: rankCounts[rank.rank_id] || 0 // Use counts derived from DB/JSONB
    }));

    res.json({
      success: true,
      data: enhancedRanks
    });
  })
,

  // --- NEW: Get Classified Guild Roster ---
  getClassifiedGuildRoster: asyncHandler(async (req: Request, res: Response) => {
    logger.info({ method: req.method, path: req.path, params: req.params, query: req.query, userId: req.session?.userId }, 'Handling getClassifiedGuildRoster request');
    const { guildId } = req.params;
    const guildIdInt = parseInt(guildId);

    if (isNaN(guildIdInt)) {
      throw new AppError('Invalid guild ID', 400, { code: ERROR_CODES.VALIDATION_ERROR, request: req });
    }

    // Use the classification service
    const classifiedMembers: ClassifiedMember[] = await characterClassificationService.getClassifiedGuildMembers(guildIdInt);

    res.json({
      success: true,
      data: classifiedMembers
    });
  })
  // --- END REFACTORED getGuildRankStructure ---
};