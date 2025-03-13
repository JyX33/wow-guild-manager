import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true
});

export const authApi = {
  login: (region: string) => 
    apiClient.get(`/auth/login?region=${region}`),
  
  getCurrentUser: () => 
    apiClient.get('/auth/me'),
  
  logout: () => 
    apiClient.get('/auth/logout')
};

export const guildApi = {
  getGuildByName: (region: string, realm: string, name: string) => 
    apiClient.get(`/guilds/${region}/${realm}/${name}`),
  
  getGuildMembers: (guildId: number) => 
    apiClient.get(`/guilds/${guildId}/members`)
};

export const eventApi = {
  getGuildEvents: (guildId: number) => 
    apiClient.get(`/events/guild/${guildId}`),
  
  createEvent: (eventData: any) => 
    apiClient.post('/events', eventData),
  
  updateEvent: (eventId: number, eventData: any) => 
    apiClient.put(`/events/${eventId}`, eventData),
  
  deleteEvent: (eventId: number) => 
    apiClient.delete(`/events/${eventId}`),
  
  subscribeToEvent: (eventId: number, subscriptionData: any) => 
    apiClient.post(`/events/${eventId}/subscribe`, subscriptionData),
  
  updateSubscription: (eventId: number, subscriptionData: any) => 
    apiClient.put(`/events/${eventId}/subscribe`, subscriptionData),
  
  getEventSubscribers: (eventId: number) => 
    apiClient.get(`/events/${eventId}/subscribers`)
};