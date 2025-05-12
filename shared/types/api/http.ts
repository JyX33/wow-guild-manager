/**
 * HTTP-related types for API requests
 */

import { QueryFilters } from './pagination';

/**
 * HTTP Methods type
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

/**
 * API Request configuration
 */
export interface ApiRequestConfig {
  method: HttpMethod;
  path: string;
  data?: Record<string, unknown>;
  params?: QueryFilters;
  headers?: Record<string, string>;
  timeout?: number;
}