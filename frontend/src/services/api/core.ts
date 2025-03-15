import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { ApiError, ApiResponse } from '../../../shared/types/index';

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
  (response) => response,
  async (error) => {
    console.error('API Error:', error.response?.data?.error || error.message);
    
    // If token expired, attempt refresh
    if (error.response?.status === 401 && error.response?.data?.error?.details?.expired) {
      try {
        // Attempt token refresh
        await axios.get(`${API_URL}/auth/refresh`, { withCredentials: true });
        // Retry the original request
        return apiClient(error.config);
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
      }
    }
    
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
  let timeoutId: NodeJS.Timeout;
  
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