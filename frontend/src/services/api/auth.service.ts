import { User, UserRole } from '../../types';
import { apiRequest } from './core';

export const authService = {
  login: (region: string) =>
    apiRequest<{ authUrl: string }>({
      method: 'GET',
      url: `/auth/login?region=${region}`
    }),
  
  getCurrentUser: () =>
    apiRequest<User>({
      method: 'GET',
      url: '/auth/me'
    }),
  
  logout: () =>
    apiRequest<{ message: string }>({
      method: 'GET',
      url: '/auth/logout'
    }),
  
  refreshToken: () =>
    apiRequest<{ message: string }>({
      method: 'GET',
      url: '/auth/refresh'
    }),
    
  updateUserRole: (userId: number, role: UserRole) =>
    apiRequest<User>({
      method: 'PUT',
      url: '/auth/role',
      data: { userId, role }
    })
};