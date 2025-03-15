import { CharacterRole } from './guild';

export type EventType = 'Raid' | 'Dungeon' | 'Special';
export type EventSubscriptionStatus = 'Confirmed' | 'Tentative' | 'Declined';

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
  event_details?: {
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
    [key: string]: any; // For additional custom fields
  };
}

export interface EventSubscription {
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

export interface EventParticipant extends EventSubscription {
  user_name: string;
  character_level: number;
  character_spec?: string;
  character_item_level?: number;
}

// Form-specific types
export interface EventFormValues {
  title: string;
  description: string;
  event_type: EventType;
  start_time: string;
  end_time: string;
  max_participants: number;
  guild_id: number;
  event_details?: Event['event_details'];
}