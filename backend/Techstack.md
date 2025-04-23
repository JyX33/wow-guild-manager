# WoW Guild Manager - Backend Tech Stack

This document outlines the core technologies, frameworks, and libraries used in the backend of the WoW Guild Manager application.

## Core Technologies

* **Runtime:** [Bun](https://bun.sh/) (also used as package manager and bundler) / [Node.js](https://nodejs.org/) (Targeted for production build, especially in Docker)
* **Language:** [TypeScript](https://www.typescriptlang.org/) (v5.x)
* **Database:** [PostgreSQL](https://www.postgresql.org/)

## Frameworks & Libraries

* **Web Framework:** [Express.js](https://expressjs.com/) (v4.x) - Fast, unopinionated, minimalist web framework for Node.js.
* **Database Query Builder:** [Knex.js](https://knexjs.org/) (v3.x) - SQL query builder for PostgreSQL, MySQL, SQLite3, Oracle, and more. Used for database migrations and potentially direct queries.
  * `pg`: Node.js PostgreSQL client library used by Knex and `connect-pg-simple`.
* **Authentication & Session:**
  * `jsonwebtoken` (v9.x): Implementation of JSON Web Tokens for stateless authentication.
  * `express-session`: Middleware for managing user sessions.
  * `connect-pg-simple`: PostgreSQL session store for `express-session`.
  * `cookie-parser`: Middleware to parse `Cookie` header and populate `req.cookies`.
* **API Client:**
  * `axios` (v1.x): Promise-based HTTP client for making requests to the Battle.net API.
  * `bottleneck`: Rate limiter used to manage requests to the Battle.net API within their specified limits.
* **Background Jobs:**
  * `node-schedule` (v2.x): Library for scheduling recurring jobs (used for Battle.net data synchronization).
* **Logging:**
  * `pino` (v9.x): Fast, low-overhead JSON logger.
  * `pino-pretty`: Development-focused prettifier for Pino logs.
* **Utilities:**
  * `dotenv` (v16.x): Loads environment variables from a `.env` file.
  * `cors` (v2.x): Middleware for enabling Cross-Origin Resource Sharing.
  * `p-queue`: Promise queue concurrency control library (likely used within sync jobs).
* **Development & Build:**
  * `typescript`: Provides static typing for JavaScript.
  * `ts-node`: Allows running TypeScript files directly in Node.js (used for scripts like migrations/backfills).
  * `eslint` & Plugins (`@typescript-eslint`): Code linting to enforce style and catch errors.
  * `bun`: Used for installing dependencies, running scripts, and building the application.
* **Testing:**
  * `jest` (v29.x): JavaScript testing framework.
  * `ts-jest`: Jest transformer for TypeScript files.

## Containerization

* **Docker:** Used for containerizing the application for deployment. The `Dockerfile` uses a multi-stage build with `oven/bun` for building and `gcr.io/distroless/nodejs20-debian12` as the final minimal runtime image.

## Configuration

* Environment variables managed via `.env` files (using `dotenv`).
* TypeScript configuration via `tsconfig.json`.
* ESLint configuration via `.eslintrc.json`.
* Jest configuration via `jest.config.js`.
* Knex configuration (database connections, migrations) via `knexfile.js`.
