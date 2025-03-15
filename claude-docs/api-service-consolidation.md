# API Service Consolidation Implementation Plan

This document provides detailed instructions for consolidating and improving the API service architecture in the WoW Guild Manager application. This plan is designed for implementation by AI code tools like Claude Code.

## 1. API Service Duplication Resolution

### Current Issue

The codebase has duplication between monolithic API services and domain-specific API services:

```typescript
// Monolithic approach in frontend/src/services/api.service.ts
export const eventApi = {
  getGuildEvents: (guildId: number) =>
    apiRequest<Event[]>({
      method: 'GET',
      url: `/events/guild/${guildId}`
    }),
  // ...other methods
};

// Domain-specific approach in frontend/src/services/api/event.service.ts
export const eventService = {
  getGuildEvents: (guildId: number) =>
    apiRequest<Event[]>({
      method: 'GET',
      url: `/events/guild/${guildId}`
    }),
  // ...other methods
};
```

### Implementation Steps

1. **Consolidate to Domain-Specific Pattern**

   First, ensure the domain-specific pattern is complete and consistent.
   
   Find: `frontend/src/services/api/core.ts`
   
   Verify it has all needed functionality:

```typescript
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
```

2. **Update Auth Service**

   Find: `frontend/src/services/api/auth.service.ts`
   
   Standardize method signatures and update implementation:

```typescript
import { User, UserRole } from '../../../shared/types/index';
import { apiRequest } from './core';

interface LoginResponse {
  authUrl: string;
}

interface LogoutResponse {
  message: string;
}

interface RefreshResponse {
  message: string;
}

export const authService = {
  /**
   * Initiate login with Battle.net OAuth
   * @param region Battle.net region (eu, us, kr, tw)
   */
  login: (region: string) =>
    apiRequest<LoginResponse>({
      method: 'GET',
      url: `/auth/login?region=${region}`
    }),
  
  /**
   * Get current authenticated user
   */
  getCurrentUser: () =>
    apiRequest<User>({
      method: 'GET',
      url: '/auth/me'
    }),
  
  /**
   * Logout the current user
   */
  logout: () =>
    apiRequest<LogoutResponse>({
      method: 'GET',
      url: '/auth/logout'
    }),
  
  /**
   * Refresh the authentication token
   */
  refreshToken: () =>
    apiRequest<RefreshResponse>({
      method: 'GET',
      url: '/auth/refresh'
    }),
    
  /**
   * Update a user's role (admin only)
   * @param userId User ID to update
   * @param role New role to assign
   */
  updateUserRole: (userId: number, role: UserRole) =>
    apiRequest<User>({
      method: 'PUT',
      url: '/auth/role',
      data: { userId, role }
    })
};
```

3. **Update Guild Service**

   Find: `frontend/src/services/api/guild.service.ts`
   
   Standardize method signatures and update implementation:

```typescript
import { Guild, GuildMember, Character } from '../../../shared/types/index';
import { apiRequest } from './core';

export const guildService = {
  /**
   * Get a list of all guilds
   */
  getGuilds: () =>
    apiRequest<Guild[]>({
      method: 'GET',
      url: '/guilds'
    }),

  /**
   * Get a guild by ID
   * @param guildId The guild ID
   */
  getGuildById: (guildId: number) =>
    apiRequest<Guild>({
      method: 'GET',
      url: `/guilds/id/${guildId}`
    }),

  /**
   * Get a guild by name, realm, and region
   * @param region Battle.net region
   * @param realm Server realm
   * @param name Guild name
   */
  getGuildByName: (region: string, realm: string, name: string) =>
    apiRequest<Guild>({
      method: 'GET',
      url: `/guilds/${region}/${encodeURIComponent(realm)}/${encodeURIComponent(name)}`
    }),

  /**
   * Get all members of a guild
   * @param guildId The guild ID
   */
  getGuildMembers: (guildId: number) =>
    apiRequest<GuildMember[]>({
      method: 'GET',
      url: `/guilds/${guildId}/members`
    }),

  /**
   * Search for a guild
   * @param region Battle.net region
   * @param realm Server realm
   * @param name Guild name
   */
  searchGuild: (region: string, realm: string, name: string) =>
    apiRequest<Guild>({
      method: 'GET',
      url: `/guilds/search?region=${region}&realm=${encodeURIComponent(realm)}&name=${encodeURIComponent(name)}`
    }),

  /**
   * Subscribe to a guild
   * @param guildId The guild ID
   */
  subscribeToGuild: (guildId: number) =>
    apiRequest<{ message: string }>({
      method: 'POST',
      url: `/guilds/${guildId}/subscribe`
    }),

  /**
   * Unsubscribe from a guild
   * @param guildId The guild ID
   */
  unsubscribeFromGuild: (guildId: number) =>
    apiRequest<{ message: string }>({
      method: 'DELETE',
      url: `/guilds/${guildId}/subscribe`
    }),

  /**
   * Update guild settings
   * @param guildId The guild ID
   * @param settings Guild settings to update
   */
  updateGuildSettings: (guildId: number, settings: Partial<Guild>) =>
    apiRequest<Guild>({
      method: 'PATCH',
      url: `/guilds/${guildId}/settings`,
      data: settings
    }),

  /**
   * Synchronize guild members from Battle.net
   * @param guildId The guild ID
   */
  syncGuildMembers: (guildId: number) =>
    apiRequest<{ message: string }>({
      method: 'POST',
      url: `/guilds/${guildId}/sync`
    }),
  
  /**
   * Get characters for a guild
   * @param guildId The guild ID
   */
  getCharacters: (guildId: number) =>
    apiRequest<Character[]>({
      method: 'GET',
      url: `/guilds/${guildId}/characters`
    })
};
```

