# Phase 3: Eliminating `any` Type in API Response Types

## Overview

This implementation plan focuses on replacing `any` types in API response interfaces and error handling. This is important because it affects how data flows throughout the entire application and how errors are represented.

## Current Issues

1. `ApiResponse` uses a generic type parameter with default `any`
2. `ApiError` has a `details` field of type `any`
3. `ApiRequestConfig` has a `data` field of type `any`
4. Error objects throughout the application use `any` for details

## Implementation Steps

### 1. Create Robust API Response Types

```typescript
// /mnt/f/Projects/wow-guild-manager/shared/types/api.ts

// Standard API response format with improved typing
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: ApiError;
}

// ErrorDetails for structured error information
export interface ErrorDetails {
  [key: string]: string | number | boolean | null | ErrorDetails | Array<string | number | boolean | null | ErrorDetails>;
}

// Error types and structure
export interface ApiError {
  status: number;
  message: string;
  details?: ErrorDetails;
  code?: ErrorCode;
}

export enum ErrorCode {
  VALIDATION_ERROR = 'validation_error',
  AUTHENTICATION_ERROR = 'authentication_error',
  AUTHORIZATION_ERROR = 'authorization_error',
  NOT_FOUND = 'not_found',
  CONFLICT = 'conflict',
  INTERNAL_ERROR = 'internal_error',
  EXTERNAL_API_ERROR = 'external_api_error',
  RATE_LIMIT = 'rate_limit',
  DATABASE_ERROR = 'database_error',
  INVALID_INPUT = 'invalid_input'
}

// ---- Request Configuration ----

// HTTP Methods type
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

// Properly typed request data
export type ApiRequestData = Record<string, unknown> | Array<unknown> | string | number | boolean | null;

// API Request configuration
export interface ApiRequestConfig {
  method: HttpMethod;
  path: string;
  data?: ApiRequestData;
  params?: QueryFilters;
  headers?: Record<string, string>;
  timeout?: number;
}

// ---- API Error Response Types ----

// Define specific error structures for different APIs

// Battle.net API specific error
export interface BattleNetApiError {
  code: number;
  type: string;
  detail: string;
}

// Validation error
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

// Database error
export interface DatabaseError {
  operation: 'query' | 'insert' | 'update' | 'delete';
  table?: string;
  constraint?: string;
  message: string;
}

// Rate limit error
export interface RateLimitError {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
  retryAfter?: number; // Seconds
}

// Union type for structured API errors
export type StructuredApiError = 
  | { type: 'validation'; errors: ValidationError[] }
  | { type: 'database'; error: DatabaseError }
  | { type: 'rate_limit'; error: RateLimitError }
  | { type: 'battle_net'; error: BattleNetApiError }
  | { type: 'generic'; message: string };
```

### 2. Update AppError Class to Use Structured Error Types

