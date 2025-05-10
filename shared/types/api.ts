// Import error types from separate file
import { ErrorCode, ErrorDetail } from './error';

// Standard API response format
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: ApiError;
}

// Error types and structure with stronger typing
export interface ApiError {
  status: number;
  message: string;
  details?: ErrorDetail;
  code: ErrorCode;
}

// Base pagination types
export interface BasePaginationParams {
  page?: number;
  limit?: number;
  order?: 'asc' | 'desc';
}

// Extended pagination with string sort
export interface PaginationParams extends BasePaginationParams {
  sort?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

// Battle.net API specific types
export interface BattleNetApiError {
  code: number;
  type: string;
  detail: string;
}

// Filter and query types
export interface QueryFilters {
  [key: string]: string | number | boolean | Array<string | number> | undefined;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

// Search types (with complex sort)
export interface SearchParams extends BasePaginationParams {
  query?: string;
  filters?: QueryFilters;
  sort?: SortOptions;
}

// HTTP Methods type
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

// API Request configuration
export interface ApiRequestConfig {
  method: HttpMethod;
  path: string;
  data?: Record<string, unknown>;
  params?: QueryFilters;
  headers?: Record<string, string>;
  timeout?: number;
}
/**
 * Represents a roster within a guild.
 */
export interface Roster {
  id: number;          // Unique identifier for the roster
  guildId: number;     // Identifier of the guild this roster belongs to
  name: string;        // User-defined name for the roster (e.g., "Mythic Raid Team", "PvP Group Alpha")
  createdAt: string;   // ISO 8601 date string when the roster was created
  updatedAt: string;   // ISO 8601 date string when the roster was last updated
}

/**
 * Represents a member within a specific roster, including relevant character details.
 * This is typically the structure returned by API endpoints fetching roster members.
 */
export interface RosterMember {
  characterId: number; // Unique identifier for the character
  name: string;        // Character's name
  rank: string;        // Character's current guild rank name
  class: string;       // Character's class (e.g., 'Warrior', 'Mage', 'Priest')
  role: string | null; // Role assigned specifically for this roster (e.g., 'Tank', 'Healer', 'DPS', 'Bench'), or null if unassigned.
}

/**
 * Union type defining the ways members can be specified for addition to a roster via the API.
 */
export type RosterMemberAddition =
  | { type: 'character'; characterId: number; role?: string | null } // Add a single character by their ID
  | { type: 'rank'; rankId: number; role?: string | null };          // Add all characters belonging to a specific guild rank ID