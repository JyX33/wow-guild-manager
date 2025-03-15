# WoW Guild Manager API Integration Refactoring Plan

## Overview

This plan addresses the confusion between `api.service.ts` and `useApi.ts`, fixing the flow from GuildSelector to API calls and ensuring proper handling of parameters.

## Problem Diagnosis

1. **Architectural Issue**: Duplicate API handling logic between `api.service.ts` and `useApi.ts`
2. **Runtime Error**: In `useApi.ts`, the URL is undefined when called from GuildSelector
3. **Flow Issue**: Inconsistent usage of API services throughout components
4. **Error Handling**: Inconsistent error handling between direct API calls and hook-based calls

## Solution Approach

We'll refactor the code to establish a clear separation of concerns:
- `api.service.ts` - Only API communication
- `useApi.ts` - React state management for API calls
- Components - Use hooks for data fetching

## File Modifications

### 1. Update `api.service.ts`

```typescript
// File: frontend/src/services/api.service.ts

import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiError, ApiResponse, Event, EventSubscription, Guild, User, UserRole } from '../../../shared/types/index';

// Use environment variable with fallback
const API_URL = import.meta.env.VITE_API_URL || '/api';

// Create Axios client with proper configuration
const apiClient = axios.create({
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

// Helper to standardize response format
const formatResponse = <T>(response: AxiosResponse): ApiResponse<T> => {
  if (response.data.success !== undefined) {
    // Server already returns our ApiResponse format
    return response.data as ApiResponse<T>;
  } else {
    // Transform into our standard API response format
    return {
      success: true,
      data: response.data
    };
  }
};

// Helper to handle errors
const handleApiError = (error: any): ApiResponse<never> => {
  const apiError: ApiError = {
    status: error.response?.status || 500,
    message: error.response?.data?.error?.message || 
             error.response?.data?.message || 
             error.message || 
             'Unknown error occurred',
    details: error.response?.data?.error?.details
  };
  
  return {
    success: false,
    error: apiError
  };
};

// Generic API request function
const apiRequest = async <T>(config: AxiosRequestConfig): Promise<ApiResponse<T>> => {
  try {
    const response = await apiClient(config);
    return formatResponse<T>(response);
  } catch (error) {
    return handleApiError(error);
  }
};

// AUTHENTICATION API
export const authApi = {
  login: (region: string) => 
    apiRequest<{ authUrl: string }>({
      method: 'GET',
      url: `/auth/login?region=${region}`
    }),
  
  getCurrentUser: () => 
    apiRequest<User>({
      method: 'GET',
      url: '/auth/me'
    }),
  
  logout: () => 
    apiRequest<{ message: string }>({
      method: 'GET',
      url: '/auth/logout'
    }),
  
  refreshToken: () => 
    apiRequest<{ message: string }>({
      method: 'GET',
      url: '/auth/refresh'
    })
};

// GUILD API
export const guildApi = {
  getGuildByName: (region: string, realm: string, name: string) => 
    apiRequest<Guild>({
      method: 'GET',
      url: `/guilds/${region}/${encodeURIComponent(realm)}/${encodeURIComponent(name)}`
    }),
  
  getGuildById: (guildId: number) =>
    apiRequest<Guild>({
      method: 'GET',
      url: `/guilds/id/${guildId}`
    }),
  
  getGuildMembers: (guildId: number) => 
    apiRequest<Array<any>>({
      method: 'GET',
      url: `/guilds/${guildId}/members`
    })
};

// EVENT API
export const eventApi = {
  getGuildEvents: (guildId: number) => 
    apiRequest<Event[]>({
      method: 'GET',
      url: `/events/guild/${guildId}`
    }),
  
  getEventById: (eventId: number) =>
    apiRequest<Event>({
      method: 'GET',
      url: `/events/${eventId}`
    }),
    
  createEvent: (eventData: Partial<Event>) => 
    apiRequest<Event>({
      method: 'POST',
      url: '/events',
      data: eventData
    }),
  
  updateEvent: (eventId: number, eventData: Partial<Event>) => 
    apiRequest<Event>({
      method: 'PUT',
      url: `/events/${eventId}`,
      data: eventData
    }),
  
  deleteEvent: (eventId: number) => 
    apiRequest<Event>({
      method: 'DELETE',
      url: `/events/${eventId}`
    }),
  
  subscribeToEvent: (eventId: number, subscriptionData: Partial<EventSubscription>) => 
    apiRequest<EventSubscription>({
      method: 'POST',
      url: `/events/${eventId}/subscribe`,
      data: subscriptionData
    }),
  
  updateSubscription: (eventId: number, subscriptionData: Partial<EventSubscription>) => 
    apiRequest<EventSubscription>({
      method: 'PUT',
      url: `/events/${eventId}/subscribe`,
      data: subscriptionData
    }),
  
  getEventSubscribers: (eventId: number) => 
    apiRequest<EventSubscription[]>({
      method: 'GET',
      url: `/events/${eventId}/subscribers`
    })
};
```

