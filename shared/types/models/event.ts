/**
 * Event application model types
 */

import { EventType, EventSubscriptionStatus } from '../enums/event';
import { CharacterRole } from '../enums/guild';

/**
 * Event details structure
 */
export interface EventDetails {
  minimum_level?: number;
  required_roles?: {
    tanks?: number;
    healers?: number;
    dps?: number;
  };
  difficulty?: string;
  location?: string;
  requirements?: string[];
  loot_rules?: string;
  voice_chat?: {
    platform: string;
    channel?: string;
    url?: string;
  };
}

/**
 * Event model for application use
 */
export interface Event {
  id: number;
  title: string;
  description: string;
  event_type: EventType;
  start_time: string;
  end_time: string;
  created_by: number;
  guild_id: number;
  max_participants: number;
  event_details?: EventDetails;
  discord_thread_id?: string | null;
  discord_message_id?: string | null;
}

/**
 * Event subscription model
 */
export interface EventSubscription {
  id: number;
  event_id: number;
  user_id: number;
  character_id: number;
  status: EventSubscriptionStatus;
  created_at?: string;
  battletag?: string;
  notes?: string;
}

/**
 * Legacy event subscription model for backward compatibility
 */
export interface LegacyEventSubscription {
  id: number;
  event_id: number;
  user_id: number;
  status: EventSubscriptionStatus;
  character_name: string;
  character_class: string;
  character_role: CharacterRole;
  created_at?: string;
  battletag?: string;
  notes?: string;
}

/**
 * Event participant with extended information
 */
export interface EventParticipant extends EventSubscription {
  user_name: string;
  character_level: number;
  character_spec?: string;
  character_item_level?: number;
}

/**
 * Form values for event creation/editing
 */
export interface EventFormValues {
  title: string;
  description: string;
  event_type: EventType;
  start_time: string;
  end_time: string;
  max_participants: number;
  guild_id: number;
  event_details?: EventDetails;
}