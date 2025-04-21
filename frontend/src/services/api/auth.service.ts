import { RefreshResponse } from '../../../../shared/types/auth';
import { User, UserRole } from '../../../../shared/types/user';
import { apiRequest } from './core';

interface LoginResponse {
  authUrl: string;
}

interface LogoutResponse {
  message: string;
}

interface DiscordConnectResponse {
  redirectUrl: string;
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
    })
  ,

  /**
   * Disconnect the user's Discord account
   */
  disconnectDiscord: () =>
    apiRequest<{ success: boolean; message?: string }>({
      method: 'POST',
      url: '/auth/discord/disconnect'
    })
  ,
  /**
   * Initiates the Discord account connection flow.
   * Fetches the Discord OAuth URL from the backend and redirects the browser.
   */
  connectDiscord: async () => {
    try {
      const response = await apiRequest<DiscordConnectResponse>({
        method: 'GET',
        url: '/auth/discord'
      });
      // Access the data property from the apiRequest response
      if (response && response.data && response.data.redirectUrl) {
        window.location.href = response.data.redirectUrl;
      } else {
        console.error('Failed to get Discord redirect URL from backend response data:', response);
        // Optionally throw an error or handle UI feedback here
      }
    } catch (error) {
      console.error('Error initiating Discord connection:', error);
      // Optionally throw an error or handle UI feedback here
    }
  }
};