```typescript
// /mnt/f/Projects/wow-guild-manager/backend/src/utils/error-handler.ts

import { Request, Response, NextFunction } from 'express';
import { ErrorCode, ErrorDetails, StructuredApiError } from '../../../shared/types/api.js';
import logger from './logger.js';

export class AppError extends Error {
  status: number;
  details?: ErrorDetails | StructuredApiError;
  code?: ErrorCode;
  requestContext?: {
    method: string;
    path: string;
    params: Record<string, string>;
    query: Record<string, string>;
  };

  constructor(
    message: string,
    status: number = 500,
    options?: {
      details?: ErrorDetails | StructuredApiError;
      code?: ErrorCode;
      request?: Request;
    }
  ) {
    super(message);
    this.status = status;
    this.details = options?.details;
    this.code = options?.code;
    this.name = this.constructor.name;

    if (options?.request) {
      this.requestContext = {
        method: options.request.method,
        path: options.request.path,
        params: options.request.params,
        query: options.request.query
      };
    }

    Error.captureStackTrace(this, this.constructor);
  }
  
  // Helper method to create validation errors
  static validationError(message: string, errors: ValidationError[], request?: Request): AppError {
    return new AppError(message, 400, {
      code: ErrorCode.VALIDATION_ERROR,
      details: { type: 'validation', errors },
      request
    });
  }
  
  // Helper method to create database errors
  static databaseError(message: string, dbError: DatabaseError, request?: Request): AppError {
    return new AppError(message, 500, {
      code: ErrorCode.DATABASE_ERROR,
      details: { type: 'database', error: dbError },
      request
    });
  }
  
  // Helper method to create not found errors
  static notFoundError(resource: string, id: string | number, request?: Request): AppError {
    return new AppError(`${resource} with ID ${id} not found`, 404, {
      code: ErrorCode.NOT_FOUND,
      details: { 
        resource, 
        id: String(id) 
      },
      request
    });
  }
  
  // Helper method to create battle.net API errors
  static battleNetError(message: string, error: BattleNetApiError, request?: Request): AppError {
    return new AppError(message, 502, {
      code: ErrorCode.EXTERNAL_API_ERROR,
      details: { type: 'battle_net', error },
      request
    });
  }
}

export const errorHandlerMiddleware = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const status = 'status' in err ? err.status : 500;
  const message = err.message || 'Something went wrong';
  const details = 'details' in err ? err.details : undefined;
  const code = 'code' in err ? err.code : ErrorCode.INTERNAL_ERROR;

  // Enhanced error logging
  if (status >= 500 || (status < 500 && status !== 401 && status !== 404)) {
    const logPayload = {
      error: {
        name: err.name,
        message,
        code,
        status,
        stack: err.stack,
        details,
        request: 'requestContext' in err ? err.requestContext : {
          method: req.method,
          path: req.path,
          params: req.params,
          query: req.query,
          ip: req.ip,
          userId: req.session?.userId
        }
      }
    };
    logger.error(logPayload, `Error handled by middleware: ${message}`);
  }

  res.status(status).json({
    success: false,
    error: {
      message,
      code,
      details,
      status
    }
  });
};

// Other exports...
```

### 3. Update Controllers to Use Structured Errors

```typescript
// Example controller with enhanced error handling
// /mnt/f/Projects/wow-guild-manager/backend/src/controllers/guild.controller.ts

import { Request, Response } from 'express';
import { 
  ErrorCode, 
  ValidationError, 
  DatabaseError 
} from '../../../shared/types/api.js';
import { AppError, asyncHandler } from '../utils/error-handler.js';

export default {
  getGuildById: asyncHandler(async (req: Request, res: Response) => {
    logger.info({ method: req.method, path: req.path, params: req.params, query: req.query, userId: req.session?.userId }, 'Handling getGuildById request');
    const { guildId } = req.params;
    const guildIdInt = parseInt(guildId);

    if (isNaN(guildIdInt)) {
      // Create a validation error with proper structure
      const validationErrors: ValidationError[] = [{
        field: 'guildId',
        message: 'Guild ID must be a valid number',
        code: 'invalid_format',
        value: guildId
      }];
      
      throw AppError.validationError('Invalid guild ID format', validationErrors, req);
    }

    try {
      const guild = await guildModel.findById(guildIdInt);

      if (!guild) {
        throw AppError.notFoundError('Guild', guildIdInt, req);
      }

      res.json({
        success: true,
        data: guild
      });
    } catch (error) {
      // If it's a database error, create a structured database error
      if (error.code === '23503') { // Foreign key violation
        const dbError: DatabaseError = {
          operation: 'query',
          table: 'guilds',
          constraint: error.constraint,
          message: error.message
        };
        
        throw AppError.databaseError('Database error while fetching guild', dbError, req);
      }
      
      // Re-throw other errors
      throw error;
    }
  }),
  
  // Other methods...
}
```

### 4. Update API Service on Frontend

