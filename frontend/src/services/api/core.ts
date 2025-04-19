import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { ApiError, ApiResponse } from '@shared/types';

// Use environment variable with fallback
const API_URL = import.meta.env.VITE_API_URL || '/api';

// Function to get the access token from local storage
const getAccessToken = (): string | null => {
  return localStorage.getItem('accessToken');
};

// Create Axios client with proper configuration
export const apiClient = axios.create({
  baseURL: API_URL,
  // withCredentials: true, // Remove if not needed for CORS after switching to JWT
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add a request interceptor to include the JWT
apiClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

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
    // Check for 401 and if it's not the refresh token endpoint itself
    if (error.response?.status === 401 && error.config && !error.config.url?.includes('/auth/refresh')) {
      try {
        // Attempt token refresh
        // Note: The refresh token call itself should NOT have the interceptor adding the expired access token
        // This is handled by making the refresh call directly with axios, not apiClient
        const refreshResponse = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken: localStorage.getItem('refreshToken')
        });

        if (refreshResponse.data?.success && refreshResponse.data?.data?.accessToken) {
          // Store the new access token
          localStorage.setItem('accessToken', refreshResponse.data.data.accessToken);

          // Retry the original request with the new token
          const originalRequestConfig = error.config as AxiosRequestConfig;

          // Create a new headers object by copying the old ones and adding/updating Authorization
          // Explicitly cast headers to a type that the AxiosHeaders constructor can accept
          const newHeaders = new axios.AxiosHeaders(originalRequestConfig.headers as Record<string, string> | undefined);
          newHeaders.set('Authorization', `Bearer ${refreshResponse.data.data.accessToken}`);

          // Create a new config object with the updated headers
          const newConfig: AxiosRequestConfig = {
            ...originalRequestConfig,
            headers: newHeaders,
          };

          // Retry the original request
          return apiClient(newConfig);
        } else {
          // Refresh failed, clear tokens and redirect to login
          console.error('Token refresh failed:', refreshResponse.data?.error?.message || 'Unknown refresh error');
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          // Redirect to login - consider using react-router-dom's navigate if in a component context
          // For a global interceptor, a simple window.location.href might be necessary,
          // or dispatching a global event/action that a component listens to.
          // window.location.href = '/login'; // Example redirect
        }
      } catch (refreshError: any) { // Type refreshError for better handling
        console.error('Token refresh failed:', refreshError?.message || refreshError);
        // Clear tokens and redirect to login on refresh error
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        // window.location.href = '/login'; // Example redirect
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

export type { ApiResponse };
