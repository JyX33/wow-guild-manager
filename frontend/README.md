# WoW Guild Manager Frontend

This repository contains the frontend application for the WoW Guild Manager. It is built using modern web technologies to provide a user interface for managing World of Warcraft guilds.

## Prerequisites

Before running the frontend, ensure you have the following installed:

* Node.js (>= 18.0.0)
* npm or Bun (recommended)

## Installation

1. Navigate to the `frontend` directory in your terminal.
2. Install dependencies using Bun:

    ```bash
    bun install
    ```

    or using npm:

    ```bash
    npm install
    ```

## Configuration

Environment variables are used to configure the frontend. A `.env.example` file is provided as a template. Copy this file and rename it to `.env` in the `frontend` directory.

```bash
cp .env.example .env
```

Edit the `.env` file to set the necessary variables.

* `VITE_API_URL`: The base URL for the backend API. In development, this is typically set to `/api` to utilize the Vite proxy. In production, this should be the full URL of the deployed backend API.
* `VITE_BATTLE_NET_CLIENT_ID`: Client ID for Battle.net API integration (if applicable).

Additional environment variables might be available for debugging or feature flags as seen in `.env.example`.

## Running the Project

### Development Mode

To run the frontend in development mode with hot-reloading:

```bash
bun run dev
```

or using npm:

```bash
npm run dev
```

This will start the Vite development server, usually accessible at `http://localhost:5173`. The development server is configured to proxy API requests from `/api` to the backend URL specified in the `.env` file (or `vite.config.ts`).

### Development Mode with HTTPS

To run the frontend in development mode with HTTPS:

```bash
bun run dev-https
```

or using npm:

```bash
npm dev-https
```

*(Note: This requires SSL certificates to be configured, potentially in the `../certs` directory as suggested by `vite.config.ts` if uncommented.)*

### Building for Production

To build the frontend for production:

```bash
bun run build
```

or using npm:

```bash
npm run build
```

This will generate production-ready static files in the `dist/` directory.

### Previewing the Production Build

To preview the production build locally:

```bash
bun run preview
```

or using npm:

```bash
npm run preview
```

This serves the files from the `dist/` directory.

## Linting

To run the linter:

```bash
bun run lint
```

or using npm:

```bash
npm run lint
