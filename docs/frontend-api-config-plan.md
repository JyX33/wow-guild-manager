# Frontend API Configuration Plan

**Objective:** Configure the frontend application to correctly communicate with the backend API in both local development and production deployment environments using Vite's environment variable system.

**Problem:** The production build of the frontend was making API requests to its own domain (`/api/...`) instead of the dedicated backend domain. This was because the `VITE_API_URL` environment variable was not set during the production build process, causing the API client to default to the relative path `/api`.

**Analysis:**

*   **API Client:** `frontend/src/services/api/core.ts` uses `axios` and sets its `baseURL` to `import.meta.env.VITE_API_URL || '/api'`.
*   **Development Proxy:** `frontend/vite.config.ts` includes a proxy that forwards requests from `/api` to the deployed backend URL (`https://po88swg040gc80k8kccwwko4.82.29.170.182.sslip.io`) during `vite dev`.
*   **Deployment:** The application is deployed using Coolify, with the frontend at `https://kwswssw84w44ggwk084w4ocg.82.29.170.182.sslip.io` and the backend at `https://po88swg040gc80k8kccwwko4.82.29.170.182.sslip.io`.

**Plan:**

1.  **Utilize `.env` Files:** Introduce standard Vite environment files in the `frontend` directory to explicitly define the API URL for different environments.
    *   **`frontend/.env.production`:** Create this file and set the production backend URL. This ensures production builds target the correct API endpoint.
        ```env
        VITE_API_URL=https://po88swg040gc80k8kccwwko4.82.29.170.182.sslip.io
        ```
    *   **`frontend/.env.development`:** Create this file to define the development behavior. Setting `VITE_API_URL=/api` maintains the use of the Vite proxy for local development.
        ```env
        # Uses the proxy defined in vite.config.ts
        VITE_API_URL=/api
        ```
    *   **`frontend/.env.example`:** Create or update this file to document the required environment variable for other developers.
        ```env
        # Backend API URL for production builds (e.g., https://api.yourdomain.com)
        # For development, this is often set to /api to utilize the Vite proxy
        VITE_API_URL=
        ```
2.  **Verify `.gitignore`:** Confirm that the root `.gitignore` file correctly ignores `.env.*` files while allowing `.env.example`. (This was confirmed to be correct).

**Expected Outcome:**

*   **Development (`vite dev`):** The frontend makes requests to `/api`, which are proxied by Vite to the URL specified in `vite.config.ts` (currently the deployed backend).
*   **Production (Deployed):** The built frontend makes direct requests to `https://po88swg040gc80k8kccwwko4.82.29.170.182.sslip.io`.

**Conceptual Flow Diagram:**

```mermaid
graph LR
    subgraph Development (vite dev)
        A[Frontend Code] -- Makes request to --> B[/api/...]
        B -- Intercepted by --> C{Vite Proxy}
        C -- Forwards to --> D[vite.config.ts target URL\n(Deployed Backend)]
    end
    subgraph Production (vite build -> Deployed)
        E[Frontend Code] -- Makes request to --> F[VITE_API_URL\n(https://...sslip.io)]
    end

    G[apiClient baseURL] -->|Loads .env.development| B
    G -->|Loads .env.production| F