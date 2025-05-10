// Structured error types to replace generic 'any' in error handling

// Base Error detail types - more specific than 'any'
export type ErrorDetail = 
  | ValidationErrorDetail
  | DatabaseErrorDetail
  | ExternalApiErrorDetail
  | ResourceErrorDetail
  | Record<string, unknown>;

// Validation errors with field-specific details
export interface ValidationErrorDetail {
  type: 'validation';
  fields: Record<string, string>;
  invalidValue?: unknown;
}

// Database-specific error details
export interface DatabaseErrorDetail {
  type: 'database';
  code?: string;
  constraint?: string;
  table?: string;
  column?: string;
}

// External API errors (like Battle.net API)
export interface ExternalApiErrorDetail {
  type: 'external_api';
  provider: string;
  statusCode?: number;
  errorCode?: string | number;
  originalMessage?: string;
  requestId?: string;
  endpoint?: string;
}

// Resource-related error details (not found, conflicts, etc.)
export interface ResourceErrorDetail {
  type: 'resource';
  resourceType: string;
  resourceId?: string | number;
  operation?: 'create' | 'read' | 'update' | 'delete';
}

// Request context for enhanced error reporting
export interface RequestContext {
  method: string;
  path: string;
  params: Record<string, unknown>;
  query: Record<string, unknown>;
  ip?: string;
  userId?: number;
}

// Standardized error codes aligned with HTTP status codes
export enum ErrorCode {
  // 400 range errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  METHOD_NOT_ALLOWED = 'METHOD_NOT_ALLOWED',
  CONFLICT = 'CONFLICT',
  GONE = 'GONE',
  UNPROCESSABLE_ENTITY = 'UNPROCESSABLE_ENTITY',
  RATE_LIMITED = 'RATE_LIMITED',
  
  // 500 range errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  NOT_IMPLEMENTED = 'NOT_IMPLEMENTED',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  
  // Auth specific errors
  INVALID_TOKEN = 'INVALID_TOKEN',
  EXPIRED_TOKEN = 'EXPIRED_TOKEN',
  MISSING_TOKEN = 'MISSING_TOKEN',
  
  // Business logic errors
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  RESOURCE_LIMIT_REACHED = 'RESOURCE_LIMIT_REACHED',
  DUPLICATE_ENTITY = 'DUPLICATE_ENTITY',
  INVALID_OPERATION = 'INVALID_OPERATION',
  DEPENDENCY_ERROR = 'DEPENDENCY_ERROR'
}

// HTTP Status code mapping for error codes
export const ERROR_STATUS_MAPPING: Record<ErrorCode, number> = {
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.BAD_REQUEST]: 400,
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.METHOD_NOT_ALLOWED]: 405,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.GONE]: 410,
  [ErrorCode.UNPROCESSABLE_ENTITY]: 422,
  [ErrorCode.RATE_LIMITED]: 429,
  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.DATABASE_ERROR]: 500,
  [ErrorCode.EXTERNAL_API_ERROR]: 502,
  [ErrorCode.NOT_IMPLEMENTED]: 501,
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,
  [ErrorCode.INVALID_TOKEN]: 401,
  [ErrorCode.EXPIRED_TOKEN]: 401,
  [ErrorCode.MISSING_TOKEN]: 401,
  [ErrorCode.INSUFFICIENT_PERMISSIONS]: 403,
  [ErrorCode.RESOURCE_LIMIT_REACHED]: 403,
  [ErrorCode.DUPLICATE_ENTITY]: 409,
  [ErrorCode.INVALID_OPERATION]: 400,
  [ErrorCode.DEPENDENCY_ERROR]: 424
};

// Type guard functions for error details
export function isValidationErrorDetail(detail: unknown): detail is ValidationErrorDetail {
  return (
    typeof detail === 'object' &&
    detail !== null &&
    'type' in detail &&
    (detail as ValidationErrorDetail).type === 'validation' &&
    'fields' in detail &&
    typeof (detail as ValidationErrorDetail).fields === 'object'
  );
}

export function isDatabaseErrorDetail(detail: unknown): detail is DatabaseErrorDetail {
  return (
    typeof detail === 'object' &&
    detail !== null &&
    'type' in detail &&
    (detail as DatabaseErrorDetail).type === 'database'
  );
}

export function isExternalApiErrorDetail(detail: unknown): detail is ExternalApiErrorDetail {
  return (
    typeof detail === 'object' &&
    detail !== null &&
    'type' in detail &&
    (detail as ExternalApiErrorDetail).type === 'external_api' &&
    'provider' in detail
  );
}

export function isResourceErrorDetail(detail: unknown): detail is ResourceErrorDetail {
  return (
    typeof detail === 'object' &&
    detail !== null &&
    'type' in detail &&
    (detail as ResourceErrorDetail).type === 'resource' &&
    'resourceType' in detail
  );
}