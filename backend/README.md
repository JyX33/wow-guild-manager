# WoW Guild Manager - Backend

This is the backend service for the WoW Guild Manager application. It handles
authentication, data fetching from the Battle.net API, guild and event
management, and provides a RESTful API for the frontend.

## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (LTS version recommended)
- [Bun](https://bun.sh/) (as the package manager and runtime)
- [PostgreSQL](https://www.postgresql.org/) (database server)
- A Battle.net Developer Account to obtain API credentials.

## Environment Setup

1. **Copy Environment File:** Duplicate the `.env.example` file and rename the
   copy to `.env`.

   ```bash
   cp .env.example .env
   ```

2. **Configure Environment Variables:** Edit the `.env` file and fill in the
   required values:
   - `PORT`: The port the backend server will run on (default: `5000`).
   - `FRONTEND_URL`: The URL of the frontend application (e.g.,
     `https://localhost:5173`).
   - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`: Your PostgreSQL
     database connection details.
   - `JWT_SECRET`: A strong, secret key for signing JWT tokens.
   - `JWT_ACCESS_TOKEN_EXPIRES_IN`, `JWT_REFRESH_TOKEN_EXPIRES_IN`: Token
     expiration times.
   - `COOKIE_MAX_AGE`: Max age for session cookies in milliseconds.
   - `BATTLE_NET_CLIENT_ID`, `BATTLE_NET_CLIENT_SECRET`: Your Battle.net API
     credentials.
   - `BATTLE_NET_REDIRECT_URI`: The callback URL registered with your Battle.net
     application (must match the backend's `/api/auth/callback` route, e.g.,
     `https://localhost:5000/api/auth/callback`).
   - `BNET_MAX_CONCURRENT`, `BNET_MIN_TIME_MS`: Rate limiting settings for
     Battle.net API calls.
   - `CHARACTER_SYNC_LIMIT`, `SYNC_JOB_CRON_SCHEDULE`: Configuration for the
     background character sync job.

## Database Setup

1. **Ensure PostgreSQL is running** and accessible with the credentials
   specified in your `.env` file.
2. **Create the database** specified in `DB_NAME` if it doesn't exist.
3. **Run Migrations:** Execute the database migrations to set up the required
   tables.

   ```bash
   bun run migrate
   ```

   _Note: This script uses `knex` to apply migrations located in the
   `migrations/` directory._

## Installation

Install the project dependencies using Bun:

```bash
bun install
```

## Running the Application

### Development Mode

To run the server in development mode with live reloading (using Bun's `--watch`
flag and HTTPS with self-signed certificates):

1. **Generate Self-Signed Certificates:** If you haven't already, create a
   `certs` directory in the project root and generate `cert.pem` and `key.pem`
   files. You can use tools like `openssl`:

   ```bash
   # Example using openssl (adjust paths as needed)
   mkdir ../certs 
   openssl req -x509 -newkey rsa:4096 -keyout ../certs/key.pem -out ../certs/cert.pem -sha256 -days 365 -nodes -subj "/C=XX/ST=State/L=City/O=Organization/OU=OrgUnit/CN=localhost"
   ```

   _Ensure these certificates are placed in a `certs/` directory relative to the
   **project root** (one level above the `backend` directory)._
2. **Start the Server:**

   ```bash
   bun run start:dev 
   # or
   bun run dev
   ```

   The server will start on the `PORT` specified in your `.env` file (e.g.,
   `https://localhost:5000`).

### Production Mode

1. **Build the Application:** Compile the TypeScript code to JavaScript:

   ```bash
   bun run build
   ```

   This will output the compiled files to the `dist/` directory.

2. **Start the Server:** Run the compiled JavaScript code using Bun (or Node.js
   if preferred, ensure `NODE_ENV=production` is set):

   ```bash
   NODE_ENV=production bun dist/index.js
   ```

   _Note: In production mode as configured in `src/index.ts`, the server runs
   using HTTP, expecting a reverse proxy (like Nginx or Coolify) to handle HTTPS
   termination._

### Running with Docker

A `Dockerfile` is provided for containerizing the application.

1. **Build the Docker Image:** From the project root directory:

   ```bash
   docker build -t wow-guild-manager-backend -f backend/Dockerfile .
   ```

2. **Run the Docker Container:**

   ```bash
   docker run -p 5000:3000 --env-file backend/.env wow-guild-manager-backend
   ```

   - This maps port 5000 on your host to port 3000 inside the container (as
     defined in the Dockerfile `EXPOSE` and `CMD`).
   - It passes the environment variables from your local `backend/.env` file to
     the container. Adjust the port mapping and environment variable handling as
     needed for your deployment setup.

## Running Tests

Execute the test suite using Jest:

```bash
bun test
```

## API Endpoints

The backend exposes several API endpoints for managing authentication, guilds,
events, and characters. See `Features.md` for a more detailed overview.

- `/api/auth/*`
- `/api/guilds/*`
- `/api/events/*`
- `/api/characters/*`
- `/api/health` & `/api/healthcheck`

## Background Jobs

A background job runs on a schedule (defined by `SYNC_JOB_CRON_SCHEDULE` in
`.env`) to synchronize data with the Battle.net API. This job can also be
triggered manually via scripts if needed (see `scripts/` directory).
