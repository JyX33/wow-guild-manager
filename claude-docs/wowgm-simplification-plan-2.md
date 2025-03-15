# WoW Guild Manager: Code Simplification Plan

## Overview

This document outlines a comprehensive plan to simplify and improve the WoW Guild Manager codebase. The project currently has several areas where complexity can be reduced without sacrificing functionality.

## Key Simplification Areas

### 1. API Service Organization

**Current Issue**: The frontend API service (`api.service.ts`) is a monolithic file handling all domains (auth, guild, events), making it difficult to maintain and extend.

**Solution**: Split the API service into domain-specific modules with a shared core.

#### Implementation Details

1. Create a directory structure:
```
src/services/api/
  ├── core.ts
  ├── auth.service.ts
  ├── guild.service.ts
  ├── event.service.ts
  └── index.ts
```

2. Core API utilities (`core.ts`):
```typescript
import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { ApiError, ApiResponse } from '../types';

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
```

3. Domain-specific service example (`auth.service.ts`):
```typescript
import { User, UserRole } from '../types';
import { apiRequest } from './core';

export const authService = {
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
```

4. Barrel file (`index.ts`) for backward compatibility:
```typescript
export * from './core';
export * from './auth.service';
export * from './guild.service';
export * from './event.service';
```

### 2. Authentication Simplification

**Current Issue**: The authentication flow uses a complex HOC pattern (`withAuth.tsx`) that's hard to understand and maintain.

**Solution**: Replace the HOC pattern with more intuitive hook and component approaches.

#### Implementation Details

1. Create a custom hook for authentication (`useRequireAuth.ts`):
```typescript
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

/**
 * Hook to protect routes that require authentication
 * Can optionally require specific roles
 */
export function useRequireAuth(requiredRoles?: UserRole | UserRole[]) {
  const { user, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    // Wait until auth state is determined
    if (!loading) {
      // Redirect to login if not authenticated
      if (!isAuthenticated) {
        navigate('/login', { state: { from: location.pathname } });
        return;
      }
      
      // Check role requirements if specified
      if (requiredRoles && user) {
        const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
        
        // Redirect to dashboard if user doesn't have required role
        if (!roles.includes(user.role as UserRole)) {
          navigate('/dashboard');
        }
      }
    }
  }, [loading, isAuthenticated, user, requiredRoles, navigate, location.pathname]);
  
  return { user, loading, isAuthenticated };
}
```

2. Create an authentication protection component (`AuthProtect.tsx`):
```typescript
import React, { ReactNode } from 'react';
import { UserRole } from '../types';
import { useRequireAuth } from '../hooks/useRequireAuth';
import LoadingSpinner from './LoadingSpinner';

interface AuthProtectProps {
  children: ReactNode;
  requiredRoles?: UserRole | UserRole[];
  loadingFallback?: ReactNode;
}

/**
 * Component to protect routes that require authentication
 */
export const AuthProtect: React.FC<AuthProtectProps> = ({
  children,
  requiredRoles,
  loadingFallback = <LoadingSpinner size="lg" message="Authenticating..." fullScreen />
}) => {
  const { loading, isAuthenticated } = useRequireAuth(requiredRoles);
  
  if (loading) {
    return <>{loadingFallback}</>;
  }
  
  // If authentication check failed, useRequireAuth will navigate away
  // Only render children if authenticated
  return isAuthenticated ? <>{children}</> : null;
};
```

3. Update route protection in `App.tsx`:
```typescript
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { AuthProtect } from './components/AuthProtect';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import Dashboard from './pages/Dashboard';
import GuildPage from './pages/GuildPage';
// other imports...

const queryClient = new QueryClient();

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-gray-100 text-gray-900">
            <main className="min-h-screen">
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/dashboard" element={
                  <AuthProtect>
                    <Dashboard />
                  </AuthProtect>
                } />
                <Route path="/guild/:guildId" element={
                  <AuthProtect>
                    <GuildPage />
                  </AuthProtect>
                } />
                {/* Other protected routes... */}
                <Route path="/" element={<Navigate to="/dashboard" />} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
```

### 3. Component Refactoring

**Current Issue**: Several components like `EventForm` and `EventCalendar` are complex and handle multiple responsibilities.

**Solution**: Break down complex components into smaller, more focused pieces.

#### Implementation Details

