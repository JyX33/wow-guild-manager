# WoW Guild Manager Simplification Plan

This document outlines a step-by-step plan to simplify and improve the WoW Guild Manager codebase by removing redundancies, standardizing approaches, and improving type safety.

## 1. Configuration Consolidation

### Delete Redundant Configuration
- Delete file: `backend/config/default.ts`

### Enhance Main Configuration
- Update file: `backend/src/config/index.ts`

```typescript
import dotenv from 'dotenv';
import { AppConfig } from '../types';

// Load environment variables from .env file
dotenv.config();

// Define required environment variables
const requiredEnvVars = [
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'BATTLE_NET_CLIENT_ID',
  'BATTLE_NET_CLIENT_SECRET',
  'JWT_SECRET'
];

// Check if all required environment variables are set
const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

const config: AppConfig = {
  server: {
    port: parseInt(process.env.PORT || '5000'),
    nodeEnv: process.env.NODE_ENV || 'development',
    frontendUrl: process.env.FRONTEND_URL || 'https://localhost:5173'
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433'),
    name: process.env.DB_NAME || 'wow_guild_manager',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET || '',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || '',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    cookieMaxAge: parseInt(process.env.COOKIE_MAX_AGE || '3600000'), // 1 hour
    refreshCookieMaxAge: parseInt(process.env.REFRESH_COOKIE_MAX_AGE || '604800000') // 7 days
  },
  battlenet: {
    clientId: process.env.BATTLE_NET_CLIENT_ID || '',
    clientSecret: process.env.BATTLE_NET_CLIENT_SECRET || '',
    redirectUri: process.env.BATTLE_NET_REDIRECT_URI || 'https://localhost:5000/api/auth/callback',
    regions: {
      eu: {
        authBaseUrl: 'https://eu.battle.net/oauth',
        apiBaseUrl: 'https://eu.api.blizzard.com'
      },
      us: {
        authBaseUrl: 'https://us.battle.net/oauth',
        apiBaseUrl: 'https://us.api.blizzard.com'
      },
      kr: {
        authBaseUrl: 'https://kr.battle.net/oauth',
        apiBaseUrl: 'https://kr.api.blizzard.com'
      },
      tw: {
        authBaseUrl: 'https://tw.battle.net/oauth',
        apiBaseUrl: 'https://tw.api.blizzard.com'
      }
    }
  }
};

export default config;
```

### Update Config Imports
- Search for all imports from `backend/config/default.ts` and update them to import from `backend/src/config/index.ts` instead:

```typescript
// Change
import config from '../config/default';
// To
import config from '../config';
```

## 2. Authentication Protection Unification

### Delete Redundant Protection Component
- Delete file: `frontend/src/components/ProtectedRoute.tsx`

### Update App.tsx to Use withAuth Consistently
- Update file: `frontend/src/App.tsx`

```typescript
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import withAuth from './components/withAuth';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import Dashboard from './pages/Dashboard';
import GuildPage from './pages/GuildPage';
import EventDetailsPage from './pages/EventDetailsPage';
import CreateEventPage from './pages/CreateEventPage';
import EditEventPage from './pages/EditEventPage';

const queryClient = new QueryClient();

// Apply withAuth HOC to components that require authentication
const ProtectedDashboard = withAuth(Dashboard);
const ProtectedGuildPage = withAuth(GuildPage);
const ProtectedCreateEventPage = withAuth(CreateEventPage);
const ProtectedEventDetailsPage = withAuth(EventDetailsPage);
const ProtectedEditEventPage = withAuth(EditEventPage);

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-gray-100 text-gray-900">
            <div className="min-h-screen">
              <main className="min-h-screen">
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  <Route path="/dashboard" element={<ProtectedDashboard />} />
                  <Route path="/guild/:guildId" element={<ProtectedGuildPage />} />
                  <Route path="/guild/:guildId/event/create" element={<ProtectedCreateEventPage />} />
                  <Route path="/event/:eventId" element={<ProtectedEventDetailsPage />} />
                  <Route path="/event/:eventId/edit" element={<ProtectedEditEventPage />} />
                  <Route path="/" element={<Navigate to="/dashboard" />} />
                </Routes>
              </main>
            </div>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
```

