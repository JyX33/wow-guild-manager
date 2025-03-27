# CLAUDE.md - Development Guidelines

## Build & Run Commands
- Backend: `cd backend && bun start:dev` or `bun --watch src/index.ts`
- Frontend: `cd frontend && npm run dev`
- Backend build: `cd backend && bun build`
- Frontend build: `cd frontend && npm run build`
- Frontend lint: `cd frontend && npm run lint`
- Database migrations: `cd backend && node database/migrate.js`

## Code Style Guidelines
- **Imports**: Group imports by external libraries, then internal modules with absolute paths
- **TypeScript**: Use strict typing - all parameters, return values, and variables must be typed
- **Naming**: camelCase for variables/functions, PascalCase for classes/interfaces/components
- **Error Handling**: Use try/catch with detailed error messages in controllers, implement transaction.rollback pattern
- **Components**: Functional components with React hooks, proper prop typing with interfaces
- **Routing**: RESTful endpoints, controller separation, middleware for auth
- **Models**: Extend BaseModel, implement consistent CRUD operations
- **API Patterns**: Use service layer for external API calls, follow rate limiting requirements

## Architecture
- TypeScript + Express backend with PostgreSQL database
- React + Vite frontend with TailwindCSS
- Shared types between frontend and backend