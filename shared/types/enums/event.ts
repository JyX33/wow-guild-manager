/**
 * Event-related enumerations
 */

/**
 * Enum for different types of events
 */
export enum EventType {
  RAID = 'Raid',
  DUNGEON = 'Dungeon',
  SPECIAL = 'Special'
}

/**
 * Event subscription status options
 */
export type EventSubscriptionStatus = 'Confirmed' | 'Tentative' | 'Declined';