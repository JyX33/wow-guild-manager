import { Request, Response, NextFunction } from 'express';
import guildModel from '../models/guild.model';
import characterModel from '../models/character.model';
import battleNetService from '../services/battlenet.service';
import userModel from '../models/user.model';
import { AppError } from '../utils/error-handler';
import { Character, Guild } from '../../../shared/types/guild';

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
    
    // Get user's characters
    const characters = await characterModel.findByUserId(userId);
    
    // Get user access token
    const user = await userModel.getUserWithTokens(userId);
    
    if (!user || !user.access_token) {
      throw new AppError('Authentication token not found', 401);
    }
    
    // Get guild roster from Battle.net
    const guildRoster = await battleNetService.getGuildMembers(
      guild.region,
      guild.realm,
      guild.name,
      user.access_token
    ) as GuildRoster;
    
    // Check if any of the user's characters is rank 0 (guild master)
    const isGM = guildRoster.members.some((member: BattleNetGuildMember) => 
      characters.some((char: Character) => 
        char.name.toLowerCase() === member.character.name.toLowerCase() && 
        member.rank === 0
      )
    );
    
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