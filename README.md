# WoW Guild Manager

A web application for World of Warcraft guild management, enabling guild leaders and members to:

- Authenticate with Battle.net accounts
- Retrieve guild member information
- Manage a calendar of events (raids, dungeons, etc.)
- Allow members to subscribe to events

## Tech Stack

- **Frontend**: React with Vite (TypeScript), TailwindCSS
- **Backend**: Node.js with Bun runtime
- **Database**: PostgreSQL (utilizing JSON data types for flexibility)
- **Authentication**: Battle.net OAuth

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
  │   │   ├── types/           # TypeScript interfaces and types
  │   │   └── assets/          # Static assets
  │   ├── public/              # Public assets
  │   └── index.html           # Entry HTML
  │
  └── backend/                 # Bun/Node.js server
      ├── src/
      │   ├── controllers/     # Route controllers
      │   ├── db/              # Database connection and base models
      │   ├── models/          # Data models
      │   ├── routes/          # API routes
      │   ├── services/        # Business logic
      │   ├── middleware/      # Custom middleware
      │   ├── types/           # TypeScript interfaces and types
      │   ├── config/          # Configuration management
      │   └── utils/           # Utility functions
      ├── certs/               # SSL certificates for local HTTPS
      └── index.ts             # Entry point
```

## Setup Instructions

### Prerequisites

- Node.js v18+ or Bun runtime
- PostgreSQL 14+
- Battle.net Developer Account
- Git

### Environment Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/wow-guild-manager.git
   cd wow-guild-manager
   ```

2. Create SSL certificates for local HTTPS:
   ```bash
   mkdir -p certs
   openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes -subj '/CN=localhost'
   ```

3. Create environment configuration files:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

4. Update the environment variables with your specific configuration

### Database Setup

#### Using Docker

```bash
# Start PostgreSQL using Docker
docker-compose up -d db

# Apply database schema
docker exec -i wow_guild_manager_db psql -U postgres -d wow_guild_manager < backend/database/schema.sql
```

#### Manual Setup

```bash
# Create PostgreSQL database
createdb wow_guild_manager

# Run SQL scripts
psql -d wow_guild_manager -f backend/database/schema.sql
```

### Battle.net API Setup

1. Go to the [Battle.net Developer Portal](https://develop.battle.net/access/clients)
2. Create a new client with the following:
   - Redirect URL: `https://localhost:5000/api/auth/callback`
   - Scope: `wow.profile`
3. Update the `backend/.env` file with your Client ID and Client Secret

### Backend Setup

```bash
cd backend

# Using npm
npm install
npm run dev

# OR using Bun
bun install
bun run dev
```

### Frontend Setup

```bash
cd frontend

# Using npm
npm install
npm run dev

# OR using Bun
bun install
bun run dev
```

## Features

### Core Features

- **Battle.net Authentication**: Secure login using Battle.net OAuth
- **Guild Management**: Access guild information and member roster
- **Event Calendar**: Create and manage guild events
- **Event Subscription**: Allow members to join planned activities

### Development Features

- **Type Safety**: Strong TypeScript typing throughout the codebase
- **Consistent Error Handling**: Standardized error responses and handling
- **API Client**: Robust API service for frontend-backend communication
- **Database Abstraction**: Reusable data access patterns

## Scripts

### Backend

- `npm run dev` - Start development server with auto-reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Lint code
- `npm run typecheck` - Check TypeScript errors

### Frontend

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Lint code

## API Documentation

### Authentication Endpoints

- `GET /api/auth/login?region={region}` - Initiates Battle.net login
- `GET /api/auth/callback` - Battle.net OAuth callback
- `GET /api/auth/me` - Get current authenticated user
- `GET /api/auth/logout` - Logout current user

### Guild Endpoints

- `GET /api/guilds/{region}/{realm}/{name}` - Get guild by name
- `GET /api/guilds/id/{guildId}` - Get guild by ID
- `GET /api/guilds/{guildId}/members` - Get guild members

### Event Endpoints

- `GET /api/events/guild/{guildId}` - Get guild events
- `GET /api/events/{eventId}` - Get event by ID
- `POST /api/events` - Create new event
- `PUT /api/events/{eventId}` - Update event
- `DELETE /api/events/{eventId}` - Delete event
- `POST /api/events/{eventId}/subscribe` - Subscribe to event
- `PUT /api/events/{eventId}/subscribe` - Update subscription
- `GET /api/events/{eventId}/subscribers` - Get event subscribers

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- Blizzard Entertainment for the Battle.net API
- The World of Warcraft community