4. **Update Event Service**

   Find: `frontend/src/services/api/event.service.ts`
   
   Standardize method signatures and update implementation:

```typescript
import { Event, EventSubscription } from '../../../shared/types/index';
import { apiRequest } from './core';

export const eventService = {
  /**
   * Get all events for a guild
   * @param guildId The guild ID
   */
  getGuildEvents: (guildId: number) =>
    apiRequest<Event[]>({
      method: 'GET',
      url: `/events/guild/${guildId}`
    }),

  /**
   * Get a specific event by ID
   * @param eventId The event ID
   */
  getEventById: (eventId: number) =>
    apiRequest<Event>({
      method: 'GET',
      url: `/events/${eventId}`
    }),

  /**
   * Create a new event
   * @param eventData The event data
   */
  createEvent: (eventData: Partial<Event>) =>
    apiRequest<Event>({
      method: 'POST',
      url: '/events',
      data: eventData
    }),

  /**
   * Update an existing event
   * @param eventId The event ID
   * @param eventData The updated event data
   */
  updateEvent: (eventId: number, eventData: Partial<Event>) =>
    apiRequest<Event>({
      method: 'PUT',
      url: `/events/${eventId}`,
      data: eventData
    }),

  /**
   * Delete an event
   * @param eventId The event ID
   */
  deleteEvent: (eventId: number) =>
    apiRequest<{ message: string }>({
      method: 'DELETE',
      url: `/events/${eventId}`
    }),

  /**
   * Get all subscribers for an event
   * @param eventId The event ID
   */
  getEventSubscribers: (eventId: number) =>
    apiRequest<EventSubscription[]>({
      method: 'GET',
      url: `/events/${eventId}/subscribers`
    }),

  /**
   * Subscribe to an event
   * @param eventId The event ID
   * @param subscriptionData The subscription data
   */
  subscribeToEvent: (eventId: number, subscriptionData: Partial<EventSubscription>) =>
    apiRequest<EventSubscription>({
      method: 'POST',
      url: `/events/${eventId}/subscribe`,
      data: subscriptionData
    }),

  /**
   * Update an event subscription
   * @param eventId The event ID
   * @param subscriptionData The updated subscription data
   */
  updateSubscription: (eventId: number, subscriptionData: Partial<EventSubscription>) =>
    apiRequest<EventSubscription>({
      method: 'PUT',
      url: `/events/${eventId}/subscribe`,
      data: subscriptionData
    }),

  /**
   * Unsubscribe from an event
   * @param eventId The event ID
   */
  unsubscribeFromEvent: (eventId: number) =>
    apiRequest<{ message: string }>({
      method: 'DELETE',
      url: `/events/${eventId}/subscribe`
    })
};
```

5. **Create an Index File**

   Ensure `frontend/src/services/api/index.ts` exports all services:

