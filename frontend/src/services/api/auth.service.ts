import { RefreshResponse } from '../../../../shared/types/auth';
import { User, UserRole } from '../../../../shared/types/user';
import { apiRequest } from './core';

interface LoginResponse {
  authUrl: string;
}

interface LogoutResponse {
  message: string;
}



/**
 * Response for verifying Discord link
 */
export interface VerifyDiscordLinkResponse {
  message: string;
}

export const authService = {
  /**
   * Initiate login with Battle.net OAuth
   * @param region Battle.net region (eu, us, kr, tw)
   * @param syncCharacters Whether to sync characters after login
   */
  login: (region: string, syncCharacters: boolean = false) =>
    apiRequest<LoginResponse>({
      method: 'GET',
      url: `/auth/login?region=${region}${syncCharacters ? '&sync=true' : ''}`
    }),
  
  /**
   * Get current authenticated user
   */
  getCurrentUser: () =>
    apiRequest<User>({
      method: 'GET',
      url: '/auth/me'
    }),
  
  /**
   * Logout the current user
   */
  logout: () =>
    apiRequest<LogoutResponse>({
      method: 'GET',
      url: '/auth/logout'
    }),
  
  /**
   * Refresh the authentication token
   */
  refreshToken: () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      return Promise.reject(new Error('No refresh token found in localStorage'));
    }
    return apiRequest<RefreshResponse>({
      method: 'POST',
      url: '/auth/refresh',
      data: { refreshToken }
    });
  },
    
  /**
   * Update a user's role (admin only)
   * @param userId User ID to update
   * @param role New role to assign
   */
  updateUserRole: (userId: number, role: UserRole) =>
    apiRequest<User>({
      method: 'PUT',
      url: '/auth/role',
      data: { userId, role }
    }),

  /**
   * Verify Discord link using a token
   * @param token Discord verification token
   */
  verifyDiscordLink: async (token: string) =>
    apiRequest<VerifyDiscordLinkResponse>({
      method: 'GET',
      url: `/auth/discord-link?token=${encodeURIComponent(token)}`
    })
};