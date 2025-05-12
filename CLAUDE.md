# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run Commands

### Backend

- Development server: `cd backend && bun start:dev` or `bun --watch src/index.ts`
- Production build: `cd backend && bun build`
- Run tests: `cd backend && bun test`
- Debug tests: `cd backend && bun test:debug`
- Database migrations: `cd backend && node database/migrate.js`
- Type checking: `cd backend && bun type-check` or `tsc --noEmit -p tsconfig.json`
- Find unused exports: `cd backend && node scripts/find-unused-exports.js`
- Backfill character data: `cd backend && bun backfill:chars`

### Frontend

- Development server: `cd frontend && npm run dev`
- Production build: `cd frontend && npm run build`
- Production preview: `cd frontend && npm run preview`
- Lint code: `cd frontend && npm run lint`

### Database

- Initialize database: `scripts/init_db.sh`
- Add indexes: `scripts/add_database_indexes.sql`

## Architecture Overview

### Core Technologies

- **Backend**: TypeScript, Bun runtime, Node.js, Express.js, PostgreSQL
- **Frontend**: React, TypeScript, Vite, TailwindCSS
- **Authentication**: Battle.net OAuth with JWT tokens
- **API Management**: Axios, React Query
- **Form Handling**: Formik, Yup validation
- **Discord Integration**: Discord.js

### Backend Architecture

1. **Model Layer**:
   - All models extend `BaseModel` class for CRUD operations
   - PostgreSQL with JSON/JSONB support for flexible data structures
   - Transactions pattern with rollback for error handling

2. **Controller Layer**:
   - Controllers handle specific domain entities (auth, guild, character, event, roster)
   - Use asyncHandler wrapper for all controller methods
   - Throw appropriate errors using error-factory utilities

3. **Service Layer**:
   - Battle.net API integration with rate limiting and caching
   - Guild sync services for periodic updates
   - Discord integration services

4. **Input Validation**:
   - Zod schemas for request validation
   - Middleware for automatic request validation

5. **Background Jobs**:
   - Scheduled Battle.net data synchronization
   - Discord thread cleanup and event reminders

### Frontend Architecture

1. **State Management**:
   - React Context for auth state
   - React Query for API data fetching and caching
   - Formik for form state

2. **Component Structure**:
   - Pages for main views
   - Reusable components for UI elements
   - Form components for standardized inputs

3. **API Communication**:
   - Service-based API modules for domain-specific endpoints
   - Shared types between frontend and backend
   - Centralized error handling

4. **Authentication**:
   - Token-based auth with refresh mechanism
   - Role-based access control

### Type System

- Shared type definitions between frontend and backend
- Strong typing for all API requests and responses
- Database type definitions with enhanced JSON field support
- Zod schemas for request validation

## Code Style Guidelines

- **Imports**: Group imports by external libraries, then internal modules with absolute paths
- **TypeScript**: Use strict typing - all parameters, return values, and variables must be typed
- **Naming**: camelCase for variables/functions, PascalCase for classes/interfaces/components
- **Error Handling**: Use asyncHandler wrapper and error factory utilities, not direct try/catch
- **Components**: Functional components with React hooks, proper prop typing with interfaces
- **Routing**: RESTful endpoints, controller separation, middleware for auth
- **Models**: Extend BaseModel, implement consistent CRUD operations
- **API Patterns**: Use service layer for external API calls, follow rate limiting requirements

## Important Implementation Patterns

1. **Database Queries**:
   - Use the type-safe query methods from BaseModel
   - For complex queries, use transaction pattern with proper error handling
   - Ensure proper JSON field handling for database types

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
   - Always include request context when creating errors
   - Log errors with appropriate severity

3. **API Responses**:
   - Use standardized ApiResponse interface for consistency
   - Include proper typing for success and error cases
   - All error responses should follow structure in docs/api-error-responses.md

4. **Authentication**:
   - Check user authentication with auth middleware
   - Verify guild ownership for guild-specific operations
   - Apply role-based access control where required

5. **Battle.net API**:
   - Use the enhanced BattleNet API client for consistent API calls
   - Apply rate limiting for API requests
   - Handle common API errors gracefully

6. **Guild Synchronization**:
   - Implement differential sync to minimize API calls
   - Handle character classification (main/alt relationships)
   - Process guild ranks and member changes correctly

## Error Handling Standards

See the comprehensive guide at `docs/error-handling-standards.md`. Key points:

1. All controllers must use the `asyncHandler` wrapper from error-handler.js
2. Error creation must use utilities from error-factory.js
3. Standard error structure must be followed for frontend interoperability
4. Include appropriate error codes from the ErrorCode enum
5. Error responses must include helpful validation details when applicable
6. Log all errors with appropriate context before throwing