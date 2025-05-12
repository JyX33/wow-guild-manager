/**
 * Type guard utilities for type-safe runtime checking
 */

import { ValidationErrorDetail, DatabaseErrorDetail, ExternalApiErrorDetail, ResourceErrorDetail } from './errors';

/**
 * Type guards for error details
 */
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