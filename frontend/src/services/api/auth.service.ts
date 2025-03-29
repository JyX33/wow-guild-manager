import { User, UserRole } from '../../../../shared/types/user';
import { apiRequest } from './core';

interface LoginResponse {
  authUrl: string;
}

interface LogoutResponse {
  message: string;
}

interface RefreshResponse {
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
  refreshToken: () =>
    apiRequest<RefreshResponse>({
      method: 'GET',
      url: '/auth/refresh'
    }),
    
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
};