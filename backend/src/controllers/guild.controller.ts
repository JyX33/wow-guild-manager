import { Request, Response } from 'express';
import { asyncHandler } from '../utils/error-handler';
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
        // Get user for access token
        const user = await userModel.findById(req.user.id);
        
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
      
      res.json(guild);
    } catch (error) {
      console.error('Get guild error:', error);
      res.status(500).json({ error: 'Failed to get guild information' });
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
        return res.status(404).json({ error: 'Guild not found' });
      }
      
      // Extract members from guild data
      const members = guild.guild_data?.members || [];
      
      res.json(members);
    } catch (error) {
      console.error('Get guild members error:', error);
      res.status(500).json({ error: 'Failed to get guild members' });
    }
  },    
};