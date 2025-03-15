import { Request, Response } from 'express';
import { AppError } from '../utils/error-handler';
import battleNetService from '../services/battlenet.service';
import guildModel from '../models/guild.model';
import userModel from '../models/user.model';

export default {
  getGuildByName: async (req: Request, res: Response) => {
    try {
      const { region, realm, name } = req.params;
      
      // Check if guild exists in database
      let guild = await guildModel.findByNameRealmRegion(name, realm, region);
      
      if (!guild) {
        // Get user with tokens
        const user = await userModel.getUserWithTokens(req.user.id);
        
        if (!user || !user.access_token) {
          throw new AppError('User authentication token not found', 401);
        }
        
        // Fetch guild data from Battle.net API
        const guildData = await battleNetService.getGuildMembers(region, realm, name, user.access_token);
        
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
      
      // Validate that guildId is a valid integer
      const guildIdInt = parseInt(guildId);
      
      if (isNaN(guildIdInt)) {
        throw new AppError('Invalid guild ID. Must be a valid integer.', 400);
      }
      
      // Get guild from database
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
      throw new AppError('Failed to get guild information', 500);
    }
  },
  
  getGuildMembers: async (req: Request, res: Response) => {
    try {
      const { guildId } = req.params;
      
      // Get guild from database
      const guild = await guildModel.findById(parseInt(guildId));
      
      if (!guild) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Guild not found',
            status: 404
          }
        });
      }
      
      // Extract members from guild data
      const members = guild.guild_data?.members || [];
      
      res.json({
        success: true,
        data: members
      });
    } catch (error) {
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
};