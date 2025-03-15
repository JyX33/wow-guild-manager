// Standard API response format
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: ApiError;
}

// Error types and structure
export interface ApiError {
  status: number;
  message: string;
  details?: any;
  code?: string;
}

export enum ErrorCode {
  VALIDATION_ERROR = 'validation_error',
  AUTHENTICATION_ERROR = 'authentication_error',
  AUTHORIZATION_ERROR = 'authorization_error',
  NOT_FOUND = 'not_found',
  CONFLICT = 'conflict',
  INTERNAL_ERROR = 'internal_error',
  EXTERNAL_API_ERROR = 'external_api_error',
  RATE_LIMIT = 'rate_limit'
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
  data?: any;
  params?: QueryFilters;
  headers?: Record<string, string>;
  timeout?: number;
}