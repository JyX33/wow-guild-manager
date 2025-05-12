/**
 * Standard API response format types used across the application
 */

import { ErrorCode, ErrorDetail } from '../utils/errors';

/**
 * Standard API response format
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: ApiError;
}

/**
 * Error types and structure with stronger typing
 */
export interface ApiError {
  status: number;
  message: string;
  details?: ErrorDetail;
  code: ErrorCode;
}

/**
 * Paginated response with metadata
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

/**
 * Battle.net API specific error
 */
export interface BattleNetApiError {
  code: number;
  type: string;
  detail: string;
}