## 3. API Communication Streamlining

### Enhance API Service
- Update file: `frontend/src/services/api.service.ts`

```typescript
import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { ApiError, ApiResponse, Event, EventSubscription, Guild, User, UserRole } from '../types';

// Type augmentation for Vite's ImportMeta
declare global {
  interface ImportMetaEnv {
    readonly VITE_API_URL: string
  }
  interface ImportMeta {
    readonly env: ImportMetaEnv
  }
}

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

// Generic API request function
const apiRequest = async <T>(config: AxiosRequestConfig): Promise<ApiResponse<T>> => {
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

// Authentication API
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
    }),
    
  updateUserRole: (userId: number, role: UserRole) => 
    apiRequest<User>({
      method: 'PUT',
      url: '/auth/role',
      data: { userId, role }
    })
};

// Guild API
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

// Event API
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
    apiRequest<{ message: string }>({
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

### Enhance useApi Hook
- Update file: `frontend/src/hooks/useApi.ts`

```typescript
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
  // Optional cache key for results
  cacheKey?: string;
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
      const response = await options.apiFn(...finalArgs);
      
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
  }, [options.apiFn, options.cacheKey]);

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

### Update Component Example (GuildSelector)
- Update file: `frontend/src/components/GuildSelector.tsx`

```typescript
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { Guild } from '../types';
import { useApi } from '../hooks/useApi';
import { guildApi } from '../services/api.service';
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
    .max(50, 'Realm must be at most 50 characters')
    .matches(/^[a-zA-Z\-\s']*$/, 'Realm can only contain letters, spaces, hyphens, and apostrophes'),
  guildName: Yup.string()
    .required('Guild name is required')
    .min(2, 'Guild name must be at least 2 characters')
    .max(50, 'Guild name must be at most 50 characters')
    .matches(/^[a-zA-Z0-9\-\s']*$/, 'Guild name can only contain letters, numbers, spaces, hyphens, and apostrophes')
});

const GuildSelector: React.FC = () => {
  const navigate = useNavigate();
  
  // Use the useApi hook for searching guilds, with immediate set to false
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
    
    // Execute API call using the hook
    const response = await execute(region, realm, guildName);
    
    if (response.success && response.data) {
      // Validate that we have a valid guild ID before navigating
      if (response.data.id && !isNaN(response.data.id)) {
        navigate(`/guild/${response.data.id}`);
      }
    }
  };

  // Rest of the component...
};

export default GuildSelector;
```

## 4. Database Model Standardization

### Update BaseModel for Consistency
- Ensure file: `backend/src/db/BaseModel.ts` follows this pattern:

