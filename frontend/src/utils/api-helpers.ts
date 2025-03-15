import { ApiError, ApiResponse } from '../../../shared/types/index';

/**
 * Helper for handling API responses with a success callback
 * @param response API response
 * @param onSuccess Success callback
 * @param onError Optional error callback
 */
export function handleApiResponse<T>(
  response: ApiResponse<T>,
  onSuccess: (data: T) => void,
  onError?: (error: ApiError) => void
): void {
  if (response.success && response.data) {
    onSuccess(response.data);
  } else if (response.error && onError) {
    onError(response.error);
  }
}

/**
 * Format an API error for display
 * @param error API error object
 * @returns Formatted error message
 */
export function formatApiError(error: ApiError | null): string {
  if (!error) {
    return 'An unknown error occurred';
  }
  
  if (error.status === 401) {
    return 'Authentication required. Please log in again.';
  }
  
  if (error.status === 403) {
    return 'You do not have permission to perform this action.';
  }
  
  if (error.status === 404) {
    return 'The requested resource was not found.';
  }
  
  if (error.status >= 500) {
    return 'A server error occurred. Please try again later.';
  }
  
  return error.message || 'An error occurred';
}

/**
 * Create a consistent error message object
 * @param message Error message
 * @param status HTTP status code
 * @param details Optional error details
 * @returns Standardized API error object
 */
export function createApiError(
  message: string,
  status: number = 500,
  details?: any
): ApiError {
  return {
    message,
    status,
    details
  };
}