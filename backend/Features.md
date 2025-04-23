# WoW Guild Manager - Backend Features

This document describes the key features provided by the WoW Guild Manager backend service.

## Core Features

* **RESTful API:** Provides API endpoints for the frontend application to interact with backend data and services.
* **Battle.net Integration:** Connects to the Battle.net API to fetch World of Warcraft game data (guilds, characters, rosters, etc.). Includes rate limiting to respect API constraints.
* **Database Storage:** Uses a PostgreSQL database to store user information, guild data, event details, character information, and session data.
* **Background Data Synchronization:** Periodically synchronizes guild and character data from the Battle.net API to keep the local database up-to-date.

## Feature Details

### 1. Authentication & Authorization

* **Battle.net OAuth 2.0:** Handles user login via the Battle.net OAuth flow (`/api/auth/login`, `/api/auth/callback`).
* **JWT-Based Sessions:** Uses JSON Web Tokens (stored in secure, HTTP-only cookies) and server-side sessions (stored in PostgreSQL via `connect-pg-simple`) to manage user authentication state.
* **Token Refresh:** Allows refreshing access tokens using refresh tokens (`/api/auth/refresh`).
* **User Information:** Provides an endpoint to retrieve the currently authenticated user's details (`/api/auth/me`).
* **Logout:** Provides an endpoint to clear the session cookie (`/api/auth/logout`).
* **Role-Based Access Control (RBAC):**
  * Middleware (`authenticateJWT`) protects most API routes, ensuring only logged-in users can access them.
  * Specific roles (e.g., `ADMIN`, `GUILD_MASTER`) are required for certain actions (e.g., updating user roles, managing guild ranks).
  * Admin endpoint to update user roles (`/api/auth/role`).

### 2. Guild Management

* **Fetch User Guilds:** Retrieves a list of guilds the authenticated user is a member of (`/api/guilds/user`).
* **Fetch Guild Details:** Retrieves detailed information about a specific guild by ID or by region/realm/name (`/api/guilds/id/:guildId`, `/api/guilds/:region/:realm/:name`).
* **Roster Management:**
  * Fetches basic guild member list (`/api/guilds/:guildId/members`).
  * Fetches enhanced guild member data, potentially including more details from Battle.net (`/api/guilds/:guildId/members/enhanced`).
  * Provides a classified roster distinguishing between main characters and alts (`/api/guilds/:guildId/classified-roster`).
  * Retrieves guild member activity data (`/api/guilds/:guildId/member-activity`).
* **Rank Management:**
  * Fetches guild ranks (`/api/guilds/:guildId/ranks`).
  * Fetches guild rank structure including member counts per rank (`/api/guilds/:guildId/rank-structure`).
  * Allows Guild Masters to update rank names (`/api/guilds/:guildId/ranks/:rankId`).

### 3. Event Management

* **CRUD Operations:** Allows creating, reading, updating, and deleting guild events (`/api/events/`, `/api/events/:eventId`, `/api/events/guild/:guildId`).
* **Event Subscriptions:**
  * Allows users to subscribe to or sign up for events (`/api/events/:eventId/subscribe`).
  * Allows users to update their subscription status (e.g., confirmed, tentative, absent) (`/api/events/:eventId/subscribe`).
  * Allows users to unsubscribe from events (`/api/events/:eventId/subscribe` with DELETE method).
  * Retrieves a list of subscribers for a specific event (`/api/events/:eventId/subscribers`).

### 4. Character Management

* **Fetch User Characters:** Retrieves a list of characters associated with the authenticated user's Battle.net account (`/api/characters/`).

### 5. Background Synchronization (`jobs/battlenet-sync/`)

* **Scheduled Job:** Runs automatically based on the `SYNC_JOB_CRON_SCHEDULE` environment variable (defaults to hourly).
* **Data Fetching:** Pulls updated guild roster, ranks, and character data from the Battle.net API.
* **Data Comparison & Update:** Compares fetched data with the database and updates records accordingly (e.g., new members, rank changes, character updates).
* **Character Data Backfill:** Includes logic (potentially run via scripts) to backfill detailed character data (`/src/scripts/backfill-character-data.ts`).
* **Rate Limiting:** Uses `bottleneck` to manage API calls within Battle.net limits.
* **Configurable Sync Limit:** Limits the number of characters processed per sync run (`CHARACTER_SYNC_LIMIT` environment variable).

### 6. Server & Utilities

* **HTTPS Support (Development):** Runs an HTTPS server using self-signed certificates for local development.
* **HTTP Support (Production):** Runs an HTTP server, expecting HTTPS termination at a reverse proxy layer.
* **Health Checks:** Provides basic health check endpoints (`/api/health`, `/api/healthcheck`).
* **Error Handling:** Includes middleware for handling 404 Not Found errors and general application errors.
* **Logging:** Uses Pino for structured JSON logging.
