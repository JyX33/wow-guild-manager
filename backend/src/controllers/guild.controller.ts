import { Request, Response } from 'express';
import {
  BattleNetGuildMember,
  BattleNetGuildRoster, // Keep for parsing roster_json
  DbGuild,
  Guild, // Import the application-level Guild type
  DbCharacter, // Added
  EnhancedGuildMember, // Added
  BattleNetCharacter, // Added
  BattleNetCharacterEquipment, // Added
  BattleNetMythicKeystoneProfile, // Added
  BattleNetProfessions, // Added
  CharacterRole, // Added
} from '../../../shared/types/guild';
import * as guildModel from '../models/guild.model';
import * as rankModel from '../models/rank.model';
import * as userModel from '../models/user.model';
import * as guildMemberModel from '../models/guild_member.model'; // Added
import * as characterModel from '../models/character.model'; // Added
// Removed battleNetService, guildLeadershipService, guildRosterService imports for refactored methods
// import * as battleNetService from '../services/battlenet.service';
// import * as guildLeadershipService from '../services/guild-leadership.service';
// import * as guildRosterService from '../services/guild-roster.service';
import { AppError, asyncHandler, ERROR_CODES } from '../utils/error-handler';

// Keep battleNetService import ONLY if still needed by methods NOT yet refactored
import * as battleNetService from '../services/battlenet.service';
// Keep guildLeadershipService import ONLY if still needed by methods NOT yet refactored
import * as guildLeadershipService from '../services/guild-leadership.service';
// Keep guildRosterService import ONLY if still needed by methods NOT yet refactored
import * as guildRosterService from '../services/guild-roster.service';


