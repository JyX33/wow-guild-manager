import { Request, Response, NextFunction } from 'express';
import * as guildModel from '../models/guild.model';
import { AppError } from '../utils/error-handler';
import { verifyGuildLeadership } from '../services/guild-leadership.service';

interface BattleNetGuildMember {
  character: {
    name: string;
    id: number;
    realm: {
      slug: string;
      name: string;
    };
  };
  rank: number;
}

interface GuildRoster {
  members: BattleNetGuildMember[];
}

/**
 * Middleware to check if the authenticated user is a guild master
 */
export const isGuildMaster = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const guildId = parseInt(req.params.guildId);
    const userId = (req.user as { id: number }).id;
    
    // Get the guild from database
    const guild = await guildModel.findById(guildId);
    if (!guild) {
      throw new AppError('Guild not found', 404);
    }
    
    // Use the verification service instead of direct API calls
    const isGM = await verifyGuildLeadership(guildId, userId);
    
    if (!isGM) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'You must be the guild master to perform this action',
          status: 403
        }
      });
    }
    
    // User is guild master, proceed
    next();
  } catch (error) {
    next(error);
  }
};