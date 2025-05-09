import { useCallback, useEffect, useState } from 'react';
import { ApiError, ApiResponse } from '../../../shared/types/index';

interface UseApiOptions<T, P extends any[]> {
  // The API function to call
  apiFn: (...args: P) => Promise<ApiResponse<T>>;
  // Initial arguments for the API function
  args?: P;
  // Dependencies for re-fetching
  deps?: any[];
  // Whether to call the API function immediately
  immediate?: boolean;
  // Optional cache key for results
  cacheKey?: string;
  // Optional timeout in milliseconds
  timeout?: number;
}

interface UseApiResult<T, P extends any[]> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  execute: (...args: P) => Promise<ApiResponse<T>>;
  setData: (data: T | null) => void;
  reset: () => void;
}

// Simple in-memory cache for API results
const apiCache: Record<string, {data: any, timestamp: number}> = {};
const CACHE_TTL = 60000; // 1 minute cache TTL

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

  // Check cache on initial load if cacheKey is provided
  useEffect(() => {
    if (options.cacheKey && apiCache[options.cacheKey]) {
      const cachedData = apiCache[options.cacheKey];
      const now = Date.now();
      
      // Use cached data if it's not expired
      if (now - cachedData.timestamp < CACHE_TTL) {
        setData(cachedData.data);
        setLoading(false);
      }
    }
  }, [options.cacheKey]);

  const execute = useCallback(async (...args: P): Promise<ApiResponse<T>> => {
    try {
      setLoading(true);
      setError(null);

      // Use the provided arguments or fall back to the initial args
      // This ensures we always have a valid array of arguments even if none were provided
      const finalArgs = args.length > 0 ? args : (options.args || [] as unknown as P);
      
      // Call the API function with the arguments
      let apiPromise = options.apiFn(...finalArgs);
      
      // Apply timeout if specified
      if (options.timeout) {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Request timed out after ${options.timeout}ms`));
          }, options.timeout);
        });
        
        apiPromise = Promise.race([apiPromise, timeoutPromise]) as Promise<ApiResponse<T>>;
      }
      
      const response = await apiPromise;
      
      if (response.success && response.data) {
        setData(response.data);
        
        // Cache successful response if cacheKey is provided
        if (options.cacheKey) {
          apiCache[options.cacheKey] = {
            data: response.data,
            timestamp: Date.now()
          };
        }
      } else if (response.error) {
        setError(response.error);
      }
      
      return response;
    } catch (err) {
      console.error('Error in useApi hook:', err);
      
      const apiError: ApiError = {
        status: 500,
        message: err instanceof Error ? err.message : 'Unknown error occurred',
        code: 'API_ERROR'
      };
      
      setError(apiError);
      
      return {
        success: false,
        error: apiError
      };
    } finally {
      setLoading(false);
    }
  }, [options.apiFn, options.cacheKey, options.timeout]);

  // Reset function to clear data and errors
  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
    
    // Clear cache for this request if cacheKey is provided
    if (options.cacheKey) {
      delete apiCache[options.cacheKey];
    }
  }, [options.cacheKey]);

  // Call the API function on mount if immediate is true
  useEffect(() => {
    if (options.immediate !== false) {
      // If args are provided use them, otherwise call without args
      if (options.args) {
        execute(...options.args);
      } else {
        execute();
      }
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