export default {
  // --- REFACTORED getGuildByName ---
  getGuildByName: asyncHandler(async (req: Request, res: Response) => {
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
    const { guildId } = req.params;
    const guildIdInt = parseInt(guildId);

     if (isNaN(guildIdInt)) {
      throw new AppError('Invalid guild ID', 400, {
        code: ERROR_CODES.VALIDATION_ERROR,
        request: req
      });
    }

    // Fetch guild data including the roster_json column
    // Assuming findById is updated or returns all columns including roster_json
    const guild = await guildModel.findById(guildIdInt);

    if (!guild) {
      throw new AppError('Guild not found', 404, {
        code: ERROR_CODES.NOT_FOUND,
        request: req
      });
    }

    // --- BATTLE.NET & SYNC LOGIC REMOVED ---

    // Parse members from the roster_json column
    // Need to cast 'guild' to access the potentially new column if type isn't updated yet
    // Also ensure the DbGuild type includes roster_json
    const rosterData = (guild as any).roster_json as BattleNetGuildRoster | null;
    const members: BattleNetGuildMember[] = rosterData?.members || [];

    // Return the members array from the stored JSON
    res.json({
      success: true,
      data: members
    });
  }),
  // --- END REFACTORED getGuildMembers ---


  // --- REFACTORED getUserGuilds ---
  getUserGuilds: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id; // Get user ID from authenticated request

    // 1. Get user's characters from the database
    // Assuming getUserCharacters returns characters with guild_id populated
    const userCharacters = await userModel.getUserCharacters(userId);
    console.log(`[DEBUG] Found ${userCharacters.length} characters for user ${userId}`);

    // 2. Extract unique guild IDs from characters that have one
    const guildIds = [
      ...new Set(
        userCharacters
          .map(char => char.guild_id)
          .filter((id): id is number => id !== null && id !== undefined) // Filter out null/undefined IDs
      )
    ];

    if (guildIds.length === 0) {
      // User has no characters in any guilds known to the system
      console.log(`[DEBUG] User ${userId} has no characters in known guilds.`);
      return res.json({ success: true, data: [] });
    }

    // 3. Fetch the corresponding guild records from the database
    const dbGuilds = await guildModel.findByIds(guildIds);

    // 4. Map DB guilds to the response format, checking leadership
    const responseGuilds: Guild[] = dbGuilds.map(dbGuild => {
      // Determine if the current user is the leader of this guild
      const isGuildMaster = dbGuild.leader_id === userId;

      // Construct the response object using the Guild type
      // Use the guild_data_json field from DbGuild for the guild_data property
      const guildData = (dbGuild as any).guild_data_json || {}; // Use the correct JSONB field

      return {
        id: dbGuild.id,
        name: dbGuild.name,
        realm: dbGuild.realm,
        region: dbGuild.region,
        last_updated: dbGuild.last_updated,
        leader_id: dbGuild.leader_id,
        guild_data_json: guildData, // Assign the JSON data - MATCHES UPDATED Guild TYPE
        is_guild_master: isGuildMaster,
      };
    });

    console.log(`[DEBUG] Returning ${responseGuilds.length} unique guilds for user ${userId}`);
    res.json({
      success: true,
      data: responseGuilds
    });
  }),
  // --- END REFACTORED getUserGuilds ---


  // --- REFACTORED getEnhancedGuildMembers ---
  getEnhancedGuildMembers: asyncHandler(async (req: Request, res: Response) => {
    console.log('[DEBUG] Starting getEnhancedGuildMembers for guildId:', req.params.guildId);
    const { guildId } = req.params;
    const guildIdInt = parseInt(guildId);

     if (isNaN(guildIdInt)) {
      throw new AppError('Invalid guild ID', 400, { code: ERROR_CODES.VALIDATION_ERROR, request: req });
    }

    // 1. Fetch relevant guild members from DB
    const allowedRanks = [0, 1, 3, 4, 5]; // Define ranks to fetch
    const dbGuildMembers = await guildMemberModel.findByGuildAndRanks(guildIdInt, allowedRanks);
    console.log(`[DEBUG] Found ${dbGuildMembers.length} members with allowed ranks in DB`);

    if (dbGuildMembers.length === 0) {
      return res.json({ success: true, data: [], stats: { total: 0, successful: 0, failed: 0, errors: [] } });
    }

    // 2. Extract character IDs
    const characterIds = dbGuildMembers.map(member => member.character_id);

    // 3. Fetch corresponding character details from DB
    const dbCharacters = await characterModel.findByIds(characterIds);
    console.log(`[DEBUG] Fetched ${dbCharacters.length} character details from DB`);

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
        console.warn(`[ERROR] Character data not found in DB for guild member ID ${member.id}, character ID ${member.character_id}`);
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
          character_class: member.character_class || 'Unknown', // Use DB value
          character_role: role,
          rank: member.rank,
          character: { // Construct this from DB character record + parsed JSONB
            id: character.id,
            user_id: character.user_id,
            name: character.name,
            realm: character.realm,
            class: character.class,
            level: character.level,
            role: role, // Use determined role
            is_main: character.is_main,
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
        console.warn(`[ERROR] Could not parse JSONB data for character ${character.name}:`, errorMessage);
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

    console.log('[DEBUG] Enhancement complete:', JSON.stringify(completionStats, null, 2));

    res.json({
      success: true,
      data: enhancedMembers,
      stats: completionStats
    });
  }),
  // --- END REFACTORED getEnhancedGuildMembers ---


  // --- REFACTORED getGuildRanks ---
  getGuildRanks: asyncHandler(async (req: Request, res: Response) => {
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


  // --- syncGuildCharacters (Needs Refactoring/Removal) ---
  // This endpoint forces a sync, which contradicts the background sync goal.
  // It should likely be removed or heavily modified (e.g., trigger background job, return status).
  // For now, keep it but note it needs removal/rethinking.
  syncGuildCharacters: asyncHandler(async (req: Request, res: Response) => {
    const { guildId } = req.params;
    const userId = req.user.id;

    // Verify user has permission (guild member or leader)
    const user = await userModel.getUserWithTokens(userId);

    if (!user?.access_token) {
      throw new AppError('Authentication token not found', 401, {
        code: ERROR_CODES.AUTH_ERROR,
        request: req
      });
    }

    // Sync roster - This service call needs to be removed/replaced
    // TODO: Replace this with logic to trigger the background sync job for this guild?
    // Or simply remove the endpoint entirely.
    console.warn("DEPRECATED: syncGuildCharacters endpoint called. Should be handled by background job.");
    // const result = await guildRosterService.synchronizeGuildRoster(
    //   parseInt(guildId),
    //   user.access_token
    // );

    res.status(501).json({ // Return 501 Not Implemented or similar
      success: false,
      message: 'Manual sync endpoint is deprecated. Data is updated periodically.',
      // data: {
      //   message: 'Guild roster synchronization triggered (or removed)', // Message might change
      //   members_updated: result.members.length // This result structure will change or be removed
      // }
    });
  }),
  // --- END syncGuildCharacters ---


  // --- REFACTORED getGuildRankStructure ---
  getGuildRankStructure: asyncHandler(async (req: Request, res: Response) => {
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
  // --- END REFACTORED getGuildRankStructure ---
};