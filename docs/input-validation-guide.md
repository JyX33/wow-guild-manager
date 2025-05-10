# Input Validation Guide

This document explains the input validation approach used in the WoW Guild Manager application.

## Overview

The application implements a consistent request validation pattern across all controllers using Zod, a TypeScript-first schema validation library. This ensures that all incoming data is properly validated before reaching the business logic, providing:

- Strong type safety
- Clear validation error messages
- Consistent error responses
- Reduced duplication of validation logic

## Components

The validation system consists of these main components:

1. **Validation Middleware**: A reusable Express middleware that validates requests against Zod schemas
2. **Schema Definitions**: Type-safe schemas defined for each API endpoint
3. **Validated Routes**: Alternative route files that incorporate validation middleware
4. **Error Handling**: Integration with the existing error handling system

## Validation Middleware

The validation middleware (`validation.middleware.ts`) supports validating different parts of a request:

- Request body
- URL parameters 
- Query parameters
- Headers

Example usage:

```typescript
// Validate request body
app.post('/users', 
  validate(createUserSchema, ValidateTarget.BODY),
  userController.createUser
);

// Validate URL parameters
app.get('/users/:userId', 
  validate(userIdParamSchema, ValidateTarget.PARAMS),
  userController.getUserById
);

// Validate query parameters
app.get('/search', 
  validate(searchQuerySchema, ValidateTarget.QUERY),
  searchController.search
);
```

## Schema Definitions

Schemas are defined using Zod and are organized in the `src/schemas` directory:

- `common.schema.ts`: Reusable schema components
- Domain-specific schemas for different API areas (auth, guild, etc.)

Example schema:

```typescript
// User ID parameter validation
export const userIdParamSchema = z.object({
  userId: z.number().int().positive('User ID must be a positive integer')
    .or(z.string().regex(/^\d+$/).transform(Number))
});

// User creation validation
export const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});
```

## Validated Routes

The application provides validated route files in `src/routes/validated` that incorporate the validation middleware. To use these routes, use:

```typescript
import { registerValidatedRoutes } from './routes/validated';

// Register all validated routes
registerValidatedRoutes(app);
```

Or use `index.validated.ts` as your entry point to automatically use validated routes.

## Error Handling

When validation fails, the middleware generates a standardized error response using the application's existing error factory:

```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "details": {
      "type": "validation",
      "fields": {
        "email": "Valid email is required",
        "password": "Password must be at least 8 characters"
      }
    },
    "status": 400
  }
}
```

## How to Add Validation to New Endpoints

1. Define a schema in the appropriate schema file (or create a new one if needed)
2. Import the schema and validation middleware in your route file
3. Add validation middleware to the route:

```typescript
router.post(
  '/endpoint',
  validate(requestSchema, ValidateTarget.BODY),
  yourController.handler
);
```

## Testing

Validation can be tested by:

1. Unit tests for individual schemas
2. Integration tests for API endpoints with both valid and invalid payloads
3. Using the validation middleware in isolation

## Benefits

- Early error detection before controller logic executes
- Consistent error messages and format across the API
- Automatic transformation of types (strings to numbers, etc.)
- Self-documenting API contracts
- Reduced boilerplate validation code in controllers

## Extending the System

The validation system can be extended by:

1. Adding new schema files for new domains
2. Creating more complex validation rules using Zod refinements
3. Adding custom error messages to improve user experience