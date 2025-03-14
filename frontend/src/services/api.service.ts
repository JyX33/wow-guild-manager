import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiError, ApiResponse, Event, EventSubscription, Guild, User, UserRole } from '../types';

const API_URL = import.meta.env.VITE_API_URL || '/api';

// Create Axios client
const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Response interceptor for API calls
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const message = 
      error.response?.data?.error?.message || 
      error.response?.data?.message || 
      error.message || 
      'Unknown error occurred';
    
    // Don't log auth/me 401 errors to avoid console spam
    const isAuthMe401 = error.config?.url === '/auth/me' && error.response?.status === 401;
    if (!isAuthMe401) {
      console.error('API Error:', message);
    }
    
    // Handle authentication errors
    if (error.response?.status === 401) {
      // Don't redirect to login for /auth/me request failures
      // This is expected behavior when not logged in
      const isAuthMeRequest = error.config?.url === '/auth/me';
      
      // Check if token expired
      if (error.response.data?.error?.details?.expired) {
        try {
          // Attempt to refresh the token
          const refreshResponse = await axios.get(`${API_URL}/auth/refresh`, {
            withCredentials: true
          });
          
          if (refreshResponse.data.success) {
            // Retry the original request
            const originalRequest = error.config;
            if (originalRequest) {
              return apiClient(originalRequest);
            }
          }
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          // If refresh fails, only redirect to login for non-auth/me requests
          if (!isAuthMeRequest) {
            window.location.href = '/login';
          }
        }
      } else if (!isAuthMeRequest) {
        // If not expired but still unauthorized, redirect to login
        // but only for non-auth/me requests
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// Generic API request function
const apiRequest = async <T>(config: AxiosRequestConfig): Promise<ApiResponse<T>> => {
  try {
    const response: AxiosResponse = await apiClient(config);
    
    // Handle API response format
    if (response.data.success !== undefined) {
      // Server returns our ApiResponse format
      return response.data as ApiResponse<T>;
    } else {
      // Transform into our standard API response format
      return {
        success: true,
        data: response.data
      };
    }
  } catch (error) {
    const apiError: ApiError = {
      status: error instanceof AxiosError ? (error.response?.status || 500) : 500,
      message: error instanceof AxiosError ? 
        (error.response?.data?.error?.message || 
         error.response?.data?.message || 
         error.message) : 
        'Unknown error occurred',
      details: error instanceof AxiosError ? error.response?.data?.error?.details : undefined
    };
    
    return {
      success: false,
      error: apiError
    };
  }
};

// Authentication API
export const authApi = {
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

// Guild API
export const guildApi = {
  getGuildByName: (region: string, realm: string, name: string) => 
    apiRequest<Guild>({
      method: 'GET',
      url: `/guilds/${region}/${realm}/${name}`
    }),
  
  getGuildById: (guildId: number) =>
    apiRequest<Guild>({
      method: 'GET',
      url: `/guilds/id/${guildId}`
    }),
  
  getGuildMembers: (guildId: number) => 
    apiRequest<Array<any>>({
      method: 'GET',
      url: `/guilds/${guildId}/members`
    })
};

// Event API
export const eventApi = {
  getGuildEvents: (guildId: number) => 
    apiRequest<Event[]>({
      method: 'GET',
      url: `/events/guild/${guildId}`
    }),
  
  getEventById: (eventId: number) =>
    apiRequest<Event>({
      method: 'GET',
      url: `/events/${eventId}`
    }),
    
  createEvent: (eventData: Partial<Event>) => 
    apiRequest<Event>({
      method: 'POST',
      url: '/events',
      data: eventData
    }),
  
  updateEvent: (eventId: number, eventData: Partial<Event>) => 
    apiRequest<Event>({
      method: 'PUT',
      url: `/events/${eventId}`,
      data: eventData
    }),
  
  deleteEvent: (eventId: number) => 
    apiRequest<{ message: string }>({
      method: 'DELETE',
      url: `/events/${eventId}`
    }),
  
  subscribeToEvent: (eventId: number, subscriptionData: Partial<EventSubscription>) => 
    apiRequest<EventSubscription>({
      method: 'POST',
      url: `/events/${eventId}/subscribe`,
      data: subscriptionData
    }),
  
  updateSubscription: (eventId: number, subscriptionData: Partial<EventSubscription>) => 
    apiRequest<EventSubscription>({
      method: 'PUT',
      url: `/events/${eventId}/subscribe`,
      data: subscriptionData
    }),
  
  getEventSubscribers: (eventId: number) => 
    apiRequest<EventSubscription[]>({
      method: 'GET',
      url: `/events/${eventId}/subscribers`
    })
};