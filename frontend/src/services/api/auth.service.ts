import { RefreshResponse } from '../../../../shared/types/auth';
import { User, UserRole } from '../../../../shared/types/user';
import { apiRequest } from './core';

interface LoginResponse {
  authUrl: string;
}

interface LogoutResponse {
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
    * Connect the usr discord account
    *  
    */
  connectDiscord: () =>
    apiRequest<{ success: boolean; message?: string }>({  
      method: 'GET',
      url: '/auth/discord'
    }) 
};