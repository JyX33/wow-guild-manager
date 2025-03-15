import { Guild, Character, GuildMember } from '../../types';
import { apiRequest } from './core';

export const guildService = {
  getGuilds: () =>
    apiRequest<Guild[]>({
      method: 'GET',
      url: '/guilds'
    }),

  getGuildById: (guildId: number) =>
    apiRequest<Guild>({
      method: 'GET',
      url: `/guilds/id/${guildId}`
    }),

  getGuildByName: (region: string, realm: string, name: string) =>
    apiRequest<Guild>({
      method: 'GET',
      url: `/guilds/${region}/${encodeURIComponent(realm)}/${encodeURIComponent(name)}`
    }),

  getGuildMembers: (guildId: number) =>
    apiRequest<GuildMember[]>({
      method: 'GET',
      url: `/guilds/${guildId}/members`
    }),

  searchGuild: (region: string, realm: string, name: string) =>
    apiRequest<Guild>({
      method: 'GET',
      url: `/guilds/search?region=${region}&realm=${realm}&name=${encodeURIComponent(name)}`
    }),

  subscribeToGuild: (guildId: number) =>
    apiRequest<{ message: string }>({
      method: 'POST',
      url: `/guilds/${guildId}/subscribe`
    }),

  unsubscribeFromGuild: (guildId: number) =>
    apiRequest<{ message: string }>({
      method: 'DELETE',
      url: `/guilds/${guildId}/subscribe`
    }),

  updateGuildSettings: (guildId: number, settings: Partial<Guild>) =>
    apiRequest<Guild>({
      method: 'PATCH',
      url: `/guilds/${guildId}/settings`,
      data: settings
    }),

  syncGuildMembers: (guildId: number) =>
    apiRequest<{ message: string }>({
      method: 'POST',
      url: `/guilds/${guildId}/sync`
    }),
  
  getCharacters: (guildId: number) =>
    apiRequest<Character[]>({
      method: 'GET',
      url: `/guilds/${guildId}/characters`
    })
};