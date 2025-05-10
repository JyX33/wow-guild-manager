# Configuration Plan: Development vs. Production

This document outlines the analysis of the current configuration setup for the `wow-guild-manager` application and proposes a strategy to make it adaptable for both local development and production environments.

## Analysis Summary

### Backend (`backend/`)

*   **`.env.example` Status:** The `backend/.env.example` file is missing definitions for the following variables used in the code:
    *   `LOG_LEVEL` (used in `utils/logger.ts`)
    *   `JWT_REFRESH_SECRET` (used in `config/index.ts`)
    *   `JWT_REFRESH_EXPIRES_IN` (used in `config/index.ts`)
    *   `REFRESH_COOKIE_MAX_AGE` (used in `config/index.ts`)
*   **Conditional Loading:** `backend/src/config/index.ts` correctly loads `.env` files only when `NODE_ENV` is not 'production'.
*   **Required Variables Check:** A check exists for critical variables, but it currently only logs an error instead of potentially halting the application in production if secrets are missing.
*   **Hardcoded Values:** Battle.net region URLs are hardcoded in `config/index.ts`. This is deemed acceptable as these URLs rarely change.

### Frontend (`frontend/`)

*   **`.env.example` Status:** The `frontend/.env.example` correctly lists `VITE_API_URL` as the primary variable.
*   **Vite Proxy:** The development proxy target in `frontend/vite.config.ts` is hardcoded to a specific deployment URL (`https://po88swg040gc80k8kccwwko4.82.29.170.182.sslip.io`), preventing correct local development against a local backend.
*   **API URL Logic:** The frontend uses `VITE_API_URL` with a fallback to `/api`. This relies on the Vite proxy in development (when `VITE_API_URL` is unset) and requires `VITE_API_URL` to be set during the build process for production.

## Proposed Configuration Strategy

### 1. Backend Configuration (`backend/`)

*   **Update `.env.example`:** Add the missing variables (`LOG_LEVEL`, `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN`, `REFRESH_COOKIE_MAX_AGE`) with appropriate default values or placeholders.
*   **Production Environment:** Ensure `NODE_ENV=production` is set via system environment variables in the production deployment environment. The existing code correctly handles this.
*   **(Optional Enhancement):** Consider modifying `backend/src/config/index.ts` to throw a fatal error if critical secrets (`JWT_SECRET`, `BATTLE_NET_CLIENT_ID`, etc.) are missing when `NODE_ENV` is 'production'.

### 2. Frontend Configuration (`frontend/`)

*   **Make Proxy Target Configurable:**
    *   Modify `frontend/vite.config.ts` to read the proxy target from a new environment variable, `VITE_DEV_PROXY_TARGET`.
    *   Provide a default value of `http://localhost:5000`.
    *   Update `frontend/.env.example` to include `VITE_DEV_PROXY_TARGET`.
*   **Development Workflow:**
    *   Developers should create a `frontend/.env.local` file (add to `.gitignore`).
    *   Set `VITE_DEV_PROXY_TARGET` in `.env.local` *only* if the local backend differs from the default `http://localhost:5000`.
    *   Do *not* set `VITE_API_URL` in `.env.local` to utilize the proxy via the `/api` path.
*   **Production Workflow:**
    *   The production build process *must* set the `VITE_API_URL` environment variable to the absolute URL of the deployed backend API. Vite embeds this during the build.
*   **(Optional HTTPS):** If local HTTPS is needed for the frontend dev server, make key/cert paths configurable via environment variables (e.g., `VITE_DEV_HTTPS_KEY_PATH`, `VITE_DEV_HTTPS_CERT_PATH`).

### 3. Visualization

```mermaid
graph LR
    subgraph Development Environment
        A[Developer Machine] --> B(frontend/.env.local);
        B -- Sets VITE_DEV_PROXY_TARGET --> C{Vite Dev Server};
        C -- Proxies /api requests to --> D[Local Backend Server (e.g., localhost:5000)];
        A --> E(backend/.env);
        E -- Configures --> D;
        C -- Serves Frontend --> F[Browser];
        F -- API calls to /api --> C;
    end

    subgraph Production Environment
        G[Hosting Platform/CI/CD] -- Sets System Env Vars (DB_*, JWT_*, etc.) --> H[Backend Container];
        G -- Sets VITE_API_URL Build Arg --> I{Vite Build Process};
        I -- Embeds VITE_API_URL --> J[Static Frontend Assets];
        K[User Browser] -- Loads --> J;
        K -- API calls directly to VITE_API_URL --> H;
    end

    style Development Environment fill:#f9f,stroke:#333,stroke-width:2px;
    style Production Environment fill:#ccf,stroke:#333,stroke-width:2px;