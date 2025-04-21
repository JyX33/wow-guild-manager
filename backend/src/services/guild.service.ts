import { GuildMemberActivity, DbGuildMember, DbCharacter } from '../../../shared/types/guild.js';
import * as guildMemberModel from '../models/guild_member.model.js';
import * as characterModel from '../models/character.model.js';
import logger from '../utils/logger.js';

/**
 * Fetches recent guild member activity (joins and leaves).
 * @param guildId The ID of the guild.
 * @returns An object containing lists of new members and left members.
 */
export const getRecentMemberActivity = async (guildId: number): Promise<GuildMemberActivity> => {
  logger.info({ guildId }, 'Fetching recent guild member activity');

  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  // Fetch members who joined in the last 2 days and are still in the guild
  const newMembers: DbGuildMember[] = await guildMemberModel.findRecentJoins(guildId, twoDaysAgo);

  // Fetch members who left in the last 2 days
  const leftMembers: DbGuildMember[] = await guildMemberModel.findRecentLeaves(guildId, twoDaysAgo);

  // Fetch character details for new members
  const newMemberCharacterIds = newMembers.map(member => member.character_id);
  const newMemberCharacters: DbCharacter[] = await characterModel.findByIds(newMemberCharacterIds);
  const newMemberCharacterMap = new Map(newMemberCharacters.map(char => [char.id, char]));

  // Fetch character details for left members
  const leftMemberCharacterIds = leftMembers.map(member => member.character_id);
  const leftMemberCharacters: DbCharacter[] = await characterModel.findByIds(leftMemberCharacterIds);
  const leftMemberCharacterMap = new Map(leftMemberCharacters.map(char => [char.id, char]));


  const newMembersWithDetails = newMembers.map(member => {
    const character = newMemberCharacterMap.get(member.character_id);
    return {
      ...member,
      character_name: character?.name || member.character_name,
      character_realm: character?.realm || 'Unknown',
      character_class: character?.class || 'Unknown',
      character_level: character?.level || 0,
    };
  });

  const leftMembersWithDetails = leftMembers.map(member => {
    const character = leftMemberCharacterMap.get(member.character_id);
    return {
      ...member,
      character_name: character?.name || member.character_name,
      character_realm: character?.realm || 'Unknown',
      character_class: character?.class || 'Unknown',
      character_level: character?.level || 0,
    };
  });


  return {
    newMembers: newMembersWithDetails,
    leftMembers: leftMembersWithDetails,
  };
};