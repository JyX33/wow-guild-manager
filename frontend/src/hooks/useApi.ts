import { useState, useEffect, useCallback } from 'react';
import axios, { AxiosRequestConfig, AxiosError } from 'axios';
import { ApiError, ApiResponse } from '../types';

interface UseApiOptions<T> {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
  deps?: any[];
  immediate?: boolean;
}

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  execute: () => Promise<ApiResponse<T>>;
}

export function useApi<T>(options: UseApiOptions<T>): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(options.immediate !== false);
  const [error, setError] = useState<ApiError | null>(null);

  const execute = useCallback(async (): Promise<ApiResponse<T>> => {
    try {
      setLoading(true);
      setError(null);

      const config: AxiosRequestConfig = {
        url: options.url,
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
      };

      if (options.body && (options.method === 'POST' || options.method === 'PUT')) {
        config.data = options.body;
      }

      const response = await axios(config);
      const responseData = response.data;
      
      setData(responseData);
      
      return {
        success: true,
        data: responseData
      };
    } catch (err) {
      const axiosError = err as AxiosError;
      const apiError: ApiError = {
        status: axiosError.response?.status || 500,
        message: axiosError.response?.data?.message || axiosError.message || 'Unknown error'
      };
      
      setError(apiError);
      
      return {
        success: false,
        error: apiError
      };
    } finally {
      setLoading(false);
    }
  }, [options.url, options.method, options.body, JSON.stringify(options.headers)]);

  useEffect(() => {
    if (options.immediate !== false) {
      execute();
    }
  }, options.deps || [execute]);

  return { data, loading, error, execute };
}