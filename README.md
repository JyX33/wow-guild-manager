# WoW Guild Manager

A web application for World of Warcraft guild management, enabling guild leaders and members to:

- Authenticate with Battle.net accounts
- Retrieve guild member information
- Manage a calendar of events (raids, dungeons, etc.)
- Allow members to subscribe to events

## Tech Stack

- **Frontend**: React with Vite (TypeScript)
- **Backend**: Node.js with Bun runtime
- **Database**: PostgreSQL (utilizing JSON data types for flexibility)
- **Deployment**: Self-hosted

## Project Structure

```
/wow-guild-manager/
  ├── frontend/                # React/Vite app
  │   ├── src/
  │   │   ├── components/      # Reusable components
  │   │   ├── pages/           # Page components
  │   │   ├── services/        # API services
  │   │   ├── hooks/           # Custom hooks
  │   │   ├── context/         # Context providers
  │   │   └── assets/          # Static assets
  │   ├── public/              # Public assets
  │   └── index.html           # Entry HTML
  │
  └── backend/                 # Bun/Node.js server
      ├── src/
      │   ├── controllers/     # Route controllers
      │   ├── models/          # Database models
      │   ├── routes/          # API routes
      │   ├── services/        # Business logic
      │   ├── middleware/      # Custom middleware
      │   └── utils/           # Utility functions
      ├── config/              # Configuration files
      └── index.ts             # Entry point
```

## Setup Instructions

### Prerequisites

- Node.js
- Bun runtime
- PostgreSQL or Docker
- Battle.net Developer Account

### Database Setup

#### Option 1: Using Docker

```bash
# Start PostgreSQL using Docker
docker-compose up -d

# Verify database is running
docker ps | grep wow_guild_manager_db
```

#### Option 2: Manual Setup

```bash
# Create PostgreSQL database
createdb wow_guild_manager

# Run SQL scripts
psql -d wow_guild_manager -f backend/database/schema.sql
```

### Battle.net API Setup

1. Go to the [Battle.net Developer Portal](https://develop.battle.net/access/clients)
2. Create a new client with the following:
   - Redirect URL: `http://localhost:5000/api/auth/callback`
   - Scope: `wow.profile`
3. Update the `.env` file with your Client ID and Client Secret

### Backend Setup

```bash
cd backend

# Install dependencies
bun install

# Start development server
bun run dev
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

## Features

### Core Features

- **Battle.net Authentication**: Secure login using Battle.net OAuth
- **Guild Management**: Access guild information and member roster
- **Event Calendar**: Create and manage guild events
- **Event Subscription**: Allow members to join planned activities

### User Flow

1. User logs in with Battle.net account
2. User selects region and guild
3. User can view guild members and event calendar
4. User can create events (if authorized) or subscribe to existing events

## Environment Variables

Create a `.env` file in the backend directory with the following variables:

```
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=wow_guild_manager
DB_USER=postgres
DB_PASSWORD=postgres  # Use 'postgres' if using Docker setup
BATTLE_NET_CLIENT_ID=your_client_id
BATTLE_NET_CLIENT_SECRET=your_client_secret
BATTLE_NET_REDIRECT_URI=http://localhost:5000/api/auth/callback
FRONTEND_URL=http://localhost:5173
JWT_SECRET=your_secure_jwt_secret
```