import { Character } from '../../../shared/types/index';
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
  },

  /**
   * Get a specific character by ID
   */
  getCharacterById: async (characterId: number) => {
    return await apiRequest<Character>({
      method: 'GET',
      url: `/characters/${characterId}`
    });
  },

  /**
   * Get the main character for the current user
   */
  getMainCharacter: async () => {
    return await apiRequest<Character | null>({
      method: 'GET',
      url: '/characters/main'
    });
  },

  /**
   * Create a new character
   */
  createCharacter: async (characterData: Partial<Character>) => {
    return await apiRequest<Character>({
      method: 'POST',
      url: '/characters',
      data: characterData
    });
  },

  /**
   * Update an existing character
   */
  updateCharacter: async (characterId: number, characterData: Partial<Character>) => {
    return await apiRequest<Character>({
      method: 'PUT',
      url: `/characters/${characterId}`,
      data: characterData
    });
  },

  /**
   * Delete a character
   */
  deleteCharacter: async (characterId: number) => {
    return await apiRequest<{ message: string }>({
      method: 'DELETE',
      url: `/characters/${characterId}`
    });
  },

  /**
   * Set a character as the main character
   */
  setMainCharacter: async (characterId: number) => {
    return await apiRequest<Character>({
      method: 'POST',
      url: `/characters/${characterId}/main`
    });
  }
};

export default characterService;