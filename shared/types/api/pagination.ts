/**
 * Pagination related types for API requests and responses
 */

/**
 * Base pagination parameters
 */
export interface BasePaginationParams {
  page?: number;
  limit?: number;
  order?: 'asc' | 'desc';
}

/**
 * Extended pagination with string sort
 */
export interface PaginationParams extends BasePaginationParams {
  sort?: string;
}

/**
 * Filter and query types
 */
export interface QueryFilters {
  [key: string]: string | number | boolean | Array<string | number> | undefined;
}

/**
 * Sort options 
 */
export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Search parameters with filters and complex sorting
 */
export interface SearchParams extends BasePaginationParams {
  query?: string;
  filters?: QueryFilters;
  sort?: SortOptions;
}