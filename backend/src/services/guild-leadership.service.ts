import { Request, Response } from 'express';
import * as guildModel from '../models/guild.model';
import * as userModel from '../models/user.model';
import * as battleNetService from './battlenet.service';
import { BattleNetGuildRoster } from '../../../shared/types/guild';

export const verifyGuildLeadership = async (guildId: number, userId: number): Promise<boolean> => {
  // First check database for leader_id
  const guild = await guildModel.findById(guildId);
  
  if (guild && guild.leader_id === userId) {
    // If last_updated is recent (within 1 day), trust the database
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    if (guild.last_updated && new Date(guild.last_updated) > oneDayAgo) {
      return true;
    }
  }
  
  // Otherwise, verify with Battle.net API
  // Get user to access their tokens
  const user = await userModel.findById(userId);
  if (!user || !user.access_token) {
    return false;
  }
  
  // Get guild data and check if user is guild master
  try {
    const guildData = await battleNetService.getGuildRoster(
      guild.region,
      guild.realm,
      guild.name,
      user.access_token
    );
    
    // Find the user's characters
    const userCharacters = await userModel.getUserCharacters(userId);
    
    // Check if any of the user's characters is the guild master
    const isGuildMaster = guildData.members.some(member => 
      member.rank === 0 && 
      userCharacters.some(char => 
        char.name.toLowerCase() === member.character.name.toLowerCase() &&
        char.realm.toLowerCase() === member.character.realm.slug.toLowerCase()
      )
    );
    
    // Update leader_id if needed
    if (isGuildMaster && guild && guild.leader_id !== userId) {
      await guildModel.update(guild.id, { 
        leader_id: userId,
        last_updated: new Date().toISOString()
      });
    }
    
    return isGuildMaster;
  } catch (error) {
    console.error('Error verifying guild leadership:', error);
    return false;
  }
};

export const findAndUpdateGuildLeader = async (
  guildId: number, 
  guildRoster: BattleNetGuildRoster
): Promise<number | null> => {
  try {
    // Find the guild master in roster
    const guildMaster = guildRoster.members.find(member => member.rank === 0);
    
    if (!guildMaster) {
      return null;
    }
    
    // Find user who owns this character
    const guildMasterUser = await userModel.findByCharacterName(
      guildMaster.character.name,
      guildMaster.character.realm.slug
    );
    
    if (guildMasterUser) {
      // Update guild with leader_id
      await guildModel.update(guildId, { 
        leader_id: guildMasterUser.id,
        last_updated: new Date().toISOString()
      });
      
      return guildMasterUser.id;
    }
    
    return null;
  } catch (error) {
    console.error('Error updating guild leader:', error);
    return null;
  }
};

export const refreshGuildLeadership = async () => {
  // Get guilds with outdated information
  const outdatedGuilds = await guildModel.findOutdatedGuilds();
  
  for (const guild of outdatedGuilds) {
    try {
      // Find a valid token to use from guild members
      const guildMembers = await userModel.findGuildMembers(guild.id);
      let validToken = null;
      
      for (const member of guildMembers) {
        if (member.access_token) {
          validToken = member.access_token;
          break;
        }
      }
      
      if (!validToken) {
        continue; // Skip if no valid token found
      }
      
      // Refresh guild data from Battle.net
      const guildRoster = await battleNetService.getGuildRoster(
        guild.region, 
        guild.realm, 
        guild.name, 
        validToken
      );
      
      // Update leader_id
      await findAndUpdateGuildLeader(guild.id, guildRoster);
    } catch (error) {
      console.error(`Failed to refresh guild ${guild.id}:`, error);
    }
  }
};