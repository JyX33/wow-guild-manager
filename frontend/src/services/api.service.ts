import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiError, ApiResponse, Event, EventSubscription, Guild, User } from '../types';

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
  (error: AxiosError) => {
    const message = 
      error.response?.data?.message || 
      error.message || 
      'Unknown error occurred';
    
    console.error('API Error:', message);
    
    // Handle authentication errors
    if (error.response?.status === 401) {
      // Redirect to login or refresh token logic could be added here
      console.log('Authentication error - redirecting to login');
    }
    
    return Promise.reject(error);
  }
);

// Generic API request function
const apiRequest = async <T>(config: AxiosRequestConfig): Promise<ApiResponse<T>> => {
  try {
    const response: AxiosResponse = await apiClient(config);
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    const apiError: ApiError = {
      status: error instanceof AxiosError ? (error.response?.status || 500) : 500,
      message: error instanceof AxiosError ? 
        (error.response?.data?.message || error.message) : 
        'Unknown error occurred'
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
    apiRequest<{ url: string }>({
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