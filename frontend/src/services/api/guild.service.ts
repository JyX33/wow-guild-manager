import { apiRequest } from './core';
import { 
  Guild, 
  GuildMember, 
  EnhancedGuildMember, 
  GuildRank,
  ClassifiedMember // Added for classified roster
} from '../../../../shared/types/guild';
export const guildService = {
  /**
   * Get guild by ID
   */
  getGuildById: (guildId: number) =>
    apiRequest<Guild>({
      method: 'GET',
      url: `/guilds/id/${guildId}`
    }),

  /**
   * Get guild by region, realm and name
   */
  getGuildByName: (region: string, realm: string, name: string) =>
    apiRequest<Guild>({
      method: 'GET',
      url: `/guilds/${region}/${realm}/${name}`
    }),

  /**
   * Get guild members
   */
  getGuildMembers: (guildId: number) =>
    apiRequest<GuildMember[]>({
      method: 'GET',
      url: `/guilds/${guildId}/members`
    }),

  /**
   * Get all guilds that the user is a member of
   */
  getUserGuilds: () =>
    apiRequest<Guild[]>({
      method: 'GET',
      url: '/guilds/user'
    }),

  /**
   * Get enhanced guild members with detailed information
   */
  getEnhancedGuildMembers: (guildId: number) =>
    apiRequest<EnhancedGuildMember[]>({
      method: 'GET',
      url: `/guilds/${guildId}/members/enhanced`
    }),

  /**
   * Get guild ranks (both default and custom)
   */
  getGuildRanks: (guildId: number) =>
    apiRequest<GuildRank[]>({
      method: 'GET',
      url: `/guilds/${guildId}/ranks`
    }),

  /**
   * Update a guild rank name
   */
  updateRankName: (guildId: number, rankId: number, rankName: string) =>
    apiRequest<GuildRank>({
      method: 'PUT',
      url: `/guilds/${guildId}/ranks/${rankId}`,
      data: { rank_name: rankName }
    }),
    
  /**
   * Get enhanced guild rank structure with member counts
   */
  getGuildRankStructure: (guildId: number) =>
    apiRequest<GuildRank[]>({
      method: 'GET', 
      url: `/guilds/${guildId}/rank-structure`
    }),

  /**
   * Get classified guild roster with main/alt status
   */
  getClassifiedGuildRoster: (guildId: number) =>
    apiRequest<ClassifiedMember[]>({
      method: 'GET',
      url: `/guilds/${guildId}/classified-roster`
    }),
};