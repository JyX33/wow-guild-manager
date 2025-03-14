// Type definitions for the frontend
import { ReactNode } from 'react';

// User types
export interface User {
  id: number;
  battle_net_id: string;
  battletag: string;
  access_token?: string;
  token_expires_at?: string;
  created_at?: string;
  updated_at?: string;
}

// Guild types
export interface Guild {
  id: number;
  name: string;
  realm: string;
  region: string;
  last_updated?: string;
  guild_data?: any; // This will be replaced with a proper type in the future
}

// Event types
export interface Event {
  id: number;
  title: string;
  description: string;
  event_type: 'Raid' | 'Dungeon' | 'Special';
  start_time: string;
  end_time: string;
  created_by: number;
  guild_id: number;
  max_participants: number;
  event_details?: any; // This will be replaced with a proper type in the future
}

export interface EventSubscription {
  id: number;
  event_id: number;
  user_id: number;
  status: 'Confirmed' | 'Tentative' | 'Declined';
  character_name: string;
  character_class: string;
  character_role: 'Tank' | 'Healer' | 'DPS';
  created_at?: string;
  battletag?: string;
}

// Context types
export interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (region: string) => void;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: ApiError;
}

export interface ApiError {
  status: number;
  message: string;
  details?: any;
}

// Component prop types
export interface ProtectedRouteProps {
  children: ReactNode;
}

export interface EventFormProps {
  guildId: number;
  eventId?: number;
  initialData?: Partial<Event>;
  onSuccess?: (event: Event) => void;
}

export interface GuildSelectorProps {
  onSelect: (guild: Guild) => void;
  selectedGuildId?: number;
}