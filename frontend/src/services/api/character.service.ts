import { Character } from '@shared/types';
import { apiRequest } from './core';

export const characterService = {
  /**
   * Get all characters for the current user
   */
  getUserCharacters: async () => {
    return await apiRequest<Character[]>({
      method: 'GET',
      url: '/characters'
    });
  }
};

export default characterService;