```typescript
import db from './db';
import { AppError } from '../utils/error-handler';

export default class BaseModel<T> {
  tableName: string;
  
  constructor(tableName: string) {
    this.tableName = tableName;
  }
  
  async findById(id: number): Promise<T | null> {
    try {
      const result = await db.query(
        `SELECT * FROM ${this.tableName} WHERE id = $1`,
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      throw new AppError(`Error finding ${this.tableName} by ID: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
  
  async findAll(conditions?: Record<string, any>): Promise<T[]> {
    try {
      if (!conditions || Object.keys(conditions).length === 0) {
        const result = await db.query(`SELECT * FROM ${this.tableName}`);
        return result.rows;
      }
      
      const keys = Object.keys(conditions);
      const values = Object.values(conditions);
      
      const whereClause = keys.map((key, index) => `${key} = $${index + 1}`).join(' AND ');
      
      const result = await db.query(
        `SELECT * FROM ${this.tableName} WHERE ${whereClause}`,
        values
      );
      return result.rows;
    } catch (error) {
      throw new AppError(`Error finding all ${this.tableName}: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
  
  async create(data: Partial<T>): Promise<T> {
    try {
      const keys = Object.keys(data);
      const values = Object.values(data);
      
      const columnNames = keys.join(', ');
      const valuePlaceholders = keys.map((_, index) => `$${index + 1}`).join(', ');
      
      const result = await db.query(
        `INSERT INTO ${this.tableName} (${columnNames}) VALUES (${valuePlaceholders}) RETURNING *`,
        values
      );
      
      return result.rows[0];
    } catch (error) {
      throw new AppError(`Error creating ${this.tableName}: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
  
  async update(id: number, data: Partial<T>): Promise<T | null> {
    try {
      const keys = Object.keys(data);
      const values = Object.values(data);
      
      if (keys.length === 0) {
        return this.findById(id);
      }
      
      const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');
      
      const result = await db.query(
        `UPDATE ${this.tableName} SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`,
        [...values, id]
      );
      
      return result.rows[0] || null;
    } catch (error) {
      throw new AppError(`Error updating ${this.tableName}: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
  
  async delete(id: number): Promise<boolean> {
    try {
      const result = await db.query(
        `DELETE FROM ${this.tableName} WHERE id = $1 RETURNING id`,
        [id]
      );
      
      return result.rowCount > 0;
    } catch (error) {
      throw new AppError(`Error deleting ${this.tableName}: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
  
  async findOne(conditions: Record<string, any>): Promise<T | null> {
    try {
      const keys = Object.keys(conditions);
      const values = Object.values(conditions);
      
      const whereClause = keys.map((key, index) => `${key} = $${index + 1}`).join(' AND ');
      
      const result = await db.query(
        `SELECT * FROM ${this.tableName} WHERE ${whereClause} LIMIT 1`,
        values
      );
      
      return result.rows[0] || null;
    } catch (error) {
      throw new AppError(`Error finding ${this.tableName}: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
}
```

### Update Guild Model to Use BaseModel
- Update file: `backend/src/models/guild.model.ts`

```typescript
import BaseModel from '../db/BaseModel';
import { Guild } from '../types';
import { AppError } from '../utils/error-handler';

class GuildModel extends BaseModel<Guild> {
  constructor() {
    super('guilds');
  }

  async findByNameRealmRegion(name: string, realm: string, region: string): Promise<Guild | null> {
    try {
      return await this.findOne({ name, realm, region });
    } catch (error) {
      throw new AppError(`Error finding guild by name/realm/region: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }

  async getGuildWithMembers(guildId: number): Promise<Guild | null> {
    try {
      const guild = await this.findById(guildId);
      return guild;
    } catch (error) {
      throw new AppError(`Error retrieving guild with members: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
}

export default new GuildModel();
```

### Update Event Model to Use BaseModel
- Update file: `backend/src/models/event.model.ts`

```typescript
import BaseModel from '../db/BaseModel';
import { Event } from '../types';
import { AppError } from '../utils/error-handler';
import db from './db';

class EventModel extends BaseModel<Event> {
  constructor() {
    super('events');
  }

  async findByGuildId(guildId: number): Promise<Event[]> {
    try {
      return await this.findAll({ guild_id: guildId });
    } catch (error) {
      throw new AppError(`Error finding events by guild ID: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
  
  async delete(id: number): Promise<Event | null> {
    try {
      // Start a transaction to ensure both operations succeed or fail together
      const client = await db.getClient();
      
      try {
        await client.query('BEGIN');
        
        // First delete all subscriptions for this event
        await client.query(
          'DELETE FROM event_subscriptions WHERE event_id = $1',
          [id]
        );
        
        // Then delete the event itself
        const result = await client.query(
          'DELETE FROM events WHERE id = $1 RETURNING *',
          [id]
        );
        
        await client.query('COMMIT');
        
        return result.rows[0] || null;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (error) {
      throw new AppError(`Error deleting event: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
}

export default new EventModel();
```

### Update Subscription Model to Use BaseModel
- Update file: `backend/src/models/subscription.model.ts`

```typescript
import BaseModel from '../db/BaseModel';
import { EventSubscription } from '../types';
import { AppError } from '../utils/error-handler';
import db from './db';

class SubscriptionModel extends BaseModel<EventSubscription> {
  constructor() {
    super('event_subscriptions');
  }

  async findByEventAndUser(eventId: number, userId: number): Promise<EventSubscription | null> {
    try {
      return await this.findOne({ event_id: eventId, user_id: userId });
    } catch (error) {
      throw new AppError(`Error finding subscription by event and user: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
  
  async findByEventId(eventId: number): Promise<EventSubscription[]> {
    try {
      const result = await db.query(
        `SELECT es.*, u.battletag 
         FROM event_subscriptions es
         JOIN users u ON es.user_id = u.id
         WHERE es.event_id = $1`,
        [eventId]
      );
      return result.rows;
    } catch (error) {
      throw new AppError(`Error finding subscriptions by event ID: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
}

export default new SubscriptionModel();
```

## 5. CSS and Styling Standardization

### Consolidate Theme CSS
- Update file: `frontend/src/theme.css`

```css
/* 
 * theme.css - Consolidated theme variables
 * These variables are used across the application
 */

:root {
  /* Colors - Primary */
  --color-primary-50: #eff6ff;
  --color-primary-100: #dbeafe;
  --color-primary-200: #bfdbfe;
  --color-primary-300: #93c5fd;
  --color-primary-400: #60a5fa;
  --color-primary-500: #3b82f6;
  --color-primary-600: #2563eb;
  --color-primary-700: #1d4ed8;
  --color-primary-800: #1e40af;
  --color-primary-900: #1e3a8a;
  
  /* Colors - Red */
  --color-red-50: #fef2f2;
  --color-red-100: #fee2e2;
  --color-red-200: #fecaca;
  --color-red-300: #fca5a5;
  --color-red-400: #f87171;
  --color-red-500: #ef4444;
  --color-red-600: #dc2626;
  --color-red-700: #b91c1c;
  --color-red-800: #991b1b;
  --color-red-900: #7f1d1d;
  
  /* Colors - Green */
  --color-green-50: #f0fdf4;
  --color-green-100: #dcfce7;
  --color-green-200: #bbf7d0;
  --color-green-300: #86efac;
  --color-green-400: #4ade80;
  --color-green-500: #22c55e;
  --color-green-600: #16a34a;
  --color-green-700: #15803d;
  --color-green-800: #166534;
  --color-green-900: #14532d;
  
  /* Colors - Yellow */
  --color-yellow-50: #fefce8;
  --color-yellow-100: #fef9c3;
  --color-yellow-200: #fef08a;
  --color-yellow-300: #fde047;
  --color-yellow-400: #facc15;
  --color-yellow-500: #eab308;
  --color-yellow-600: #ca8a04;
  --color-yellow-700: #a16207;
  --color-yellow-800: #854d0e;
  --color-yellow-900: #713f12;
  
  /* Colors - Purple */
  --color-purple-50: #faf5ff;
  --color-purple-100: #f3e8ff;
  --color-purple-200: #e9d5ff;
  --color-purple-300: #d8b4fe;
  --color-purple-400: #c084fc;
  --color-purple-500: #a855f7;
  --color-purple-600: #9333ea;
  --color-purple-700: #7e22ce;
  --color-purple-800: #6b21a8;
  --color-purple-900: #581c87;
  
  /* Colors - Orange */
  --color-orange-50: #fff7ed;
  --color-orange-100: #ffedd5;
  --color-orange-200: #fed7aa;
  --color-orange-300: #fdba74;
  --color-orange-400: #fb923c;
  --color-orange-500: #f97316;
  --color-orange-600: #ea580c;
  --color-orange-700: #c2410c;
  --color-orange-800: #9a3412;
  --color-orange-900: #7c2d12;
  
  /* Colors - Gray */
  --color-gray-50: #f9fafb;
  --color-gray-100: #f3f4f6;
  --color-gray-200: #e5e7eb;
  --color-gray-300: #d1d5db;
  --color-gray-400: #9ca3af;
  --color-gray-500: #6b7280;
  --color-gray-600: #4b5563;
  --color-gray-700: #374151;
  --color-gray-800: #1f2937;
  --color-gray-900: #111827;
  
  /* Font families */
  --font-sans: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --font-serif: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  
  /* Spacing */
  --spacing-1: 0.25rem;
  --spacing-2: 0.5rem;
  --spacing-3: 0.75rem;
  --spacing-4: 1rem;
  --spacing-5: 1.25rem;
  --spacing-6: 1.5rem;
  
  /* Border radius */
  --radius-sm: 0.125rem;
  --radius: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;
  --radius-2xl: 1rem;
  --radius-full: 9999px;
}
```

### Consolidate Components CSS
- Delete file: `frontend/src/components/SimpleCalendar.css`
- Update file: `frontend/src/index.css`

```css
/* 
 * Import theme variables first
 */
@import "./theme.css";

/* 
 * Import Tailwind CSS framework 
 */
@import "tailwindcss";
 
/* Base styles */
@layer base {
  html {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    font-synthesis: none;
  }
 
  body {
    margin: 0;
    min-width: 320px;
    min-height: 100vh;
    font-family: var(--font-sans);
    background-color: var(--color-gray-100);
    font-weight: normal;
    line-height: normal;
  }
 
  #root {
    min-height: 100vh;
    background-color: var(--color-gray-100);
  }
}
 
/* Component styles */
@layer components {
  /* Button styles */
  .btn {
    padding: var(--spacing-2) var(--spacing-4);
    border-radius: var(--radius);
    font-weight: 500;
  }
   
  .btn-primary {
    background-color: var(--color-primary-500);
    color: white;
  }
   
  .btn-primary:hover {
    background-color: var(--color-primary-600);
  }
   
  /* Card styles */
  .card {
    background-color: white;
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow);
    padding: var(--spacing-4);
  }
  
  /* Calendar styles (formerly in SimpleCalendar.css) */
  .calendar-container {
    border: 1px solid var(--color-gray-200);
    border-radius: var(--radius);
    background-color: white;
    padding: var(--spacing-5);
  }

  .calendar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-5);
  }

  .calendar-nav {
    display: flex;
    gap: var(--spacing-2);
  }

  .calendar-nav button {
    background-color: var(--color-gray-50);
    border: 1px solid var(--color-gray-200);
    border-radius: var(--radius);
    padding: var(--spacing-1) var(--spacing-2);
    cursor: pointer;
  }
  
  .calendar-nav button:hover {
    background-color: var(--color-gray-100);
  }

  .calendar-title {
    font-size: 1.125rem;
    font-weight: bold;
  }

  .calendar-days {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 0.25rem;
  }

  .calendar-day-header {
    text-align: center;
    font-weight: bold;
    padding: var(--spacing-1);
    border-bottom: 1px solid var(--color-gray-100);
  }

  .calendar-day {
    height: 5rem;
    border: 1px solid var(--color-gray-100);
    border-radius: var(--radius);
    padding: var(--spacing-1);
    position: relative;
  }

  .calendar-day.today {
    background-color: var(--color-yellow-50);
  }

  .calendar-day-number {
    position: absolute;
    top: var(--spacing-1);
    right: var(--spacing-1);
    font-size: 0.875rem;
    color: var(--color-gray-600);
  }

  .calendar-event {
    margin-top: var(--spacing-5);
    margin-bottom: 0.125rem;
    padding: 0.125rem var(--spacing-1);
    border-radius: var(--radius);
    font-size: 0.75rem;
    color: white;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: pointer;
  }

  .calendar-event.raid {
    background-color: var(--color-red-600);
  }

  .calendar-event.dungeon {
    background-color: var(--color-green-600);
  }

  .calendar-event.special {
    background-color: var(--color-purple-600);
  }
}
```

## 6. Additional Tasks

### Update EventCalendar Component to Use Standardized CSS Classes

```tsx
// Update all class names in EventCalendar to use the standardized classes
// For example:
<div className="calendar-container">
  <div className="calendar-header">
    <div className="calendar-nav">
      {/* ... */}
    </div>
    <h2 className="calendar-title">{format(currentMonth, 'MMMM yyyy')}</h2>
  </div>
  {/* ... */}
</div>
```

### Check All Backend Model Imports

Search for any models still using direct database queries and update them to use the BaseModel pattern.

### Check All Frontend Components Using Direct API Calls

Search for any components making direct API calls and update them to use the useApi hook pattern.

## Implementation Order

1. First consolidate the configuration files
2. Then standardize database models
3. Update authentication handling
4. Improve API communication
5. Finally clean up CSS and styling

This approach minimizes the risk of breaking changes during the refactoring process.
