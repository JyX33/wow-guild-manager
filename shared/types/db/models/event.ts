/**
 * Database model types for Event entities
 */

import { EventType } from '../../enums/event';

/**
 * Database model for Event
 */
export interface DbEvent {
  id: number;
  title: string;
  description: string;
  event_type: EventType;
  start_time: string;
  end_time: string;
  created_by: number;
  guild_id: number;
  max_participants: number;
  event_details?: unknown; // Will contain EventDetails serialized as JSON
  discord_thread_id?: string | null;
  discord_message_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Database model for Event Subscription
 */
export interface DbEventSubscription {
  id: number;
  event_id: number;
  user_id: number;
  character_id: number;
  status: string; // Enum value as string: 'Confirmed', 'Tentative', 'Declined'
  notes?: string;
  created_at?: string;
  updated_at?: string;
}