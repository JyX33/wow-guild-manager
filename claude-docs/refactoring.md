# WoW Guild Manager: Code Maintainability Analysis & Implementation Guide

This guide identifies maintainability issues in the WoW Guild Manager project and provides recommendations for implementing a more maintainable codebase.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Critical Maintainability Issues](#critical-maintainability-issues)
3. [Implementation Recommendations](#implementation-recommendations)
4. [Step-by-Step Implementation Plan](#step-by-step-implementation-plan)
5. [Best Practices to Follow](#best-practices-to-follow)

## Project Overview

The WoW Guild Manager is a web application that allows World of Warcraft guild leaders and members to:

- Authenticate using Battle.net accounts
- View guild information and member rosters
- Create and manage events (raids, dungeons, etc.)
- Subscribe to events with character details

The project uses:
- **Frontend**: React (TypeScript) with Vite
- **Backend**: Node.js with Bun runtime
- **Database**: PostgreSQL with JSON fields
- **Authentication**: Battle.net OAuth

## Critical Maintainability Issues

### 1. Type Safety Concerns

- **Extensive use of `any` type**: Many models, services, and controllers use `any` types, defeating the purpose of TypeScript.
- **Example**: `eventData: any` in `event.model.ts`, untyped responses in API services.

### 2. Inconsistent Error Handling

- Error handling varies significantly across controllers and components.
- Many errors are only logged to console without proper user feedback.
- Example in `auth.controller.ts` vs `guild.controller.ts`.

### 3. Duplicate Code

- Similar DB query patterns repeated across model files.
- Form handling and data fetching logic duplicated in React components.
- API error handling duplicated in many components.

### 4. Configuration Management Problems

- Environment variables accessed directly in some files but through config in others.
- Hardcoded values in `config/default.ts` that should be environment variables.
- JWT secrets sometimes hardcoded.

### 5. Component Organization

- Some components like `EventDetailsPage.tsx` are overly complex with multiple responsibilities.
- CSS organization with both inline styles and external files lacks consistency.

### 6. Backend Code Organization

- Inconsistent model pattern across different database entities.
- Controllers handle both business logic and HTTP responses.
- No clear separation between data access and service layers.

### 7. Missing Testing Infrastructure

- No visible testing setup for either frontend or backend.

## Implementation Recommendations

### 1. Improved Type Safety

Create proper TypeScript interfaces for all data structures:

```typescript
// src/types/index.ts - Centralized type definitions
export interface User {
  id: number;
  battle_net_id: string;
  battletag: string;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: Date;
  created_at?: Date;
  updated_at?: Date;
  user_data?: any;
}

export interface Guild {
  id: number;
  name: string;
  realm: string;
  region: string;
  last_updated?: Date;
  guild_data?: any;
}

export interface Event {
  id: number;
  title: string;
  description: string;
  event_type: 'Raid' | 'Dungeon' | 'Special';
  start_time: Date | string;
  end_time: Date | string;
  created_by: number;
  guild_id: number;
  max_participants: number;
  event_details?: any;
}

export interface EventSubscription {
  id: number;
  event_id: number;
  user_id: number;
  status: 'Confirmed' | 'Tentative' | 'Declined';
  character_name: string;
  character_class: string;
  character_role: 'Tank' | 'Healer' | 'DPS';
  created_at?: Date;
  battletag?: string;
}
```

### 2. Standardized Error Handling

Create a unified error handling approach:

```typescript
// src/utils/error-handler.ts
export interface ApiError {
  status: number;
  message: string;
  details?: any;
}

export class AppError extends Error {
  status: number;
  details?: any;

  constructor(message: string, status: number = 500, details?: any) {
    super(message);
    this.status = status;
    this.details = details;
    this.name = this.constructor.name;
  }
}

// Middleware for Express
export const errorHandlerMiddleware = (err, req, res, next) => {
  console.error('Error:', err);
  
  const status = err.status || 500;
  const message = err.message || 'Something went wrong';
  
  res.status(status).json({
    error: {
      message,
      details: err.details,
      status
    }
  });
};
```

### 3. Data Access Layer Refactoring

Replace direct SQL queries with a more structured approach:

```typescript
// src/db/BaseModel.ts
import db from './db';

export default class BaseModel<T> {
  tableName: string;
  
  constructor(tableName: string) {
    this.tableName = tableName;
  }
  
  async findById(id: number): Promise<T | null> {
    const result = await db.query(
      `SELECT * FROM ${this.tableName} WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }
  
  async findAll(conditions?: Record<string, any>): Promise<T[]> {
    if (!conditions) {
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
  }
  
  // Additional methods for create, update, delete, etc.
}
```

### 4. React Hooks and Custom Components

Create reusable hooks for common tasks:

```typescript
// src/hooks/useApi.ts
import { useState, useEffect } from 'react';
import axios, { AxiosRequestConfig, AxiosError } from 'axios';

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
  error: Error | null;
  execute: () => Promise<T | null>;
}

export function useApi<T>(options: UseApiOptions<T>): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(options.immediate !== false);
  const [error, setError] = useState<Error | null>(null);

  const execute = async (): Promise<T | null> => {
    try {
      setLoading(true);
      setError(null);

      const config: AxiosRequestConfig = {
        url: options.url,
        method: options.method || 'GET',
        headers: options.headers || {},
      };

      if (options.body && (options.method === 'POST' || options.method === 'PUT')) {
        config.data = options.body;
      }

      const response = await axios(config);
      setData(response.data);
      return response.data;
    } catch (err) {
      const error = err as AxiosError;
      setError(error as Error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (options.immediate !== false) {
      execute();
    }
  }, options.deps || []);

  return { data, loading, error, execute };
}
```

### 5. Configuration Management

Centralize and standardize configuration handling:

```typescript
// src/config/index.ts
import dotenv from 'dotenv';

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
requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
});

