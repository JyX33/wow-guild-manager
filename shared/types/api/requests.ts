/**
 * Common API request structures
 */

import { BasePaginationParams, QueryFilters, SearchParams } from './pagination';

/**
 * Generic ID parameter type
 */
export interface IdParam {
  id: number | string;
}

/**
 * Generic slug parameter type
 */
export interface SlugParam {
  slug: string;
}

/**
 * Common filters for API requests
 */
export interface FilterParams {
  filters?: QueryFilters;
}

/**
 * Request context for error handling
 */
export interface RequestContext {
  method: string;
  path: string;
  params: Record<string, unknown>;
  query: Record<string, unknown>;
  ip?: string;
  userId?: number;
}