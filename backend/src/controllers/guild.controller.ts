import { Request, Response } from 'express';
import { BattleNetGuildMember } from '../../../shared/types/guild';
import guildModel from '../models/guild.model';
import rankModel from '../models/rank.model';
import userModel from '../models/user.model';
import battleNetService from '../services/battlenet.service';
import { AppError } from '../utils/error-handler';

interface BattleNetGuildRoster {
  members: BattleNetGuildMember[];
}

export default {
  getGuildByName: async (req: Request, res: Response) => {
    try {
      const { region, realm, name } = req.params;
      console.log("params", req.params);
      // Check if guild exists in database
      let guild = await guildModel.findByNameRealmRegion(name, realm, region);
      
      if (!guild) {
        // Get user with tokens
        const user = await userModel.getUserWithTokens(req.user.id);
        
        if (!user?.access_token) {
          throw new AppError('User authentication token not found', 401);
        }
        
        // Fetch guild data from Battle.net API
        const guildData = await battleNetService.getGuildData(realm, name, user.access_token, region);
        
        // Create guild in database
        guild = await guildModel.create({
          name,
          realm,
          region,
          guild_data: guildData
        });
      }
      
      res.json({
        success: true,
        data: guild
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Get guild error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get guild information',
          status: 500
        }
      });
    }
  },

  getGuildById: async (req: Request, res: Response) => {
    try {
      const { guildId } = req.params;
      const guildIdInt = parseInt(guildId);
      
      if (isNaN(guildIdInt)) {
        throw new AppError('Invalid guild ID', 400);
      }

      const guild = await guildModel.findById(guildIdInt);
      
      if (!guild) {
        throw new AppError('Guild not found', 404);
      }

      res.json({
        success: true,
        data: guild
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Get guild by ID error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get guild information',
          status: 500
        }
      });
    }
  },

  getGuildMembers: async (req: Request, res: Response) => {
    try {
      const { guildId } = req.params;
      
      const guild = await guildModel.findById(parseInt(guildId));
      
      if (!guild) {
        throw new AppError('Guild not found', 404);
      }

      // Get user access token
      const user = await userModel.getUserWithTokens(req.user.id);
      
      if (!user?.access_token) {
        throw new AppError('Authentication token not found', 401);
      }

      // Get fresh roster data from Battle.net
      const guildRoster = await battleNetService.getGuildMembers(
        guild.region,
        guild.realm,
        guild.name,
        user.access_token
      );

      res.json({
        success: true,
        data: guildRoster.members
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Get guild members error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get guild members',
          status: 500
        }
      });
    }
  },

  getUserGuilds: async (req: Request, res: Response) => {
    try {
      const user = await userModel.getUserWithTokens(req.user.id);
      
      if (!user?.access_token) {
        throw new AppError('Authentication token not found', 401);
      }

      const profile = await battleNetService.getWowProfile(
        user.region || 'eu',
        user.access_token
      );
      
      const guilds = [];
      const processedGuilds = new Set<string>();
      
      for (const account of profile.wow_accounts || []) {
        for (const character of account.characters || []) {
          if (!character.guild) continue;
          
          const guildKey = `${character.guild.realm.slug}-${character.guild.name}`;
          if (processedGuilds.has(guildKey)) continue;
          processedGuilds.add(guildKey);
          
          try {
            const guildInfo = await battleNetService.getGuildData(
              character.realm.slug,
              character.guild.name,
              user.access_token,
              user.region
            );
            
            const roster = await battleNetService.getGuildMembers(
              user.region || 'eu',
              character.realm.slug,
              character.guild.name,
              user.access_token
            ) as BattleNetGuildRoster;
            
            const isGuildMaster = roster.members.some(member => 
              character.name.toLowerCase() === member.character.name.toLowerCase() && 
              member.rank === 0
            );
            
            guilds.push({
              ...guildInfo,
              is_guild_master: isGuildMaster
            });
          } catch (error) {
            console.error(`Error fetching guild data for ${character.guild.name}:`, error);
          }
        }
      }
      
      res.json({
        success: true,
        data: guilds
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Get user guilds error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get user guilds',
          status: 500
        }
      });
    }
  },
  
  getEnhancedGuildMembers: async (req: Request, res: Response) => {
    try {
      console.log('[DEBUG] Starting getEnhancedGuildMembers for guildId:', req.params.guildId);
      const { guildId } = req.params;

      const guild = await guildModel.findById(parseInt(guildId));
      
      if (!guild) {
        throw new AppError('Guild not found', 404);
      }
      
      const user = await userModel.getUserWithTokens(req.user.id);
      
      if (!user?.access_token) {
        throw new AppError('Authentication token not found', 401);
      }

      const userToken = user.access_token;
      
      const guildRoster = await battleNetService.getGuildMembers(
        guild.region,
        guild.realm,
        guild.name,
        userToken
      ) as BattleNetGuildRoster;
      
      console.log('[DEBUG] Guild roster fetched, total members:', guildRoster.members.length);
      
      const membersToEnhance = guildRoster.members.slice(0, 20);
      console.log('[DEBUG] Processing first 20 members for enhancement');
      
      console.log('[DEBUG] Starting enhancement of members');
      const enhancedMembers = await Promise.all(
        membersToEnhance.map(async (member: BattleNetGuildMember) => {
          try {
            console.log(`[DEBUG] Enhancing member: ${member.character.name} (${member.character.realm.slug})`);
            const enhancedData = await battleNetService.getEnhancedCharacterData(
              member.character.realm.slug,
              member.character.name,
              userToken,
              guild.region
            );
            
            return {
              id: 0,
              guild_id: parseInt(guildId),
              character_name: member.character.name,
              character_class: enhancedData.character_class?.name?.en_US || 'Unknown',
              character_role: 'DPS',
              rank: member.rank,
              character: {
                ...enhancedData,
                name: member.character.name,
                realm: member.character.realm.slug,
                itemLevel: enhancedData.equipped_item_level,
                activeSpec: enhancedData.active_spec,
                mythicKeystone: enhancedData.mythic_keystone_profile,
                professions: enhancedData.professions
              }
            };
          } catch (error) {
            console.warn(`Could not fetch enhanced data for ${member.character.name}:`, error);
            return member;
          }
        })
      );
      
      console.log('[DEBUG] Enhancement complete. Successfully enhanced members:', enhancedMembers.length);
      
      res.json({
        success: true,
        data: enhancedMembers
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Get enhanced guild members error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get enhanced guild members',
          status: 500
        }
      });
    }
  },

  getGuildRanks: async (req: Request, res: Response) => {
    try {
      const { guildId } = req.params;
      
      const guild = await guildModel.findById(parseInt(guildId));
      
      if (!guild) {
        throw new AppError('Guild not found', 404);
      }
      
      const customRanks = await rankModel.getGuildRanks(parseInt(guildId));
      const user = await userModel.getUserWithTokens(req.user.id);
      
      if (!user?.access_token) {
        throw new AppError('Authentication token not found', 401);
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
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Get guild ranks error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get guild ranks',
          status: 500
        }
      });
    }
  },

  updateRankName: async (req: Request, res: Response) => {
    try {
      const { guildId, rankId } = req.params;
      const { rank_name } = req.body;
      
      if (!rank_name || typeof rank_name !== 'string') {
        throw new AppError('Rank name is required', 400);
      }
      
      if (rank_name.length > 50) {
        throw new AppError('Rank name cannot exceed 50 characters', 400);
      }
      
      const guild = await guildModel.findById(parseInt(guildId));
      
      if (!guild) {
        throw new AppError('Guild not found', 404);
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
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Update rank name error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to update rank name',
          status: 500
        }
      });
    }
  }
};