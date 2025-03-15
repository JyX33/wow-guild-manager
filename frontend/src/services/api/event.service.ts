import { Event, EventSubscription } from '../../../shared/types/index';
import { apiRequest } from './core';

export const eventService = {
  /**
   * Get all events for a guild
   * @param guildId The guild ID
   */
  getGuildEvents: (guildId: number) =>
    apiRequest<Event[]>({
      method: 'GET',
      url: `/events/guild/${guildId}`
    }),

  /**
   * Get a specific event by ID
   * @param eventId The event ID
   */
  getEventById: (eventId: number) =>
    apiRequest<Event>({
      method: 'GET',
      url: `/events/${eventId}`
    }),

  /**
   * Create a new event
   * @param eventData The event data
   */
  createEvent: (eventData: Partial<Event>) =>
    apiRequest<Event>({
      method: 'POST',
      url: '/events',
      data: eventData
    }),

  /**
   * Update an existing event
   * @param eventId The event ID
   * @param eventData The updated event data
   */
  updateEvent: (eventId: number, eventData: Partial<Event>) =>
    apiRequest<Event>({
      method: 'PUT',
      url: `/events/${eventId}`,
      data: eventData
    }),

  /**
   * Delete an event
   * @param eventId The event ID
   */
  deleteEvent: (eventId: number) =>
    apiRequest<{ message: string }>({
      method: 'DELETE',
      url: `/events/${eventId}`
    }),

  /**
   * Get all subscribers for an event
   * @param eventId The event ID
   */
  getEventSubscribers: (eventId: number) =>
    apiRequest<EventSubscription[]>({
      method: 'GET',
      url: `/events/${eventId}/subscribers`
    }),

  /**
   * Subscribe to an event
   * @param eventId The event ID
   * @param subscriptionData The subscription data
   */
  subscribeToEvent: (eventId: number, subscriptionData: Partial<EventSubscription>) =>
    apiRequest<EventSubscription>({
      method: 'POST',
      url: `/events/${eventId}/subscribe`,
      data: subscriptionData
    }),

  /**
   * Update an event subscription
   * @param eventId The event ID
   * @param subscriptionData The updated subscription data
   */
  updateSubscription: (eventId: number, subscriptionData: Partial<EventSubscription>) =>
    apiRequest<EventSubscription>({
      method: 'PUT',
      url: `/events/${eventId}/subscribe`,
      data: subscriptionData
    }),

  /**
   * Unsubscribe from an event
   * @param eventId The event ID
   */
  unsubscribeFromEvent: (eventId: number) =>
    apiRequest<{ message: string }>({
      method: 'DELETE',
      url: `/events/${eventId}/subscribe`
    })
};