export default {
  server: {
    port: process.env.PORT || 5000,
    nodeEnv: process.env.NODE_ENV || 'development',
    frontendUrl: process.env.FRONTEND_URL || 'https://localhost:5173'
  },
  database: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5433'),
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
    cookieMaxAge: parseInt(process.env.COOKIE_MAX_AGE || '86400000')
  },
  battlenet: {
    clientId: process.env.BATTLE_NET_CLIENT_ID,
    clientSecret: process.env.BATTLE_NET_CLIENT_SECRET,
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
```

## Step-by-Step Implementation Plan

### Phase 1: Project Setup & Architecture (Week 1)

1. **Project initialization**
   - Setup TypeScript configuration with strict type checking
   - Initialize appropriate ESLint/Prettier configuration
   - Create folder structure with clear separation of concerns

2. **Core infrastructure**
   - Define shared types and interfaces
   - Create standardized API client
   - Implement error handling utilities
   - Set up environment configuration management

3. **Database setup**
   - Define schema with proper constraints and indexes
   - Create base model classes
   - Implement data validation

### Phase 2: Authentication & User Management (Week 2)

1. **Battle.net OAuth integration**
   - Implement secure OAuth flow
   - Create JWT token management with proper security
   - Add refresh token support
   - Implement user session management

2. **User management**
   - Create user profiles with proper validation
   - Implement authentication middleware
   - Add role-based access control

### Phase 3: Guild & Event Management (Week 3)

1. **Guild functionality**
   - Battle.net API integration for guild data
   - Guild member management
   - Guild data caching and refresh logic

2. **Event system**
   - Event creation and management
   - Calendar integration
   - Event subscription system
   - Notification system (optional)

### Phase 4: Frontend Implementation (Week 4)

1. **Core components**
   - Reusable UI components
   - Form handling with validation
   - Authentication flow

2. **Guild & Event UI**
   - Guild selection and display
   - Calendar interface
   - Event creation and subscription forms
   - Responsive design

### Phase 5: Testing, Documentation & Deployment (Week 5)

1. **Testing**
   - Unit tests for core functionality
   - Integration tests for API endpoints
   - End-to-end testing for critical flows

2. **Documentation**
   - API documentation (OpenAPI/Swagger)
   - Code documentation
   - User documentation

3. **Deployment**
   - Infrastructure setup
   - CI/CD pipeline
   - Monitoring and logging

## Best Practices to Follow

### 1. Type Safety

- Use explicit TypeScript types everywhere; avoid `any`
- Create interfaces for all data structures
- Use type guards when type checking is needed

### 2. Error Handling

- Use a consistent approach for error handling across the application
- Implement proper user feedback for errors
- Log detailed errors for debugging but present user-friendly messages

### 3. Code Organization

- Follow the Single Responsibility Principle
- Create smaller, focused components and functions
- Use consistent naming conventions

### 4. State Management

- Use React Context for global state
- Utilize custom hooks for reusable logic
- Consider using a state management library for complex state

### 5. Testing

- Write tests for critical functionality
- Use testing utilities like React Testing Library
- Implement integration tests for API endpoints

### 6. Security

- Store sensitive data in environment variables
- Implement proper authentication and authorization
- Use HTTPS and secure cookies
- Validate all user inputs

### 7. Performance

- Implement data caching where appropriate
- Use pagination for large data sets
- Optimize database queries
- Implement proper loading states

### 8. File and Directory Structure

**Backend**
```
backend/
├── src/
│   ├── config/            # Configuration files
│   ├── controllers/       # Route controllers
│   ├── db/                # Database connection and base models
│   ├── middleware/        # Custom middleware
│   ├── models/            # Data models
│   ├── routes/            # API routes
│   ├── services/          # Business logic
│   ├── types/             # TypeScript interfaces and types
│   ├── utils/             # Utility functions
│   └── index.ts           # Application entry point
├── tests/                 # Test files
├── .env.example           # Example environment variables
├── package.json
└── tsconfig.json
```

**Frontend**
```
frontend/
├── public/                # Static assets
├── src/
│   ├── assets/            # Images, fonts, etc.
│   ├── components/        # Reusable UI components
│   │   ├── common/        # Generic UI components
│   │   ├── event/         # Event-related components
│   │   ├── guild/         # Guild-related components
│   │   └── layout/        # Layout components
│   ├── context/           # Context providers
│   ├── hooks/             # Custom React hooks
│   ├── pages/             # Page components
│   ├── services/          # API services
│   ├── types/             # TypeScript interfaces and types
│   ├── utils/             # Utility functions
│   ├── App.tsx            # Root component
│   └── main.tsx           # Application entry point
├── tests/                 # Test files
├── .env.example           # Example environment variables
├── package.json
└── tsconfig.json
```
