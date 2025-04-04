import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { ApiError, ApiResponse } from '@shared/types';

// Use environment variable with fallback
const API_URL = import.meta.env.VITE_API_URL || '/api';

// Create Axios client with proper configuration
export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Axios response interceptor for error handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response, // Add type for clarity
  async (error: AxiosError<any>) => { // Explicitly type error as AxiosError
    // Define expected error data structure for better type safety
    interface ErrorData {
      error?: {
        message?: string;
        details?: { expired?: boolean; [key: string]: any }; // Allow other details
      };
      message?: string; // Allow top-level message if present
    }
    // Assert the type of error.response.data
    const errorData = error.response?.data as ErrorData | undefined;

    console.error('API Error:', errorData?.error?.message || errorData?.message || error.message);

    // If token expired, attempt refresh
    // Also check if error.config exists before retrying the request
    if (error.response?.status === 401 && errorData?.error?.details?.expired && error.config) {
      try {
        // Attempt token refresh
        await axios.get(`${API_URL}/auth/refresh`, { withCredentials: true });
        // Retry the original request, asserting config type for safety
        return apiClient(error.config as AxiosRequestConfig);
      } catch (refreshError: any) { // Type refreshError for better handling
        console.error('Token refresh failed:', refreshError?.message || refreshError);
        // Consider redirecting to login or showing a notification here
        // e.g., window.location.href = '/login';
      }
    }

    // Reject with the original error if refresh fails or is not applicable
    return Promise.reject(error);
  }
);

// Generic API request function
export const apiRequest = async <T>(config: AxiosRequestConfig): Promise<ApiResponse<T>> => {
  try {
    const response: AxiosResponse = await apiClient(config);
    
    // Handle API response format
    if (response.data.success !== undefined) {
      // Server returns our ApiResponse format
      return response.data as ApiResponse<T>;
    } else {
      // Transform into our standard API response format
      return {
        success: true,
        data: response.data
      };
    }
  } catch (error) {
    const apiError: ApiError = {
      status: error instanceof AxiosError ? (error.response?.status || 500) : 500,
      message: error instanceof AxiosError ?
        (error.response?.data?.error?.message ||
         error.response?.data?.message ||
         error.message) :
        'Unknown error occurred',
      details: error instanceof AxiosError ? error.response?.data?.error?.details : undefined
    };
    
    return {
      success: false,
      error: apiError
    };
  }
};

// Add a timeout utility
export const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  let timeoutId: number; // Use 'number' for browser setTimeout return type
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  
  return Promise.race([
    promise,
    timeoutPromise
  ]).finally(() => {
    clearTimeout(timeoutId);
  }) as Promise<T>;
};