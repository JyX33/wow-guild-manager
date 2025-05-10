import { Request } from 'express';
import { AppError } from './error-handler.js';
import {
  ErrorCode,
  ERROR_STATUS_MAPPING,
  ValidationErrorDetail,
  DatabaseErrorDetail,
  ExternalApiErrorDetail,
  ResourceErrorDetail
} from '../../../shared/types/error.js';

/**
 * Creates a validation error with typed details
 */
export function createValidationError(
  message: string,
  fields: Record<string, string>,
  invalidValue?: unknown,
  request?: Request
): AppError {
  const details: ValidationErrorDetail = {
    type: 'validation',
    fields,
    invalidValue
  };
  
  return new AppError(message, 400, {
    details,
    code: ErrorCode.VALIDATION_ERROR,
    request
  });
}

/**
 * Creates a database-related error with typed details
 */
export function createDatabaseError(
  message: string,
  options?: {
    code?: string;
    constraint?: string;
    table?: string;
    column?: string;
    request?: Request;
  }
): AppError {
  const details: DatabaseErrorDetail = {
    type: 'database',
    code: options?.code,
    constraint: options?.constraint,
    table: options?.table,
    column: options?.column
  };
  
  return new AppError(message, 500, {
    details,
    code: ErrorCode.DATABASE_ERROR,
    request: options?.request
  });
}

/**
 * Creates an external API error with typed details
 */
export function createExternalApiError(
  message: string,
  provider: string,
  options?: {
    statusCode?: number;
    errorCode?: string | number;
    originalMessage?: string;
    requestId?: string;
    endpoint?: string;
    request?: Request;
  }
): AppError {
  const details: ExternalApiErrorDetail = {
    type: 'external_api',
    provider,
    statusCode: options?.statusCode,
    errorCode: options?.errorCode,
    originalMessage: options?.originalMessage,
    requestId: options?.requestId,
    endpoint: options?.endpoint
  };
  
  return new AppError(message, 502, {
    details,
    code: ErrorCode.EXTERNAL_API_ERROR,
    request: options?.request
  });
}

/**
 * Creates a resource-related error (not found, conflicts)
 */
export function createResourceError(
  message: string,
  resourceType: string,
  errorCode: ErrorCode,
  options?: {
    resourceId?: string | number;
    operation?: 'create' | 'read' | 'update' | 'delete';
    request?: Request;
  }
): AppError {
  const details: ResourceErrorDetail = {
    type: 'resource',
    resourceType,
    resourceId: options?.resourceId,
    operation: options?.operation
  };
  
  const status = ERROR_STATUS_MAPPING[errorCode] || 500;
  
  return new AppError(message, status, {
    details,
    code: errorCode,
    request: options?.request
  });
}

/**
 * Creates a not found error for a specific resource
 */
export function createNotFoundError(
  resourceType: string,
  resourceId?: string | number,
  request?: Request
): AppError {
  return createResourceError(
    `${resourceType}${resourceId ? ` with ID ${resourceId}` : ''} not found`,
    resourceType,
    ErrorCode.NOT_FOUND,
    { resourceId, operation: 'read', request }
  );
}

/**
 * Creates an unauthorized error
 */
export function createUnauthorizedError(
  message = 'Unauthorized access',
  request?: Request
): AppError {
  return new AppError(message, 401, {
    code: ErrorCode.UNAUTHORIZED,
    request
  });
}

/**
 * Creates a forbidden error
 */
export function createForbiddenError(
  message = 'Forbidden access',
  request?: Request
): AppError {
  return new AppError(message, 403, {
    code: ErrorCode.FORBIDDEN,
    request
  });
}

/**
 * Creates a rate limit error
 */
export function createRateLimitError(
  message = 'Rate limit exceeded',
  details?: Record<string, unknown>,
  request?: Request
): AppError {
  return new AppError(message, 429, {
    details: { type: 'resource', ...details },
    code: ErrorCode.RATE_LIMITED,
    request
  });
}

/**
 * Creates a general application error with the appropriate status code
 */
export function createAppError(
  message: string,
  errorCode: ErrorCode,
  details?: Record<string, unknown>,
  request?: Request
): AppError {
  const status = ERROR_STATUS_MAPPING[errorCode] || 500;
  
  return new AppError(message, status, {
    details,
    code: errorCode,
    request
  });
}