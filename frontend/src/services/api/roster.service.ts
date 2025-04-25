// frontend/src/services/api/roster.service.ts
import { apiClient } from './core';
import type {
  ApiResponse,
  Roster,
  RosterMember,
  RosterMemberAddition,
} from '../../../../shared/types/api';

export const rosterService = {
  /**
   * Fetches all rosters for a specific guild.
   * @param guildId - The ID of the guild.
   * @returns A promise resolving to the API response containing an array of rosters.
   */
  getRostersByGuild: (guildId: number): Promise<ApiResponse<Roster[]>> => {
    return apiClient.get(`/guilds/${guildId}/rosters`);
  },

  /**
   * Creates a new roster for a specific guild.
   * @param guildId - The ID of the guild.
   * @param name - The name of the new roster.
   * @returns A promise resolving to the API response containing the newly created roster.
   */
  createRoster: (guildId: number, name: string): Promise<ApiResponse<Roster>> => {
    return apiClient.post(`/guilds/${guildId}/rosters`, { name });
  },

  /**
   * Fetches the details and members of a specific roster.
   * @param rosterId - The ID of the roster.
   * @returns A promise resolving to the API response containing the roster details and its members.
   */
  getRosterDetails: (rosterId: number): Promise<ApiResponse<{ roster: Roster, members: RosterMember[] }>> => {
    return apiClient.get(`/rosters/${rosterId}`);
  },

  /**
   * Updates the name of a specific roster.
   * @param rosterId - The ID of the roster to update.
   * @param name - The new name for the roster.
   * @returns A promise resolving to the API response containing the updated roster.
   */
  updateRoster: (rosterId: number, name: string): Promise<ApiResponse<Roster>> => {
    return apiClient.put(`/rosters/${rosterId}`, { name });
  },

  /**
   * Deletes a specific roster.
   * @param rosterId - The ID of the roster to delete.
   * @returns A promise resolving to the API response indicating success or failure.
   */
  deleteRoster: (rosterId: number): Promise<ApiResponse<void>> => {
    // Assuming backend returns void on success for DELETE
    return apiClient.delete(`/rosters/${rosterId}`);
  },

  /**
   * Adds multiple members to a specific roster.
   * @param rosterId - The ID of the roster.
   * @param additions - An array of members to add, including character ID and optional role.
   * @returns A promise resolving to the API response containing the newly added roster members.
   */
  addRosterMembers: (rosterId: number, additions: RosterMemberAddition[]): Promise<ApiResponse<RosterMember[]>> => {
    return apiClient.post(`/rosters/${rosterId}/members`, { additions });
  },

  /**
   * Updates the role of a specific member within a roster.
   * @param rosterId - The ID of the roster.
   * @param characterId - The ID of the character (member) to update.
   * @param role - The new role for the member (or null to remove the role).
   * @returns A promise resolving to the API response containing the updated roster member.
   */
  updateRosterMemberRole: (rosterId: number, characterId: number, role: string | null): Promise<ApiResponse<RosterMember>> => {
    return apiClient.put(`/rosters/${rosterId}/members/${characterId}`, { role });
  },

  /**
   * Removes a specific member from a roster.
   * @param rosterId - The ID of the roster.
   * @param characterId - The ID of the character (member) to remove.
   * @returns A promise resolving to the API response indicating success or failure.
   */
  removeRosterMember: (rosterId: number, characterId: number): Promise<ApiResponse<void>> => {
    // Assuming backend returns void on success for DELETE
    return apiClient.delete(`/rosters/${rosterId}/members/${characterId}`);
  },
};