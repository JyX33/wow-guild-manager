# Error Handling Standards

This document defines the standardized approach to error handling across the WoW Guild Manager application.

## Core Principles

1. All controllers must use the `asyncHandler` wrapper for consistent error handling
2. Error creation should use the utility functions in `error-factory.ts`
3. Controllers should focus on throwing appropriate errors, not handling them directly
4. All errors should include appropriate context for debugging
5. Error responses should follow a consistent structure

## Error Handling Pattern

### Controllers

```typescript
// Import required utilities
import { asyncHandler } from "../utils/error-handler.js";
import { 
  createValidationError, 
  createNotFoundError,
  createResourceError,
  createDatabaseError,
  createExternalApiError, 
  createAppError
} from "../utils/error-factory.js";
import { ErrorCode } from "../../../shared/types/utils/errors.js";

// Define controller methods using asyncHandler
export const getSomeResource = asyncHandler(async (req: Request, res: Response) => {
  // Validate inputs with clear error messages
  const resourceId = parseInt(req.params.resourceId, 10);
  if (isNaN(resourceId)) {
    throw createValidationError(
      "Invalid Resource ID.", 
      { resourceId: "Must be a valid integer" },
      resourceId,
      req
    );
  }

  // Call services and check for not found conditions
  const resource = await SomeService.findById(resourceId);
  if (!resource) {
    throw createNotFoundError("Resource", resourceId, req);
  }

  // Success response
  res.status(200).json({ success: true, data: resource });
});
```

## Error Factory Functions

Use the appropriate error factory function based on the error type:

1. `createValidationError` - For invalid input data
2. `createNotFoundError` - When a requested resource doesn't exist
3. `createResourceError` - For general resource operations (create/update/delete issues)
4. `createDatabaseError` - For database-related errors
5. `createExternalApiError` - For errors from external APIs (like Battle.net)
6. `createAppError` - For general application errors

## Error Logging

Every error should be accompanied by appropriate logging:

```typescript
// For normal validation errors, let the middleware handle logging
throw createValidationError(...);

// For unexpected conditions, log with context before throwing
logger.warn(
  { userId, resourceId, operation },
  "Unexpected condition encountered"
);
throw createAppError(...);
```

## Error Response Structure

All error responses follow this JSON structure:

```json
{
  "success": false,
  "error": {
    "message": "Human-readable error message",
    "code": "ERROR_CODE_ENUM_VALUE",
    "details": {
      "type": "validation|resource|database|external_api",
      "fields": { "fieldName": "error reason" }
      // Other type-specific fields
    },
    "status": 400
  }
}
```

## HTTP Status Codes

Use appropriate HTTP status codes:

- 400: Bad Request (validation errors)
- 401: Unauthorized (authentication issues)
- 403: Forbidden (authorization issues)
- 404: Not Found (resource not found)
- 409: Conflict (duplicate resources)
- 429: Too Many Requests (rate limiting)
- 500: Internal Server Error (unexpected errors)
- 502: Bad Gateway (external API errors)

## Error Code Enum

All errors should use values from the `ErrorCode` enum in `shared/types/utils/errors.js`:

```typescript
enum ErrorCode {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  NOT_FOUND = "NOT_FOUND",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  DATABASE_ERROR = "DATABASE_ERROR",
  EXTERNAL_API_ERROR = "EXTERNAL_API_ERROR",
  RATE_LIMITED = "RATE_LIMITED",
  INTERNAL_ERROR = "INTERNAL_ERROR"
  // Add other codes as needed
}
```

## Client-Side Error Handling

The frontend should handle errors consistently by checking:

1. The `success` field to determine if the request succeeded
2. The `error.code` field to handle specific error types
3. The `error.message` field for user-facing messages
4. The `error.details` field for field-specific validation errors

## Testing Error Handling

All API endpoints should include tests for error scenarios:

1. Invalid input data
2. Non-existent resources
3. Unauthorized access
4. Server-side errors

## Example Implementation

See the refactored `roster.controller.ts` for a reference implementation that follows these standards.