```typescript
// Re-export all services for easy imports
export * from './core';
export * from './auth.service';
export * from './guild.service';
export * from './event.service';

// Import and re-export services as a single object
import { authService } from './auth.service';
import { guildService } from './guild.service';
import { eventService } from './event.service';

export const services = {
  auth: authService,
  guild: guildService,
  event: eventService,
};
```

6. **Delete the Monolithic API Service**

   Find: `frontend/src/services/api.service.ts`
   
   This file should be deleted entirely. Before deleting, search for all imports of this file and update them to the new domain-specific imports.

   For example, update:
   
```typescript
import { eventApi } from '../services/api.service';
```

   To:
   
```typescript
import { eventService } from '../services/api';
```

7. **Update useApi Hook**

   Find: `frontend/src/hooks/useApi.ts`
   
   Update to work with standardized API service:

```typescript
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
      const finalArgs = args.length > 0 ? args : options.args || [] as unknown as P;
      
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
```

## 2. Component Updates

After consolidating the API services, you need to update all components that use the old API services. Here's an example of how to update a component:

### Update GuildPage.tsx

Find: `frontend/src/pages/GuildPage.tsx`

Update the imports and API calls:

```typescript
// Before:
import { guildApi, eventApi } from '../services/api.service';

// After:
import { guildService, eventService } from '../services/api';

// Then update the code:
// Before:
const guildResponse = await guildApi.getGuildById(parseInt(guildId));

// After:
const guildResponse = await guildService.getGuildById(parseInt(guildId));
```

### Example: Updating useAuth Hook

Find: `frontend/src/context/AuthContext.tsx`

Update imports and API calls:

```typescript
// Before:
import { authApi } from '../services/api.service';

// After:
import { authService } from '../services/api';

// Then update all api calls:
// Before:
const response = await authApi.getCurrentUser();

// After:
const response = await authService.getCurrentUser();
```

## 3. API Method Signatures Standardization

All API service methods should follow a consistent pattern:

1. Include descriptive JSDoc comments
2. Use proper parameter and return types
3. Follow consistent naming conventions

### Example: Update or verify existing methods

For auth service:
```typescript
/**
 * Attempt to refresh the user's authentication token
 * @returns Promise with refresh response
 */
refreshToken: () =>
  apiRequest<{ message: string }>({
    method: 'GET',
    url: '/auth/refresh'
  }),
```

For guild service:
```typescript
/**
 * Get detailed information about a guild
 * @param guildId The guild's numeric ID
 * @returns Promise with guild data
 */
getGuildById: (guildId: number) =>
  apiRequest<Guild>({
    method: 'GET',
    url: `/guilds/id/${guildId}`
  }),
```

For event service:
```typescript
/**
 * Create a new event
 * @param eventData The event data to create
 * @returns Promise with the created event
 */
createEvent: (eventData: Partial<Event>) =>
  apiRequest<Event>({
    method: 'POST',
    url: '/events',
    data: eventData
  }),
```

## 4. Add API Response Type Validation

Add runtime validation to ensure API responses match expected types. Create a new utility file:

Create: `frontend/src/utils/validation.ts`

```typescript
/**
 * Validates that an object has required properties
 * @param obj Object to validate
 * @param requiredProps List of required property names
 * @returns True if valid, false if missing properties
 */
export function validateRequired(obj: any, requiredProps: string[]): boolean {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  
  return requiredProps.every(prop => prop in obj);
}

/**
 * Check if an API response is valid for a specific model
 * @param data Data to validate
 * @param validator Validation function
 * @returns True if valid, false otherwise
 */
export function validateApiResponse<T>(data: any, validator: (data: any) => boolean): data is T {
  return validator(data);
}

/**
 * Basic validators for common types
 */
export const validators = {
  user: (data: any) => validateRequired(data, ['id', 'battle_net_id', 'battletag']),
  guild: (data: any) => validateRequired(data, ['id', 'name', 'realm', 'region']),
  event: (data: any) => validateRequired(data, ['id', 'title', 'event_type', 'start_time', 'end_time']),
  subscription: (data: any) => validateRequired(data, ['id', 'event_id', 'user_id', 'status']),
};
```

## 5. Frontend API Response Handling

Create helper functions to standardize API response handling:

Create: `frontend/src/utils/api-helpers.ts`

```typescript
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
```

By implementing these changes, you'll consolidate the API services into a consistent, well-documented pattern that is easier to maintain and use. The domain-specific approach provides better organization and type safety, while the standardized method signatures and documentation improve developer experience.