### 2. Refactor `useApi.ts` to use `api.service.ts`

```typescript
// File: frontend/src/hooks/useApi.ts

import { useState, useEffect, useCallback } from 'react';
import { ApiResponse, ApiError } from '../../../shared/types/index';

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
```

### 3. Update GuildSelector component

```typescript
// File: frontend/src/components/GuildSelector.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { Guild } from '../../../shared/types/index';
import { guildApi } from '../services/api.service';
import { useApi } from '../hooks/useApi';
import FormStatus from './FormStatus';
import LoadingSpinner from './LoadingSpinner';

interface GuildSelectorFormValues {
  region: string;
  realm: string;
  guildName: string;
}

// Form validation schema
const GuildSelectorSchema = Yup.object().shape({
  region: Yup.string()
    .required('Region is required')
    .oneOf(['eu', 'us', 'kr', 'tw'], 'Invalid region'),
  realm: Yup.string()
    .required('Realm is required')
    .min(2, 'Realm must be at least 2 characters')
    .max(50, 'Realm must be at most 50 characters'),
  guildName: Yup.string()
    .required('Guild name is required')
    .min(2, 'Guild name must be at least 2 characters')
    .max(50, 'Guild name must be at most 50 characters')
});

const GuildSelector: React.FC = () => {
  const navigate = useNavigate();
  
  // Create API hook for getting the guild
  const { loading, error, execute } = useApi<Guild, [string, string, string]>({
    apiFn: guildApi.getGuildByName,
    immediate: false
  });

  const initialValues: GuildSelectorFormValues = {
    region: 'eu',
    realm: '',
    guildName: ''
  };

  const handleSubmit = async (values: GuildSelectorFormValues) => {
    const { region, realm, guildName } = values;
    
    // Log the request
    console.log(`Searching for guild: ${guildName} on ${realm}-${region}`);
    
    // Execute API call using the hook (this calls guildApi.getGuildByName)
    const response = await execute(region, realm, guildName);
    
    console.log('API Response:', response);
    
    if (response.success && response.data) {
      // Check that we have a valid guild ID
      if (response.data.id && !isNaN(response.data.id)) {
        // Navigate to guild page with the guild ID
        navigate(`/guild/${response.data.id}`);
      } else {
        console.error('Invalid guild ID:', response.data);
      }
    } else {
      console.error('Failed to find guild:', response.error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold mb-4">Find Your Guild</h2>
      
      <FormStatus loading={loading} error={error} />
      
      <Formik
        initialValues={initialValues}
        validationSchema={GuildSelectorSchema}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting, isValid, dirty }) => (
          <Form className="space-y-4">
            {/* Form fields (region, realm, guildName) */}
            {/* ... (keep the existing form fields) ... */}
            
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || !isValid || !dirty || loading}
                className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 
                  ${(isSubmitting || !isValid || !dirty || loading) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {loading ? <LoadingSpinner size="sm" message="Searching..." /> : 'Find Guild'}
              </button>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default GuildSelector;
```

### 4. Update GuildPage component