1. Create reusable form field component (`FormField.tsx`):
```typescript
import React from 'react';
import { Field, ErrorMessage } from 'formik';

interface FormFieldProps {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  as?: string;
  className?: string;
  children?: React.ReactNode;
  required?: boolean;
}

export const FormField: React.FC<FormFieldProps> = ({
  name,
  label,
  type = 'text',
  placeholder = '',
  as,
  className = 'w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500',
  children,
  required = false
}) => {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && '*'}
      </label>
      
      {children ? (
        <Field
          name={name}
          id={name}
          as={as}
          type={type}
          placeholder={placeholder}
          className={className}
        >
          {children}
        </Field>
      ) : (
        <Field
          name={name}
          id={name}
          as={as}
          type={type}
          placeholder={placeholder}
          className={className}
        />
      )}
      
      <ErrorMessage name={name} component="div" className="text-red-500 text-sm mt-1" />
    </div>
  );
};
```

2. Split `EventForm` into logical sub-components:
```typescript
// components/forms/EventBasicFields.tsx
import React from 'react';
import { FormField } from './FormField';

export const EventBasicFields: React.FC = () => {
  return (
    <>
      <FormField
        name="title"
        label="Event Title"
        placeholder="Give your event a descriptive title"
        required
      />
      
      <FormField
        name="description"
        label="Description"
        as="textarea"
        placeholder="Add details about your event"
        className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 h-32"
      />
      
      <FormField
        name="event_type"
        label="Event Type"
        as="select"
        required
      >
        <option value="">Select Event Type</option>
        <option value="Raid">Raid</option>
        <option value="Dungeon">Dungeon</option>
        <option value="Special">Special Event</option>
      </FormField>
    </>
  );
};

// components/forms/EventTimeFields.tsx
import React from 'react';
import { FormField } from './FormField';

export const EventTimeFields: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField
        name="start_time"
        label="Start Time"
        type="datetime-local"
        required
      />
      
      <FormField
        name="end_time"
        label="End Time"
        type="datetime-local"
        required
      />
    </div>
  );
};

// Simplified main EventForm
import React, { useState } from 'react';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { Event } from '../types';
import { EventBasicFields } from './forms/EventBasicFields';
import { EventTimeFields } from './forms/EventTimeFields';
import { EventParticipantsField } from './forms/EventParticipantsField';
import FormStatus from './FormStatus';
import { useApi } from '../hooks/useApi';
import { eventService } from '../services/api';
import LoadingSpinner from './LoadingSpinner';

// ... validation schema and other code ...

export const EventForm: React.FC<EventFormProps> = ({ 
  initialValues, 
  onSubmitSuccess, 
  buttonText,
  mode,
  eventId
}) => {
  const [formSubmitted, setFormSubmitted] = useState(false);
  
  // Use our custom useApi hook with the appropriate API function
  const { loading, error, execute } = useApi<Event, [Partial<Event>]>({
    apiFn: mode === 'create' ? eventService.createEvent : 
          (mode === 'edit' && eventId) ? 
            (data: Partial<Event>) => eventService.updateEvent(eventId, data) :
            eventService.createEvent,
    immediate: false
  });

  const handleSubmit = async (values: EventFormValues) => {
    try {
      const response = await execute(values);
      
      if (response.success && response.data) {
        setFormSubmitted(true);
        onSubmitSuccess(response.data);
      }
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <FormStatus 
        loading={loading}
        error={error}
        success={formSubmitted}
        successMessage={mode === 'create' ? 'Event created successfully!' : 'Event updated successfully!'}
      />

      <Formik
        initialValues={initialValues}
        validationSchema={EventSchema}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting, isValid, dirty }) => (
          <Form className="space-y-4">
            <EventBasicFields />
            <EventTimeFields />
            <EventParticipantsField />
            
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting || !isValid || !dirty || loading}
                className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 
                  ${(isSubmitting || !isValid || !dirty || loading) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {loading ? <LoadingSpinner size="sm" message="Submitting..." /> : buttonText}
              </button>
            </div>
            
            <div className="text-xs text-gray-500">
              * Required fields
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};
```

### 4. Error Handling Standardization

**Current Issue**: Error handling is inconsistent across the application, with different approaches in different components.

**Solution**: Create a unified error handling system.

#### Implementation Details

