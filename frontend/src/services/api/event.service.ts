import { Event, EventSubscription } from '../../types';
import { apiRequest } from './core';

export const eventService = {
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

  getEventSubscribers: (eventId: number) =>
    apiRequest<EventSubscription[]>({
      method: 'GET',
      url: `/events/${eventId}/subscribers`
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

  unsubscribeFromEvent: (eventId: number, subscriptionId: number) =>
    apiRequest<{ message: string }>({
      method: 'DELETE',
      url: `/events/${eventId}/subscribe`
    })
};