import { Guild, GuildMember, Character } from '../../../shared/types/index';
import { apiRequest } from './core';

export const guildService = {
  /**
   * Get a list of all guilds
   */
  getGuilds: () =>
    apiRequest<Guild[]>({
      method: 'GET',
      url: '/guilds'
    }),

  /**
   * Get a guild by ID
   * @param guildId The guild ID
   */
  getGuildById: (guildId: number) =>
    apiRequest<Guild>({
      method: 'GET',
      url: `/guilds/id/${guildId}`
    }),

  /**
   * Get a guild by name, realm, and region
   * @param region Battle.net region
   * @param realm Server realm
   * @param name Guild name
   */
  getGuildByName: (region: string, realm: string, name: string) =>
    apiRequest<Guild>({
      method: 'GET',
      url: `/guilds/${region}/${encodeURIComponent(realm)}/${encodeURIComponent(name)}`
    }),

  /**
   * Get all members of a guild
   * @param guildId The guild ID
   */
  getGuildMembers: (guildId: number) =>
    apiRequest<GuildMember[]>({
      method: 'GET',
      url: `/guilds/${guildId}/members`
    }),

  /**
   * Search for a guild
   * @param region Battle.net region
   * @param realm Server realm
   * @param name Guild name
   */
  searchGuild: (region: string, realm: string, name: string) =>
    apiRequest<Guild>({
      method: 'GET',
      url: `/guilds/search?region=${region}&realm=${encodeURIComponent(realm)}&name=${encodeURIComponent(name)}`
    }),

  /**
   * Subscribe to a guild
   * @param guildId The guild ID
   */
  subscribeToGuild: (guildId: number) =>
    apiRequest<{ message: string }>({
      method: 'POST',
      url: `/guilds/${guildId}/subscribe`
    }),

  /**
   * Unsubscribe from a guild
   * @param guildId The guild ID
   */
  unsubscribeFromGuild: (guildId: number) =>
    apiRequest<{ message: string }>({
      method: 'DELETE',
      url: `/guilds/${guildId}/subscribe`
    }),

  /**
   * Update guild settings
   * @param guildId The guild ID
   * @param settings Guild settings to update
   */
  updateGuildSettings: (guildId: number, settings: Partial<Guild>) =>
    apiRequest<Guild>({
      method: 'PATCH',
      url: `/guilds/${guildId}/settings`,
      data: settings
    }),

  /**
   * Synchronize guild members from Battle.net
   * @param guildId The guild ID
   */
  syncGuildMembers: (guildId: number) =>
    apiRequest<{ message: string }>({
      method: 'POST',
      url: `/guilds/${guildId}/sync`
    }),
  
  /**
   * Get characters for a guild
   * @param guildId The guild ID
   */
  getCharacters: (guildId: number) =>
    apiRequest<Character[]>({
      method: 'GET',
      url: `/guilds/${guildId}/characters`
    })
};