1. Define standardized error types (`errorTypes.ts`):
```typescript
export enum ErrorType {
  AUTHENTICATION = 'authentication_error',
  AUTHORIZATION = 'authorization_error',
  VALIDATION = 'validation_error',
  NOT_FOUND = 'not_found_error',
  SERVER = 'server_error',
  NETWORK = 'network_error',
  UNKNOWN = 'unknown_error'
}

export interface AppError {
  type: ErrorType;
  message: string;
  status?: number;
  details?: any;
}
```

2. Create error utilities (`errorUtils.ts`):
```typescript
import { ErrorType, AppError } from './errorTypes';

/**
 * Create a standardized application error
 */
export const createError = (
  type: ErrorType,
  message: string,
  status?: number,
  details?: any
): AppError => {
  return {
    type,
    message,
    status,
    details
  };
};

/**
 * Map HTTP status code to error type
 */
export const getErrorTypeFromStatus = (status: number): ErrorType => {
  switch (status) {
    case 400:
      return ErrorType.VALIDATION;
    case 401:
      return ErrorType.AUTHENTICATION;
    case 403:
      return ErrorType.AUTHORIZATION;
    case 404:
      return ErrorType.NOT_FOUND;
    case 500:
    case 502:
    case 503:
    case 504:
      return ErrorType.SERVER;
    default:
      return ErrorType.UNKNOWN;
  }
};

/**
 * Get appropriate error message for user display
 */
export const getUserFriendlyErrorMessage = (error: AppError): string => {
  switch (error.type) {
    case ErrorType.AUTHENTICATION:
      return 'Authentication failed. Please log in again.';
    case ErrorType.AUTHORIZATION:
      return 'You do not have permission to perform this action.';
    case ErrorType.VALIDATION:
      return error.message || 'Please check your input and try again.';
    case ErrorType.NOT_FOUND:
      return error.message || 'The requested resource was not found.';
    case ErrorType.SERVER:
      return 'The server encountered an error. Please try again later.';
    case ErrorType.NETWORK:
      return 'Network error. Please check your connection and try again.';
    case ErrorType.UNKNOWN:
    default:
      return 'An unexpected error occurred. Please try again.';
  }
};

/**
 * Log error with appropriate level based on type
 */
export const logError = (error: AppError, additionalInfo?: any): void => {
  const errorData = {
    ...error,
    additionalInfo,
    timestamp: new Date().toISOString()
  };

  switch (error.type) {
    case ErrorType.SERVER:
    case ErrorType.UNKNOWN:
      console.error('Error:', errorData);
      break;
    case ErrorType.NETWORK:
    case ErrorType.NOT_FOUND:
      console.warn('Warning:', errorData);
      break;
    default:
      console.info('Info:', errorData);
  }
};
```

3. Create a standardized error display component (`ErrorDisplay.tsx`):
```typescript
import React from 'react';
import { AppError, ErrorType } from '../utils/errorTypes';
import { getUserFriendlyErrorMessage } from '../utils/errorUtils';

interface ErrorDisplayProps {
  error: AppError | null | string;
  className?: string;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, className = '' }) => {
  if (!error) return null;
  
  // Handle string errors
  if (typeof error === 'string') {
    return (
      <div className={`bg-red-100 text-red-700 p-3 rounded ${className}`}>
        {error}
      </div>
    );
  }
  
  // Get background color based on error type
  const getBgColor = (type: ErrorType): string => {
    switch (type) {
      case ErrorType.AUTHENTICATION:
      case ErrorType.AUTHORIZATION:
        return 'bg-orange-100 text-orange-700';
      case ErrorType.VALIDATION:
        return 'bg-yellow-100 text-yellow-700';
      case ErrorType.NOT_FOUND:
        return 'bg-blue-100 text-blue-700';
      case ErrorType.SERVER:
      case ErrorType.NETWORK:
      case ErrorType.UNKNOWN:
      default:
        return 'bg-red-100 text-red-700';
    }
  };
  
  const colorClass = getBgColor(error.type);
  const message = getUserFriendlyErrorMessage(error);
  
  return (
    <div className={`${colorClass} p-3 rounded ${className}`}>
      {message}
      {error.details && process.env.NODE_ENV === 'development' && (
        <div className="mt-1 text-sm opacity-75">
          Details: {JSON.stringify(error.details)}
        </div>
      )}
    </div>
  );
};
```

