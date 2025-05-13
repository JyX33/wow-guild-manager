# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run Commands

### Backend

- Development server: `cd backend && bun start:dev` or `cd backend && bun --watch src/index.ts`
- Production build: `cd backend && bun build`
- Run tests: `cd backend && bun test`
- Debug tests: `cd backend && bun test:debug`
- Database migrations: `cd backend && node database/migrate.js` or `cd backend && bun run migrate`
- Type checking: `cd backend && bun type-check` or `cd backend && tsc --noEmit -p tsconfig.json`
- Find unused exports: `cd backend && bun run find-unused-exports`
- Backfill character data: `cd backend && bun run backfill:chars`
- Type check shared and backend: `cd backend && bun run type-check` (builds shared types first)
- Type check backend only: `cd backend && bun run type-check:src`

### Frontend

- Development server: `cd frontend && npm run dev`
- Production build: `cd frontend && npm run build`
- Production preview: `cd frontend && npm run preview`
- Lint code: `cd frontend && npm run lint`

### Shared Types

- Build shared types: `cd shared && bun run build`
- Test types: `cd shared && bun run test:types`
- Update imports: `cd shared && bun run update-imports`

### Database

- Initialize database: `scripts/init_db.sh`
- Add indexes: `scripts/add_database_indexes.sql`

## Architecture Overview

### Core Technologies

- **Backend**: TypeScript 5.8, Bun runtime, Node.js, Express.js 4.21, PostgreSQL 8.14, Zod 3.24 (validation)
- **Frontend**: React 19, TypeScript 5.8, Vite 6.2, TailwindCSS 4.0
- **Authentication**: Battle.net OAuth with JWT tokens (jsonwebtoken 9.0)
- **API Management**: Axios 1.8, React Query (@tanstack/react-query 5.69)
- **Form Handling**: Formik 2.4, Yup 1.6 validation
- **Discord Integration**: Discord.js 14.18
- **Performance**: Bottleneck 2.19 (rate limiting), p-queue 8.1
- **Logging**: Pino 9.6 with pino-pretty 13.0

### Backend Architecture

1. **Model Layer**:
   - All models extend `BaseModel` class for type-safe CRUD operations
   - PostgreSQL with JSON/JSONB support for flexible data structures
   - Strong typing for database queries using TypeScript generics
   - Transactions pattern with rollback for error handling

2. **Controller Layer**:
   - Controllers handle specific domain entities (auth, guild, character, event, roster)
   - Use asyncHandler wrapper for all controller methods
   - Standardized error handling with error-factory utilities
   - Proper request and response typing with shared type definitions

3. **Service Layer**:
   - Enhanced Battle.net API client with advanced validation and error handling
   - Type-safe adapters and validators for API responses
   - Rate limiting with Bottleneck and queue management
   - Discord integration services for event notifications and reminders

4. **Input Validation**:
   - Zod schemas for strong request validation
   - Validation middleware for automatic request schema enforcement
   - Typed error responses for validation failures

5. **Background Jobs**:
   - Scheduled Battle.net data synchronization with node-schedule
   - Differential guild sync to minimize API usage
   - Discord thread cleanup and event reminder services
   - Proper error handling and logging for background processes

### Frontend Architecture

1. **State Management**:
   - React Context for auth state with proper TypeScript interfaces
   - TanStack React Query v5 for API data fetching, caching, and synchronization
   - Formik with Yup for type-safe form state management
   - Custom hooks for shared functionality

2. **Component Structure**:
   - React 19 functional components with proper TypeScript types
   - Pages for main views with consistent layout patterns
   - Reusable UI components with proper prop typing
   - Form components with standardized validation
   - Error boundaries for graceful error handling

3. **API Communication**:
   - Axios client with interceptors for auth and error handling
   - Service-based API modules for domain-specific endpoints
   - Shared type definitions between frontend and backend
   - Custom useApi hook with cache management
   - Strongly typed API responses and error handling

4. **Authentication**:
   - JWT token-based auth with secure storage
   - Automatic token refresh mechanism
   - Role-based access control (user, guild_leader, admin)
   - Protected routes with withAuth HOC
   - Battle.net OAuth integration

### Type System

- Dedicated shared types package used by both frontend and backend
- Strongly typed API request and response interfaces
- Database type definitions with TypeScript generics for query safety
- Enhanced types for Battle.net API responses with validators and adapters
- Zod schemas for runtime request validation with TypeScript integration
- Proper error type hierarchy for consistent error handling
- Type guards and type predicates for runtime type safety
- Configuration types for environment variables and settings
- Enum types for consistent values across the application
- Extended database types for JSON/JSONB field access

## Code Style Guidelines

