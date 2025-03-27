import { Request, Response } from 'express';
import {
  BattleNetGuildMember,
  BattleNetGuildRoster,
  DbGuild,
} from '../../../shared/types/guild';
import * as guildModel from '../models/guild.model';
import * as rankModel from '../models/rank.model';
import * as userModel from '../models/user.model';
import * as battleNetService from '../services/battlenet.service';
import * as guildLeadershipService from '../services/guild-leadership.service';
import * as guildRosterService from '../services/guild-roster.service';
import { AppError, asyncHandler, ERROR_CODES } from '../utils/error-handler';

export default {
  getGuildByName: asyncHandler(async (req: Request, res: Response) => {
    const { region, realm, name } = req.params;
    // Check if guild exists in database
    let guild = await guildModel.findByNameRealmRegion(name, realm, region);
    
    if (!guild) {
      // Get user with tokens
      const user = await userModel.getUserWithTokens(req.user.id);
      
      if (!user?.access_token) {
        throw new AppError('User authentication token not found', 401, {
          code: ERROR_CODES.AUTH_ERROR,
          request: req
        });
      }
      
      // Fetch guild data from Battle.net API
      const guildData = await battleNetService.getGuildData(realm, name, user.access_token, region);
      
      // Create guild in database
      guild = await guildModel.create({
        name,
        realm,
        region,
        guild_data: guildData,
        last_updated: new Date().toISOString()
      });
      
      if (!guild) {
        throw new AppError('Failed to create guild', 500, {
          code: ERROR_CODES.DATABASE_ERROR,
          request: req
        });
      }

      // After creating the guild, fetch roster to establish leadership
      const guildRoster = await battleNetService.getGuildRoster(
        region, 
        realm, 
        name, 
        user.access_token
      );
      
      // Find the guild master in roster
      const guildMaster = guildRoster.members.find(member => member.rank === 0);
      
      if (guildMaster) {
        // Find user who owns this character
        const guildMasterUser = await userModel.findByCharacterName(
          guildMaster.character.name,
          guildMaster.character.realm.slug
        );
        
        if (guildMasterUser) {
          // Update guild with leader_id
          await guildModel.update(guild.id, { 
            leader_id: guildMasterUser.id,
            last_updated: new Date().toISOString()
          });
          
          // Refresh guild data
          guild = await guildModel.findById(guild.id);
        }
      }
      
      if (guild) {
        // Sync guild ranks
        await guildRosterService.syncGuildRanks(guild.id, guildRoster);
        // Update rank counts
        await guildRosterService.updateGuildRankInfo(guild.id, guildRoster);
      }
    }
    
    if (!guild) {
      throw new AppError('Failed to retrieve guild', 500, {
        code: ERROR_CODES.DATABASE_ERROR,
        request: req
      });
    }

    res.json({
      success: true,
      data: guild
    });
  }),

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

    res.json({
      success: true,
      data: guild
    });
  }),

  getGuildMembers: asyncHandler(async (req: Request, res: Response) => {
    const { guildId } = req.params;
    
    const guild = await guildModel.findById(parseInt(guildId));
    
    if (!guild) {
      throw new AppError('Guild not found', 404, {
        code: ERROR_CODES.NOT_FOUND,
        request: req
      });
    }

    // Get user access token
    const user = await userModel.getUserWithTokens(req.user.id);
    
    if (!user?.access_token) {
      throw new AppError('Authentication token not found', 401, {
        code: ERROR_CODES.AUTH_ERROR,
        request: req
      });
    }

    // Get fresh roster data from Battle.net
    const guildRoster = await battleNetService.getGuildRoster(
      guild.region,
      guild.realm,
      guild.name,
      user.access_token
    ) as BattleNetGuildRoster;

    // Find the rank 0 member (Guild Master)
    const guildMaster = guildRoster.members.find(member => member.rank === 0);
    
    if (guildMaster && guild) {
      // Update guild data
      await guildModel.updateGuildData(guild.id, {
        ...guild,
        guild_data: {
          ...guild.guild_data,
          guild_master: guildMaster.character.name.toLowerCase()
        }
      });
      
      // Update leader_id if needed
      await guildLeadershipService.findAndUpdateGuildLeader(guild.id, guildRoster);
    }
    
    // Update guild ranks and rank counts 
    await guildRosterService.syncGuildRanks(guild.id, guildRoster);
    await guildRosterService.updateGuildRankInfo(guild.id, guildRoster);
    
    res.json({
      success: true,
      data: guildRoster.members
    });
  }),

  getUserGuilds: asyncHandler(async (req: Request, res: Response) => {
    const user = await userModel.getUserWithTokens(req.user.id);
    
    if (!user?.access_token) {
      throw new AppError('Authentication token not found', 401, {
        code: ERROR_CODES.AUTH_ERROR,
        request: req
      });
    }

    const profile = await battleNetService.getWowProfile(
      user.region || 'eu',
      user.access_token
    );
    
    const guilds = [];
    const processedGuilds = new Set();
    
    // Get user's characters from the database for guild master check
    const userCharacters = await userModel.getUserCharacters(req.user.id);
    console.log(`[DEBUG] Found ${userCharacters.length} characters for user ${user.id}`);
    // Iterate through all WoW accounts
    for (const account of profile.wow_accounts || []) {
      // Iterate through all characters in each account
      for (const character of account.characters || []) {
        // Skip characters not in a guild
        const characterData = await battleNetService.getWowCharacter(
          user.region || 'eu',
          character.realm.slug,
          character.name,
          user.access_token
        );
        if (!characterData.guild) continue;
        
        const guildKey = `${characterData.guild.name}`;
        
        // Skip if we've already processed this guild
        if (processedGuilds.has(guildKey)) continue;
        processedGuilds.add(guildKey);
        
        try {
          const guildInfo = await battleNetService.getGuildData(
            characterData.guild.realm.slug,
            characterData.guild.name,
            user.access_token,
            user.region
          );
          
          const roster = await battleNetService.getGuildMembers(
            user.region || 'eu',
            characterData.guild.realm.slug,
            characterData.guild.name,
            user.access_token
          ) as BattleNetGuildRoster;
          
          // Check if any of user's characters is guild master
          const isGuildMaster = roster.members.some(member => 
            userCharacters.some(char => 
              char.name.toLowerCase() === member.character.name.toLowerCase() && 
              member.rank === 0 // Rank 0 is guild master
            )
          );
          console.log(`[DEBUG] User ${user.id} is guild master: ${isGuildMaster}`);
          guilds.push({
            ...guildInfo,
            is_guild_master: isGuildMaster
          });
        } catch (error) {
          console.error(`Error fetching guild data for ${characterData.guild.name}:`, error);
          // Continue with other guilds instead of failing the entire request
        }
      }
    }
    
    console.log(`[DEBUG] Processed ${guilds.length} unique guilds for user ${user.id}`);
    res.json({
      success: true,
      data: guilds
    });
  }),
  
  getEnhancedGuildMembers: asyncHandler(async (req: Request, res: Response) => {
    console.log('[DEBUG] Starting getEnhancedGuildMembers for guildId:', req.params.guildId);
    const { guildId } = req.params;

    const guild = await guildModel.findById(parseInt(guildId));
    
    if (!guild) {
      throw new AppError('Guild not found', 404, {
        code: ERROR_CODES.NOT_FOUND,
        request: req
      });
    }
    
    const user = await userModel.getUserWithTokens(req.user.id);
    
    if (!user?.access_token) {
      throw new AppError('Authentication token not found', 401, {
        code: ERROR_CODES.AUTH_ERROR,
        request: req
      });
    }

    const userToken = user.access_token;
    
    const guildRoster = await battleNetService.getGuildMembers(
      guild.region,
      guild.realm,
      guild.name,
      userToken
    ) as BattleNetGuildRoster;
    
    console.log('[DEBUG] Guild roster fetched, total members:', guildRoster.members.length);
    
    const allowedRanks = new Set([0, 1, 3, 4, 5]);
    const membersToEnhance = guildRoster.members.filter(member => allowedRanks.has(member.rank));
    
    console.log(`[DEBUG] Processing ${membersToEnhance.length} members with ranks 0,1,3,4,5 for enhancement`);
    console.log('[DEBUG] Starting enhancement of members');
    
    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{name: string; error: string}> = [];
    
    const enhancedMembers = await Promise.all(
      membersToEnhance.map(async (member: BattleNetGuildMember) => {
        try {
          console.log(`[DEBUG] Enhancing member: ${member.character.name} (${member.character.realm.slug}) - Rank ${member.rank}`);
          const enhancedData = await battleNetService.getEnhancedCharacterData(
            member.character.realm.slug,
            member.character.name,
            userToken,
            guild.region
          );
          
          successCount++;
          
          return {
            id: 0,
            guild_id: parseInt(guildId),
            character_name: member.character.name,
            character_class: enhancedData.character_class?.name || 'Unknown',
            character_role: 'DPS',
            rank: member.rank,
            character: {
              id: enhancedData.id,
              user_id: 0,
              name: member.character.name,
              realm: member.character.realm.slug,
              class: enhancedData.character_class?.name || 'Unknown',
              level: enhancedData.level || member.character.level,
              role: 'DPS',
              is_main: false,
              achievement_points: enhancedData.achievement_points || 0,
              equipped_item_level: enhancedData.equipped_item_level || 0,
              average_item_level: enhancedData.average_item_level || 0,
              last_login_timestamp: enhancedData.last_login_timestamp || 0,
              character_data: enhancedData,
              itemLevel: enhancedData.equipped_item_level || 0,
              mythicKeystone: null,
              activeSpec: enhancedData.active_spec || null,
              professions: enhancedData.professions || []
            }
          };           
        } catch (error) {
          errorCount++;
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.warn(`[ERROR] Could not fetch enhanced data for ${member.character.name}:`, errorMessage);
          errors.push({ name: member.character.name, error: errorMessage });
          
          return {
            id: 0,
            guild_id: parseInt(guildId),
            character_name: member.character.name,
            character_class: 'Unknown',
            character_role: 'DPS',
            rank: member.rank,
            character: {
              id: 0,
              user_id: 0,
              name: member.character.name,
              realm: member.character.realm.slug,
              class: 'Unknown',
              level: member.character.level,
              role: 'DPS',
              is_main: false,
              achievement_points: 0,
              equipped_item_level: 0,
              average_item_level: 0,
              last_login_timestamp: 0,
              character_data: null,
              itemLevel: 0,
              mythicKeystone: null,
              activeSpec: null,
              professions: []
            }
          };
        }
      })
    );
    
    const completionStats = {
      total: membersToEnhance.length,
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

  getGuildRanks: asyncHandler(async (req: Request, res: Response) => {
    const { guildId } = req.params;
    
    const guild = await guildModel.findById(parseInt(guildId));
    
    if (!guild) {
      throw new AppError('Guild not found', 404, {
        code: ERROR_CODES.NOT_FOUND,
        request: req
      });
    }
    
    const customRanks = await rankModel.getGuildRanks(parseInt(guildId));
    const user = await userModel.getUserWithTokens(req.user.id);
    
    if (!user?.access_token) {
      throw new AppError('Authentication token not found', 401, {
        code: ERROR_CODES.AUTH_ERROR,
        request: req
      });
    }
    
    const guildRoster = await battleNetService.getGuildMembers(
      guild.region,
      guild.realm,
      guild.name,
      user.access_token
    ) as BattleNetGuildRoster;
    
    const rankMap = new Map();
    
    const uniqueRanks = new Set(guildRoster.members.map(member => member.rank));
    uniqueRanks.forEach(rankId => {
      rankMap.set(rankId, {
        rank_id: rankId,
        rank_name: rankId === 0 ? "Guild Master" : `Rank ${rankId}`,
        is_custom: false
      });
    });
    
    customRanks.forEach(rank => {
      rankMap.set(rank.rank_id, {
        ...rank,
        is_custom: true
      });
    });
    
    const ranks = Array.from(rankMap.values()).sort((a, b) => a.rank_id - b.rank_id);
    
    res.json({
      success: true,
      data: ranks
    });
  }),

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
    
    // Sync roster
    const result = await guildRosterService.synchronizeGuildRoster(
      parseInt(guildId),
      user.access_token
    );
    
    res.json({
      success: true,
      data: {
        message: 'Guild roster synchronized successfully',
        members_updated: result.members.length
      }
    });
  }),

  getGuildRankStructure: asyncHandler(async (req: Request, res: Response) => {
    const { guildId } = req.params;
    
    const guild = await guildModel.findById(parseInt(guildId)) as DbGuild;
    
    if (!guild) {
      throw new AppError('Guild not found', 404, {
        code: ERROR_CODES.NOT_FOUND,
        request: req
      });
    }
    
    const ranks = await rankModel.getGuildRanks(parseInt(guildId));
    
    // Convert rank_counts to the right type or use empty object
    const rankCounts = (guild.guild_data as any)?.rank_counts || {};
    
    const enhancedRanks = ranks.map(rank => ({
      ...rank,
      member_count: rankCounts[rank.rank_id] || 0
    }));
    
    res.json({
      success: true,
      data: enhancedRanks
    });
  })
};