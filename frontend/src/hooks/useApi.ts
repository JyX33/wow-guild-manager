import { useState, useEffect, useCallback } from 'react';
import { ApiError, ApiResponse } from '../types';

interface UseApiOptions<T, P extends any[]> {
  // The API function to call
  apiFn: (...args: P) => Promise<ApiResponse<T>>;
  // Initial arguments for the API function
  args?: P;
  // Dependencies for re-fetching
  deps?: any[];
  // Whether to call the API function immediately
  immediate?: boolean;
}

interface UseApiResult<T, P extends any[]> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  execute: (...args: P) => Promise<ApiResponse<T>>;
  setData: (data: T | null) => void;
  reset: () => void;
}

/**
 * Custom hook for making API requests with built-in loading and error states
 * @param options Configuration options for the API hook
 */
export function useApi<T, P extends any[] = any[]>(
  options: UseApiOptions<T, P>
): UseApiResult<T, P> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(options.immediate !== false);
  const [error, setError] = useState<ApiError | null>(null);

  const execute = useCallback(async (...args: P): Promise<ApiResponse<T>> => {
    try {
      setLoading(true);
      setError(null);

      // Use the provided arguments or fall back to the initial args
      const finalArgs = args.length > 0 ? args : options.args || [] as unknown as P;
      
      // Call the API function with the arguments
      const response = await options.apiFn(...finalArgs);
      
      if (response.success && response.data) {
        setData(response.data);
      } else if (response.error) {
        setError(response.error);
      }
      
      return response;
    } catch (err) {
      console.error('Error in useApi hook:', err);
      
      const apiError: ApiError = {
        status: 500,
        message: err instanceof Error ? err.message : 'Unknown error occurred'
      };
      
      setError(apiError);
      
      return {
        success: false,
        error: apiError
      };
    } finally {
      setLoading(false);
    }
  }, [options.apiFn]);

  // Reset function to clear data and errors
  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  // Call the API function on mount if immediate is true
  useEffect(() => {
    if (options.immediate !== false && options.args) {
      execute(...options.args);
    }
  }, options.deps || []);

  return { 
    data, 
    loading, 
    error, 
    execute, 
    setData,
    reset
  };
}