```typescript
// /mnt/f/Projects/wow-guild-manager/frontend/src/services/api/core.ts

import {
  ApiResponse,
  ApiRequestConfig,
  ApiRequestData,
  ErrorCode,
  StructuredApiError
} from '../../../../shared/types/api';

/**
 * Custom error class for API errors with typed details
 */
export class ApiServiceError extends Error {
  status: number;
  code: ErrorCode;
  details?: StructuredApiError;
  
  constructor(message: string, status: number, code: ErrorCode, details?: StructuredApiError) {
    super(message);
    this.name = 'ApiServiceError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
  
  /**
   * Check if this is a validation error
   */
  isValidationError(): boolean {
    return this.code === ErrorCode.VALIDATION_ERROR && 
           this.details?.type === 'validation';
  }
  
  /**
   * Check if this is a rate limit error
   */
  isRateLimitError(): boolean {
    return this.code === ErrorCode.RATE_LIMIT && 
           this.details?.type === 'rate_limit';
  }
  
  /**
   * Check if this is a Battle.net API error
   */
  isBattleNetError(): boolean {
    return this.code === ErrorCode.EXTERNAL_API_ERROR && 
           this.details?.type === 'battle_net';
  }
  
  /**
   * Get validation errors if they exist
   */
  getValidationErrors() {
    if (this.isValidationError() && this.details?.type === 'validation') {
      return this.details.errors;
    }
    return [];
  }
}

/**
 * Core API service with improved type safety
 */
export const apiService = {
  async request<T>(config: ApiRequestConfig): Promise<ApiResponse<T>> {
    const { method, path, data, params, headers = {} } = config;
    
    const url = new URL(path, window.location.origin);
    
    // Add query parameters
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    
    // Set common headers
    const requestHeaders = new Headers(headers);
    requestHeaders.set('Content-Type', 'application/json');
    
    try {
      const response = await fetch(url.toString(), {
        method,
        headers: requestHeaders,
        credentials: 'include',
        body: data ? JSON.stringify(data) : undefined,
      });
      
      const contentType = response.headers.get('content-type');
      
      // If the response is JSON, parse it
      if (contentType && contentType.includes('application/json')) {
        const responseData: ApiResponse<T> = await response.json();
        
        if (!response.ok) {
          // Handle API error with structured error details
          const error = responseData.error;
          if (error) {
            throw new ApiServiceError(
              error.message || 'Unknown API error',
              error.status || response.status,
              error.code as ErrorCode || ErrorCode.INTERNAL_ERROR,
              error.details as StructuredApiError
            );
          }
        }
        
        return responseData;
      }
      
      // Handle non-JSON responses
      if (!response.ok) {
        throw new ApiServiceError(
          'API request failed with non-JSON response',
          response.status,
          ErrorCode.INTERNAL_ERROR,
          { type: 'generic', message: await response.text() }
        );
      }
      
      // Return success for non-JSON responses
      return {
        success: true,
      };
    } catch (error) {
      // Re-throw ApiServiceError instances
      if (error instanceof ApiServiceError) {
        throw error;
      }
      
      // Handle network errors
      throw new ApiServiceError(
        error.message || 'Network error',
        0,
        ErrorCode.INTERNAL_ERROR,
        { type: 'generic', message: error.message }
      );
    }
  },
  
  // Helper methods for common HTTP methods
  get<T>(path: string, params?: Record<string, string | number | boolean>): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'GET', path, params });
  },
  
  post<T>(path: string, data?: ApiRequestData, params?: Record<string, string | number | boolean>): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'POST', path, data, params });
  },
  
  put<T>(path: string, data?: ApiRequestData, params?: Record<string, string | number | boolean>): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'PUT', path, data, params });
  },
  
  delete<T>(path: string, params?: Record<string, string | number | boolean>): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'DELETE', path, params });
  },
};

export default apiService;
```

## Testing Plan

1. Create unit tests for the new error classes and helpers
2. Test error serialization and deserialization
3. Verify frontend error handling correctly parses structured errors
4. Test all API endpoints to ensure they use the new error format
5. Verify that error details are properly structured and typed