4. Create a custom hook for error handling (`useError.ts`):
```typescript
import { useState, useCallback } from 'react';
import { AppError, ErrorType } from '../utils/errorTypes';
import { createError, logError } from '../utils/errorUtils';

export const useError = (initialError: AppError | null = null) => {
  const [error, setError] = useState<AppError | null>(initialError);
  
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  const setErrorFromResponse = useCallback((apiError: any) => {
    let appError: AppError;
    
    if (apiError?.status && apiError?.message) {
      // If it's already in AppError format
      appError = apiError as AppError;
    } else if (apiError?.response?.status) {
      // If it's an Axios error
      appError = createError(
        ErrorType.UNKNOWN,
        apiError.response.data?.message || apiError.message || 'Unknown error',
        apiError.response.status,
        apiError.response.data
      );
    } else {
      // Generic error
      appError = createError(
        ErrorType.UNKNOWN,
        apiError?.message || 'An unexpected error occurred',
        500
      );
    }
    
    logError(appError);
    setError(appError);
    
    return appError;
  }, []);
  
  return {
    error,
    setError,
    clearError,
    setErrorFromResponse
  };
};
```

### 5. Shared Type Definitions

**Current Issue**: Type definitions are duplicated between frontend and backend, leading to potential inconsistencies.

**Solution**: Establish a shared types system accessible to both projects.

#### Implementation Details

1. Create a shared types directory structure:
```
shared/
  ├── types/
  │   ├── index.ts
  │   ├── user.ts
  │   ├── guild.ts
  │   ├── event.ts
  │   └── api.ts
  └── types.d.ts
```

2. Define shared types by domain (`user.ts` example):
```typescript
export enum UserRole {
  USER = 'user',
  GUILD_LEADER = 'guild_leader',
  ADMIN = 'admin'
}

export interface User {
  id: number;
  battle_net_id: string;
  battletag: string;
  token_expires_at?: string;
  created_at?: string;
  updated_at?: string;
  role?: UserRole;
}

// For backend use only - not exported directly in index.ts
export interface UserWithTokens extends User {
  access_token?: string;
  refresh_token?: string;
}

export interface BattleNetUserProfile {
  id: string;
  battletag: string;
  sub: string;
  [key: string]: any; // For any additional fields returned by Battle.net API
}
```

3. Create a barrel file for easy imports (`index.ts`):
```typescript
export * from './user';
export * from './guild';
export * from './event';
export * from './api';
```

4. Add type declarations for importing in projects (`types.d.ts`):
```typescript
declare module 'wow-guild-manager-shared-types' {
  export * from './types/index';
}
```

5. Update TypeScript configuration in both projects to include shared types:

```json
// frontend/tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["src/*"],
      "shared/*": ["../shared/*"]
    }
  }
}

// backend/tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "*": ["node_modules/*"],
      "shared/*": ["../shared/*"]
    }
  }
}
```

## Implementation Timeline

### Week 1: Foundation & Infrastructure

#### Days 1-2: Shared Types
- Setup shared types directory structure
- Move and consolidate common types
- Update import paths in both frontend and backend

#### Days 3-5: Error Handling
- Implement error utilities and types
- Create error display components
- Update API services to use new error handling

### Week 2: Frontend Refactoring

#### Days 1-2: API Service Splitting
- Create core API utilities
- Split services by domain
- Update imports in components

#### Days 3-5: Authentication Simplification
- Implement `useRequireAuth` hook
- Create `AuthProtect` component
- Update route configuration
- Test authentication flows

### Week 3: Component Refactoring

#### Days 1-3: Form Component Refactoring
- Create reusable form field components
- Refactor `EventForm` into smaller components
- Update dependencies and imports

#### Days 4-5: Calendar and Other Components
- Refactor `EventCalendar` for better maintainability
- Update `GuildSelector` component
- Test components for functionality

### Week 4: Backend Refinement and Testing

#### Days 1-2: Backend Model Optimization
- Review and streamline BaseModel methods
- Ensure proper transaction handling
- Standardize error handling in models

#### Days 3-5: Testing and Documentation
- Add unit tests for critical components
- Implement integration tests for API endpoints
- Update documentation
- Perform final testing and bug fixes

## Success Metrics

We'll measure success by:

- **Code Quality**: Reduction in complexity metrics
- **Performance**: Build time, bundle size, runtime performance
- **Developer Experience**: Time to understand code, onboarding time
- **Test Coverage**: Percentage of code covered by tests
- **Bug Rate**: Number of bugs found in production

## Conclusion

This simplification plan addresses the core issues in the WoW Guild Manager codebase while maintaining all existing functionality. By implementing these changes, we'll significantly improve the maintainability, readability, and developer experience of the application.