- **Imports**: Group imports by external libraries, then internal modules with absolute paths
- **TypeScript**: Use strict typing - all parameters, return values, and variables must be typed
- **Type Annotations**: Prefer TypeScript interfaces for complex objects and type aliases for simpler types
- **Generics**: Use TypeScript generics for reusable components and functions
- **Naming**: camelCase for variables/functions, PascalCase for classes/interfaces/components
- **Error Handling**: Use asyncHandler wrapper and error factory utilities, not direct try/catch
- **Components**: Functional components with React hooks, proper prop typing with interfaces
- **Routing**: RESTful endpoints, controller separation, middleware for auth and validation
- **Models**: Extend BaseModel with proper generics, implement consistent CRUD operations
- **API Patterns**: Use service layer for external API calls, follow rate limiting requirements
- **Comments**: Use JSDoc-style comments for public APIs and complex functions
- **Code Organization**: Keep related code together, separate concerns appropriately
- **Null Handling**: Use optional chaining and nullish coalescing for safer code

## Important Implementation Patterns

1. **Database Queries**:
   - Use the type-safe query methods from BaseModel with proper generics
   - For complex queries, use transaction pattern with proper error handling
   - Ensure proper JSON/JSONB field handling with TypeScript type safety
   - Use parameterized queries instead of string interpolation for security
   - Implement pagination for queries returning large result sets

2. **Error Handling**:
   - Controllers must use asyncHandler wrapper from error-handler.js
   - Use error factory utilities for all error creation:
     - createValidationError - For invalid input data
     - createNotFoundError - When resource doesn't exist
     - createUnauthorizedError - For authentication errors
     - createForbiddenError - For permission issues
     - createDatabaseError - For database operation failures
     - createExternalApiError - For Battle.net API errors
     - createAppError - For general application errors
   - Always include request context and appropriate error codes
   - Log errors with proper severity levels and supporting details
   - Handle errors at the appropriate level (controller, service, model)

3. **API Responses**:
   - Use standardized ApiResponse<T> interface with proper generics
   - Include proper typing for success and error cases
   - Implement pagination for list endpoints
   - Return consistent error structure as defined in docs/api-error-responses.md
   - Use proper HTTP status codes for different response types

4. **Authentication**:
   - Check user authentication with auth middleware
   - Verify guild ownership for guild-specific operations
   - Apply role-based access control using middleware
   - Handle token refresh securely
   - Implement proper session management with PostgreSQL session store

5. **Battle.net API Integration**:
   - Use the Enhanced BattleNet API client for consistent API calls
   - Implement proper validation of API responses
   - Apply rate limiting and queuing for API requests
   - Handle common API errors gracefully with proper fallbacks
   - Implement retry logic for transient errors

6. **Guild Synchronization**:
   - Implement differential sync to minimize API calls
   - Handle character classification (main/alt relationships)
   - Process guild ranks and member changes correctly
   - Schedule regular sync jobs with proper logging
   - Implement background processing for large sync operations

7. **Discord Integration**:
   - Use Discord.js for bot functionality
   - Register slash commands for user interaction
   - Implement event notifications and reminders
   - Manage thread cleanup for old events
   - Handle Discord API errors gracefully

## Error Handling Standards

See the comprehensive guide at `docs/error-handling-standards.md`. Key points:

1. All controllers must use the `asyncHandler` wrapper from error-handler.js
2. Error creation must use utilities from error-factory.js with proper types
3. Standard error structure must be followed for frontend interoperability
4. Include appropriate error codes from the ErrorCode enum in shared types
5. Error responses must include helpful validation details when applicable
6. Log all errors with appropriate context and severity before throwing
7. Use the centralized error handling middleware for consistent responses
8. Handle known error types differently from unknown errors
9. Include stack traces in development but not in production
10. Implement proper input validation to prevent errors at the source

## Development Best Practices

1. **Type Safety**:
   - Avoid using `any` type whenever possible
   - Use proper generics for reusable components
   - Leverage TypeScript's utility types when appropriate
   - Write type guards for runtime type checking

2. **Performance**:
   - Implement caching for expensive operations
   - Use pagination for large datasets
   - Minimize database queries with efficient joins
   - Implement rate limiting for external API calls
   - Profile and optimize slow operations

3. **Testing**:
   - Write unit tests for critical functionality
   - Implement integration tests for API endpoints
   - Test error handling paths, not just happy paths
   - Use test fixtures for consistent test data

4. **Security**:
   - Validate all user input with Zod schemas
   - Use parameterized queries to prevent SQL injection
   - Implement proper authentication and authorization
   - Follow OWASP security guidelines
   - Keep dependencies up to date with security patches