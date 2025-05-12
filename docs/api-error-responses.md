# API Error Response Guide

This document provides guidance for frontend developers on handling error responses from the WoW Guild Manager API.

## Standard Error Response Format

All API errors follow this standard format:

```json
{
  "success": false,
  "error": {
    "message": "Human-readable error message",
    "code": "ERROR_CODE_ENUM_VALUE",
    "details": {
      "type": "error_type",
      // Additional type-specific fields
    },
    "status": 400
  }
}
```

## Error Codes

The following error codes are used across the API:

| Error Code | HTTP Status | Description |
|------------|------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `NOT_FOUND` | 404 | Resource not found |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Permission denied |
| `DATABASE_ERROR` | 500 | Database operation error |
| `EXTERNAL_API_ERROR` | 502 | Error from external service (Battle.net) |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

## Error Details by Type

### Validation Errors

Validation errors provide field-specific error messages:

```json
{
  "success": false,
  "error": {
    "message": "Invalid input data",
    "code": "VALIDATION_ERROR",
    "details": {
      "type": "validation",
      "fields": {
        "name": "Character name is required",
        "realm": "Realm name is required"
      },
      "invalidValue": {
        // The invalid input that was provided
      }
    },
    "status": 400
  }
}
```

### Resource Errors

Resource errors occur when operations on resources fail:

```json
{
  "success": false,
  "error": {
    "message": "Character with ID 123 not found",
    "code": "NOT_FOUND",
    "details": {
      "type": "resource",
      "resourceType": "Character",
      "resourceId": "123",
      "operation": "read"
    },
    "status": 404
  }
}
```

### External API Errors

Errors from external APIs like Battle.net:

```json
{
  "success": false,
  "error": {
    "message": "Battle.net API error",
    "code": "EXTERNAL_API_ERROR",
    "details": {
      "type": "external_api",
      "provider": "battlenet",
      "statusCode": 429,
      "errorCode": "RATE_LIMIT_EXCEEDED",
      "originalMessage": "Too many requests",
      "endpoint": "/profile/wow/character/realm/name"
    },
    "status": 502
  }
}
```

## Client-Side Error Handling

### Basic Error Handling

```typescript
import { useApi } from '../hooks/useApi';

// In your component:
const { data, error, isLoading } = useApi('getResource', [resourceId]);

// Handle error in JSX
if (error) {
  return <div className="error">
    <h3>Error: {error.message}</h3>
    {error.code === 'VALIDATION_ERROR' && (
      <ul>
        {Object.entries(error.details?.fields || {}).map(([field, message]) => (
          <li key={field}>{field}: {message}</li>
        ))}
      </ul>
    )}
  </div>;
}
```

### Form Validation Errors

```typescript
const submitForm = async (formData) => {
  try {
    const response = await api.createResource(formData);
    // Handle success
  } catch (error) {
    if (error.code === 'VALIDATION_ERROR') {
      // Set field errors in your form state
      const fieldErrors = error.details?.fields || {};
      setErrors(fieldErrors);
    } else {
      // Handle other types of errors
      setGlobalError(error.message);
    }
  }
};
```

### Handling Not Found

```typescript
// In your component:
const { data, error, isLoading } = useApi('getResource', [resourceId]);

if (error?.code === 'NOT_FOUND') {
  return <Navigate to="/not-found" replace />;
}
```

### Authentication Errors

```typescript
// In your API interceptor:
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'UNAUTHORIZED') {
      // Redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

## Testing Errors

When writing tests, you can mock error responses like this:

```typescript
// Mock API response
mockApi.getResource.mockRejectedValue({
  success: false,
  error: {
    message: 'Resource not found',
    code: 'NOT_FOUND',
    details: {
      type: 'resource',
      resourceType: 'Resource',
      resourceId: '123',
      operation: 'read'
    },
    status: 404
  }
});
```

## Common Error Scenarios

| Scenario | Error Code | HTTP Status |
|----------|------------|-------------|
| Missing required fields | `VALIDATION_ERROR` | 400 |
| Invalid ID format | `VALIDATION_ERROR` | 400 |
| Resource not found | `NOT_FOUND` | 404 |
| Not logged in | `UNAUTHORIZED` | 401 |
| Accessing another user's resource | `FORBIDDEN` | 403 |
| Battle.net API unavailable | `EXTERNAL_API_ERROR` | 502 |
| Database query error | `DATABASE_ERROR` | 500 |
| Too many Battle.net API calls | `RATE_LIMITED` | 429 |
| Unexpected server error | `INTERNAL_ERROR` | 500 |