```typescript
// File: frontend/src/pages/GuildPage.tsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { guildApi, eventApi } from '../services/api.service';
import { useApi } from '../hooks/useApi';
import EventCalendar from '../components/EventCalendar';
import LoadingSpinner from '../components/LoadingSpinner';

interface Event {
  id: number;
  title: string;
  start: Date;
  end: Date;
  event_type: string;
}

const GuildPage: React.FC = () => {
  const { guildId } = useParams<{ guildId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'calendar' | 'members'>('calendar');
  const [calendarKey, setCalendarKey] = useState(Date.now());

  // Validate guildId
  useEffect(() => {
    if (!guildId) {
      console.error('GuildId is undefined in URL params');
      navigate('/dashboard');
      return;
    }
    
    if (isNaN(parseInt(guildId))) {
      console.error('GuildId is not a valid number:', guildId);
      navigate('/dashboard');
      return;
    }
    
    console.log('Guild ID parsed successfully:', parseInt(guildId));
  }, [guildId, navigate]);

  // Force refresh of calendar when navigating back to this page
  useEffect(() => {
    setCalendarKey(Date.now());
  }, [location.key]);

  // Fetch guild data
  const { 
    data: guild, 
    loading: guildLoading, 
    error: guildError 
  } = useApi({
    apiFn: guildApi.getGuildById,
    args: [parseInt(guildId || '0')],
    deps: [guildId],
    immediate: !!guildId && !isNaN(parseInt(guildId))
  });

  // Fetch guild members
  const { 
    data: members, 
    loading: membersLoading, 
    error: membersError 
  } = useApi({
    apiFn: guildApi.getGuildMembers,
    args: [parseInt(guildId || '0')],
    deps: [guildId],
    immediate: !!guildId && !isNaN(parseInt(guildId))
  });

  const loading = guildLoading || membersLoading;
  const error = guildError || membersError;

  const handleEventSelect = (event: Event) => {
    navigate(`/event/${event.id}`);
  };

  const handleSlotSelect = (slotInfo: { start: Date; end: Date }) => {
    if (!guildId) return;
    
    // Format dates for the form
    const startStr = slotInfo.start.toISOString().slice(0, 16);
    const endStr = slotInfo.end.toISOString().slice(0, 16);
    
    navigate(`/guild/${guildId}/event/create`, { 
      state: { startTime: startStr, endTime: endStr }
    });
  };

  const handleCreateEvent = () => {
    if (!guildId) return;
    navigate(`/guild/${guildId}/event/create`);
  };

  if (loading) {
    return <LoadingSpinner size="lg" message="Loading Guild..." fullScreen />;
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 text-red-700 p-4 rounded">
          Error loading guild: {error.message}
        </div>
        <button
          className="mt-4 text-blue-600 hover:text-blue-800"
          onClick={() => navigate('/dashboard')}
        >
          &larr; Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Rest of the component remains the same */}
    </div>
  );
};

export default GuildPage;
```

### 5. Update EventCalendar component

```typescript
// File: frontend/src/components/EventCalendar.tsx

import React, { useState, useEffect } from 'react';
import { eventApi } from '../services/api.service';
import { useApi } from '../hooks/useApi';
import { Event } from '../../../shared/types/index';
import LoadingSpinner from './LoadingSpinner';

// Keep the rest of your component implementation...

interface EventCalendarProps {
  guildId: number;
  onSelectEvent: (event: CalendarEvent) => void;
  onSelectSlot: (slotInfo: { start: Date; end: Date }) => void;
}

const EventCalendar: React.FC<EventCalendarProps> = ({ 
  guildId, 
  onSelectEvent, 
  onSelectSlot 
}) => {
  // Use the new useApi hook with the correct API function
  const { 
    data: eventsData, 
    loading, 
    error 
  } = useApi({
    apiFn: eventApi.getGuildEvents,
    args: [guildId],
    deps: [guildId]
  });

  // Rest of your component implementation...
};
```

### 6. Update all other components using useApi

Follow the same pattern for all other components using the useApi hook.

## Testing Plan

1. **Verify API Service**:
   - Check each API function works correctly
   - Test error handling and response formatting

2. **Test Guild Selection Flow**:
   - Fill out guild selector form
   - Verify API request is made correctly
   - Confirm navigation to guild page works

3. **Test Guild Page**:
   - Verify guild data is loaded correctly
   - Test event calendar integration
   - Confirm guild members are displayed

4. **Error Handling**:
   - Test invalid guild ID behavior
   - Verify API errors are displayed properly

## Debugging Tips

1. Add console logs at key points in the flow
2. Use browser devtools to monitor network requests
3. Check for any errors in the console during form submission
4. Verify environment variables and proxy configuration

## Implementation Plan

1. Update `api.service.ts` to ensure it handles all API requests properly
2. Refactor `useApi.ts` to use functions from `api.service.ts`
3. Update `GuildSelector.tsx` to use the new API hooks
4. Fix `GuildPage.tsx` to handle params correctly
5. Test the entire flow from guild selection to guild page
