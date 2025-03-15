# World of Warcraft Guild Management Application

This document provides a comprehensive guide for building a WoW Guild Management web application. This application enables guild leaders and members to:

- Authenticate with Battle.net accounts
- Retrieve guild member information
- Manage a calendar of events (raids, dungeons, etc.)
- Allow members to subscribe to events

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Project Setup](#project-setup)
4. [Database Schema](#database-schema)
5. [Backend Implementation](#backend-implementation)
6. [Frontend Implementation](#frontend-implementation)
7. [Battle.net OAuth Integration](#battlenet-oauth-integration)
8. [Implementation Timeline](#implementation-timeline)
9. [Deployment Instructions](#deployment-instructions)
10. [Security Considerations](#security-considerations)

## Project Overview

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

## Tech Stack

- **Frontend**: React with Vite (TypeScript)
- **Backend**: Node.js with Bun runtime
- **Database**: PostgreSQL (utilizing JSON data types for flexibility)
- **Deployment**: Self-hosted

## Project Setup

### Project Structure

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

### Frontend Setup

```bash
# Create new Vite project with React
npm create vite@latest wow-guild-manager-frontend -- --template react-ts
cd wow-guild-manager-frontend

# Install dependencies
npm install axios react-router-dom @tanstack/react-query formik yup date-fns react-big-calendar

# Start development server
npm run dev
```

### Backend Setup

```bash
# Create a new directory for backend
mkdir wow-guild-manager-backend
cd wow-guild-manager-backend

# Initialize Bun project
bun init

# Install dependencies
bun add express cors dotenv pg axios jsonwebtoken cookie-parser express-session
bun add -d typescript @types/express @types/node @types/pg
```

## Database Schema

Connect to your PostgreSQL instance and create the following tables:

### Users Table

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  battle_net_id VARCHAR(255) UNIQUE NOT NULL,
  battletag VARCHAR(255) NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_data JSONB -- For storing additional Battle.net user data
);
```

### Guilds Table

```sql
CREATE TABLE guilds (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  realm VARCHAR(255) NOT NULL,
  region VARCHAR(50) NOT NULL,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  guild_data JSONB, -- For storing guild data from API
  UNIQUE(name, realm, region)
);
```

### Events Table

```sql
CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_type VARCHAR(50) NOT NULL, -- 'Raid', 'Dungeon', 'Special'
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  created_by INTEGER REFERENCES users(id),
  guild_id INTEGER REFERENCES guilds(id),
  max_participants INTEGER,
  event_details JSONB -- For storing flexible event details
);
```

### Event Subscriptions Table

```sql
CREATE TABLE event_subscriptions (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES events(id),
  user_id INTEGER REFERENCES users(id),
  status VARCHAR(50) NOT NULL, -- 'Confirmed', 'Tentative', 'Declined'
  character_name VARCHAR(255),
  character_class VARCHAR(50),
  character_role VARCHAR(50), -- 'Tank', 'Healer', 'DPS'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(event_id, user_id)
);
```

## Backend Implementation

### Environment Configuration

Create a `.env` file in the backend directory:

```
PORT=5000
DB_HOST=localhost
DB_PORT=5433
DB_NAME=wow_guild_manager
DB_USER=postgres
DB_PASSWORD=your_password
BATTLE_NET_CLIENT_ID=your_client_id
BATTLE_NET_CLIENT_SECRET=your_client_secret
BATTLE_NET_REDIRECT_URI=http://localhost:5000/api/auth/callback
FRONTEND_URL=http://localhost:5173
JWT_SECRET=your_secure_jwt_secret
```

### Configuration Setup (config/default.ts)

```typescript
export default {
  server: {
    port: process.env.PORT || 5000
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433'),
    name: process.env.DB_NAME || 'wow_guild_manager',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
  },
  battlenet: {
    clientId: process.env.BATTLE_NET_CLIENT_ID,
    clientSecret: process.env.BATTLE_NET_CLIENT_SECRET,
    redirectUri: process.env.BATTLE_NET_REDIRECT_URI || 'http://localhost:5000/api/auth/callback',
    regions: {
      eu: {
        authBaseUrl: 'https://eu.battle.net/oauth',
        apiBaseUrl: 'https://eu.api.blizzard.com'
      },
      us: {
        authBaseUrl: 'https://us.battle.net/oauth',
        apiBaseUrl: 'https://us.api.blizzard.com'
      },
      kr: {
        authBaseUrl: 'https://kr.battle.net/oauth',
        apiBaseUrl: 'https://kr.api.blizzard.com'
      },
      tw: {
        authBaseUrl: 'https://tw.battle.net/oauth',
        apiBaseUrl: 'https://tw.api.blizzard.com'
      }
    }
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: '1d'
  }
};
```

### Database Connection (models/db.ts)

```typescript
import { Pool } from 'pg';
import config from '../config/default';

const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  user: config.database.user,
  password: config.database.password
});

export default pool;
```

### Authentication Middleware (middleware/auth.middleware.ts)

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config/default';

// Extend Express Request type to include user property
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export default {
  authenticate: async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get token from cookie
      const token = req.cookies.token;
      
      if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Verify token
      const decoded = jwt.verify(token, config.jwt.secret);
      req.user = decoded;
      
      next();
    } catch (error) {
      console.error('Authentication error:', error);
      res.status(401).json({ error: 'Invalid authentication' });
    }
  }
};
```

### User Model (models/user.model.ts)

```typescript
import db from './db';

export default {
  findById: async (id: number) => {
    const result = await db.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  },
  
  findByBattleNetId: async (battleNetId: string) => {
    const result = await db.query(
      'SELECT * FROM users WHERE battle_net_id = $1',
      [battleNetId]
    );
    return result.rows[0];
  },
  
  create: async (userData: any) => {
    const result = await db.query(
      `INSERT INTO users 
      (battle_net_id, battletag, access_token, refresh_token, token_expires_at, user_data) 
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING *`,
      [
        userData.battle_net_id,
        userData.battletag,
        userData.access_token,
        userData.refresh_token,
        userData.token_expires_at,
        userData.user_data
      ]
    );
    return result.rows[0];
  },
  
  update: async (id: number, userData: any) => {
    const result = await db.query(
      `UPDATE users 
      SET access_token = $1, refresh_token = $2, token_expires_at = $3, 
          user_data = $4, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $5 
      RETURNING *`,
      [
        userData.access_token,
        userData.refresh_token,
        userData.token_expires_at,
        userData.user_data,
        id
      ]
    );
    return result.rows[0];
  }
};
```

### Guild Model (models/guild.model.ts)

```typescript
import db from './db';

export default {
  findById: async (id: number) => {
    const result = await db.query(
      'SELECT * FROM guilds WHERE id = $1',
      [id]
    );
    return result.rows[0];
  },
  
  findByNameRealmRegion: async (name: string, realm: string, region: string) => {
    const result = await db.query(
      'SELECT * FROM guilds WHERE name = $1 AND realm = $2 AND region = $3',
      [name, realm, region]
    );
    return result.rows[0];
  },
  
  create: async (guildData: any) => {
    const result = await db.query(
      `INSERT INTO guilds 
      (name, realm, region, guild_data) 
      VALUES ($1, $2, $3, $4) 
      RETURNING *`,
      [
        guildData.name,
        guildData.realm,
        guildData.region,
        guildData.guild_data
      ]
    );
    return result.rows[0];
  },
  
  update: async (id: number, guildData: any) => {
    const result = await db.query(
      `UPDATE guilds 
      SET guild_data = $1, last_updated = CURRENT_TIMESTAMP 
      WHERE id = $2 
      RETURNING *`,
      [
        guildData.guild_data,
        id
      ]
    );
    return result.rows[0];
  }
};
```

### Event Model (models/event.model.ts)

```typescript
import db from './db';

export default {
  findById: async (id: number) => {
    const result = await db.query(
      'SELECT * FROM events WHERE id = $1',
      [id]
    );
    return result.rows[0];
  },
  
  findByGuildId: async (guildId: number) => {
    const result = await db.query(
      'SELECT * FROM events WHERE guild_id = $1 ORDER BY start_time',
      [guildId]
    );
    return result.rows;
  },
  
  create: async (eventData: any) => {
    const result = await db.query(
      `INSERT INTO events 
      (title, description, event_type, start_time, end_time, created_by, guild_id, max_participants, event_details) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
      RETURNING *`,
      [
        eventData.title,
        eventData.description,
        eventData.event_type,
        eventData.start_time,
        eventData.end_time,
        eventData.created_by,
        eventData.guild_id,
        eventData.max_participants,
        eventData.event_details
      ]
    );
    return result.rows[0];
  },
  
  update: async (id: number, eventData: any) => {
    const result = await db.query(
      `UPDATE events 
      SET title = $1, description = $2, event_type = $3, start_time = $4, 
          end_time = $5, max_participants = $6, event_details = $7 
      WHERE id = $8 
      RETURNING *`,
      [
        eventData.title,
        eventData.description,
        eventData.event_type,
        eventData.start_time,
        eventData.end_time,
        eventData.max_participants,
        eventData.event_details,
        id
      ]
    );
    return result.rows[0];
  },
  
  delete: async (id: number) => {
    await db.query(
      'DELETE FROM event_subscriptions WHERE event_id = $1',
      [id]
    );
    const result = await db.query(
      'DELETE FROM events WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }
};
```

### Event Subscription Model (models/subscription.model.ts)

```typescript
import db from './db';

export default {
  findById: async (id: number) => {
    const result = await db.query(
      'SELECT * FROM event_subscriptions WHERE id = $1',
      [id]
    );
    return result.rows[0];
  },
  
  findByEventAndUser: async (eventId: number, userId: number) => {
    const result = await db.query(
      'SELECT * FROM event_subscriptions WHERE event_id = $1 AND user_id = $2',
      [eventId, userId]
    );
    return result.rows[0];
  },
  
  findByEventId: async (eventId: number) => {
    const result = await db.query(
      `SELECT es.*, u.battletag 
       FROM event_subscriptions es
       JOIN users u ON es.user_id = u.id
       WHERE es.event_id = $1`,
      [eventId]
    );
    return result.rows;
  },
  
  create: async (subscriptionData: any) => {
    const result = await db.query(
      `INSERT INTO event_subscriptions 
      (event_id, user_id, status, character_name, character_class, character_role) 
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING *`,
      [
        subscriptionData.event_id,
        subscriptionData.user_id,
        subscriptionData.status,
        subscriptionData.character_name,
        subscriptionData.character_class,
        subscriptionData.character_role
      ]
    );
    return result.rows[0];
  },
  
  update: async (id: number, subscriptionData: any) => {
    const result = await db.query(
      `UPDATE event_subscriptions 
      SET status = $1, character_name = $2, character_class = $3, character_role = $4
      WHERE id = $5 
      RETURNING *`,
      [
        subscriptionData.status,
        subscriptionData.character_name,
        subscriptionData.character_class,
        subscriptionData.character_role,
        id
      ]
    );
    return result.rows[0];
  },
  
  delete: async (id: number) => {
    const result = await db.query(
      'DELETE FROM event_subscriptions WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }
};
```

### Battle.net API Service (services/battlenet.service.ts)

```typescript
import axios from 'axios';
import config from '../config/default';

class BattleNetService {
  async getAuthorizationUrl(region: string, state: string) {
    const regionConfig = config.battlenet.regions[region] || config.battlenet.regions.eu;
    
    return `${regionConfig.authBaseUrl}/authorize?client_id=${config.battlenet.clientId}&scope=wow.profile&state=${state}&redirect_uri=${config.battlenet.redirectUri}&response_type=code`;
  }

  async getAccessToken(region: string, code: string) {
    const regionConfig = config.battlenet.regions[region] || config.battlenet.regions.eu;
    
    const response = await axios.post(
      `${regionConfig.authBaseUrl}/token`,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: config.battlenet.redirectUri
      }),
      {
        auth: {
          username: config.battlenet.clientId,
          password: config.battlenet.clientSecret
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    return response.data;
  }

  async getUserInfo(region: string, accessToken: string) {
    const response = await axios.get('https://oauth.battle.net/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    
    return response.data;
  }

  async getGuildMembers(region: string, realm: string, guildName: string, accessToken: string) {
    const regionConfig = config.battlenet.regions[region] || config.battlenet.regions.eu;
    
    const response = await axios.get(
      `${regionConfig.apiBaseUrl}/data/wow/guild/${realm}/${guildName}/roster`,
      {
        params: {
          namespace: `profile-${region}`,
          locale: 'en_US'
        },
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );
    
    return response.data;
  }
}

export default new BattleNetService();
```

### Auth Controller (controllers/auth.controller.ts)

```typescript
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config/default';
import battleNetService from '../services/battlenet.service';
import userModel from '../models/user.model';

const generateState = () => {
  return Math.random().toString(36).substring(2, 15);
};

export default {
  login: async (req: Request, res: Response) => {
    try {
      const { region = 'eu' } = req.query;
      const state = generateState();
      
      // Store state in session to verify callback
      req.session.oauthState = state;
      req.session.region = region;
      
      const authUrl = await battleNetService.getAuthorizationUrl(region as string, state);
      res.json({ authUrl });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Failed to initiate login' });
    }
  },
  
  callback: async (req: Request, res: Response) => {
    try {
      const { code, state } = req.query;
      const { oauthState, region } = req.session;
      
      // Verify state to prevent CSRF
      if (state !== oauthState) {
        return res.status(400).json({ error: 'Invalid state parameter' });
      }
      
      // Exchange code for access token
      const tokenData = await battleNetService.getAccessToken(region as string, code as string);
      
      // Get user info from Battle.net
      const userInfo = await battleNetService.getUserInfo(region as string, tokenData.access_token);
      
      // Find or create user in database
      let user = await userModel.findByBattleNetId(userInfo.id);
      
      if (!user) {
        user = await userModel.create({
          battle_net_id: userInfo.id,
          battletag: userInfo.battletag,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000),
          user_data: userInfo
        });
      } else {
        // Update existing user with new tokens
        user = await userModel.update(user.id, {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000),
          user_data: userInfo
        });
      }
      
      // Generate JWT for frontend auth
      const token = jwt.sign(
        { id: user.id, battle_net_id: user.battle_net_id },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );
      
      // Set JWT in cookie
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 1 day
      });
      
      // Redirect to frontend
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback`);
    } catch (error) {
      console.error('Callback error:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  },
  
  logout: (req: Request, res: Response) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
  },
  
  getCurrentUser: async (req: Request, res: Response) => {
    try {
      // req.user is set by authMiddleware
      const user = await userModel.findById(req.user.id);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Don't send sensitive info to frontend
      const { access_token, refresh_token, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({ error: 'Failed to get user information' });
    }
  }
};
```

### Guild Controller (controllers/guild.controller.ts)

```typescript
import { Request, Response } from 'express';
import battleNetService from '../services/battlenet.service';
import guildModel from '../models/guild.model';
import userModel from '../models/user.model';

export default {
  getGuildByName: async (req: Request, res: Response) => {
    try {
      const { region, realm, name } = req.params;
      
      // Check if guild exists in database
      let guild = await guildModel.findByNameRealmRegion(name, realm, region);
      
      if (!guild) {
        // Get user for access token
        const user = await userModel.findById(req.user.id);
        
        // Fetch guild data from Battle.net API
        const guildData = await battleNetService.getGuildMembers(region, realm, name, user.access_token);
        
        // Create guild in database
        guild = await guildModel.create({
          name,
          realm,
          region,
          guild_data: guildData
        });
      }
      
      res.json(guild);
    } catch (error) {
      console.error('Get guild error:', error);
      res.status(500).json({ error: 'Failed to get guild information' });
    }
  },
  
  getGuildMembers: async (req: Request, res: Response) => {
    try {
      const { guildId } = req.params;
      
      // Get guild from database
      const guild = await guildModel.findById(parseInt(guildId));
      
      if (!guild) {
        return res.status(404).json({ error: 'Guild not found' });
      }
      
      // Extract members from guild data
      const members = guild.guild_data?.members || [];
      
      res.json(members);
    } catch (error) {
      console.error('Get guild members error:', error);
      res.status(500).json({ error: 'Failed to get guild members' });
    }
  }
};
```

### Event Controller (controllers/event.controller.ts)

```typescript
import { Request, Response } from 'express';
import eventModel from '../models/event.model';
import subscriptionModel from '../models/subscription.model';

export default {
  getGuildEvents: async (req: Request, res: Response) => {
    try {
      const { guildId } = req.params;
      
      const events = await eventModel.findByGuildId(parseInt(guildId));
      
      res.json(events);
    } catch (error) {
      console.error('Get guild events error:', error);
      res.status(500).json({ error: 'Failed to get guild events' });
    }
  },
  
  createEvent: async (req: Request, res: Response) => {
    try {
      const eventData = {
        ...req.body,
        created_by: req.user.id
      };
      
      const event = await eventModel.create(eventData);
      
      res.status(201).json(event);
    } catch (error) {
      console.error('Create event error:', error);
      res.status(500).json({ error: 'Failed to create event' });
    }
  },
  
  updateEvent: async (req: Request, res: Response) => {
    try {
      const { eventId } = req.params;
      
      // Verify event exists and user has permission
      const existingEvent = await eventModel.findById(parseInt(eventId));
      
      if (!existingEvent) {
        return res.status(404).json({ error: 'Event not found' });
      }
      
      if (existingEvent.created_by !== req.user.id) {
        return res.status(403).json({ error: 'Permission denied' });
      }
      
      const updatedEvent = await eventModel.update(parseInt(eventId), req.body);
      
      res.json(updatedEvent);
    } catch (error) {
      console.error('Update event error:', error);
      res.status(500).json({ error: 'Failed to update event' });
    }
  },
  
  deleteEvent: async (req: Request, res: Response) => {
    try {
      const { eventId } = req.params;
      
      // Verify event exists and user has permission
      const existingEvent = await eventModel.findById(parseInt(eventId));
      
      if (!existingEvent) {
        return res.status(404).json({ error: 'Event not found' });
      }
      
      if (existingEvent.created_by !== req.user.id) {
        return res.status(403).json({ error: 'Permission denied' });
      }
      
      const deletedEvent = await eventModel.delete(parseInt(eventId));
      
      res.json(deletedEvent);
    } catch (error) {
      console.error('Delete event error:', error);
      res.status(500).json({ error: 'Failed to delete event' });
    }
  },
  
  subscribeToEvent: async (req: Request, res: Response) => {
    try {
      const { eventId } = req.params;
      
      // Check if user is already subscribed
      const existingSubscription = await subscriptionModel.findByEventAndUser(
        parseInt(eventId),
        req.user.id
      );
      
      if (existingSubscription) {
        return res.status(400).json({ error: 'Already subscribed to this event' });
      }
      
      const subscriptionData = {
        event_id: parseInt(eventId),
        user_id: req.user.id,
        ...req.body
      };
      
      const subscription = await subscriptionModel.create(subscriptionData);
      
      res.status(201).json(subscription);
    } catch (error) {
      console.error('Subscribe to event error:', error);
      res.status(500).json({ error: 'Failed to subscribe to event' });
    }
  },
  
  updateSubscription: async (req: Request, res: Response) => {
    try {
      const { eventId } = req.params;
      
      // Get existing subscription
      const existingSubscription = await subscriptionModel.findByEventAndUser(
        parseInt(eventId),
        req.user.id
      );
      
      if (!existingSubscription) {
        return res.status(404).json({ error: 'Subscription not found' });
      }
      
      const updatedSubscription = await subscriptionModel.update(
        existingSubscription.id,
        req.body
      );
      
      res.json(updatedSubscription);
    } catch (error) {
      console.error('Update subscription error:', error);
      res.status(500).json({ error: 'Failed to update subscription' });
    }
  },
  
  getEventSubscribers: async (req: Request, res: Response) => {
    try {
      const { eventId } = req.params;
      
      const subscribers = await subscriptionModel.findByEventId(parseInt(eventId));
      
      res.json(subscribers);
    } catch (error) {
      console.error('Get event subscribers error:', error);
      res.status(500).json({ error: 'Failed to get event subscribers' });
    }
  }
};
```

### Routes Setup

#### Auth Routes (routes/auth.routes.ts)

```typescript
import express from 'express';
import authController from '../controllers/auth.controller';
import authMiddleware from '../middleware/auth.middleware';

const router = express.Router();

// Initiate Battle.net OAuth flow
router.get('/login', authController.login);

// Handle Battle.net OAuth callback
router.get('/callback', authController.callback);

// Logout user
router.get('/logout', authController.logout);

// Get current authenticated user
router.get('/me', authMiddleware.authenticate, authController.getCurrentUser);

export default router;
```

#### Guild Routes (routes/guild.routes.ts)

```typescript
import express from 'express';
import guildController from '../controllers/guild.controller';
import authMiddleware from '../middleware/auth.middleware';

const router = express.Router();

// Get guild by region, realm and name
router.get('/:region/:realm/:name', authMiddleware.authenticate, guildController.getGuildByName);

// Get guild members
router.get('/:guildId/members', authMiddleware.authenticate, guildController.getGuildMembers);

export default router;
```

#### Event Routes (routes/event.routes.ts)

```typescript
import express from 'express';
import eventController from '../controllers/event.controller';
import authMiddleware from '../middleware/auth.middleware';

const router = express.Router();

// Get all events for a guild
router.get('/guild/:guildId', authMiddleware.authenticate, eventController.getGuildEvents);

// Create a new event
router.post('/', authMiddleware.authenticate, eventController.createEvent);

// Update an event
router.put('/:eventId', authMiddleware.authenticate, eventController.updateEvent);

// Delete an event
router.delete('/:eventId', authMiddleware.authenticate, eventController.deleteEvent);

// Subscribe to an event
router.post('/:eventId/subscribe', authMiddleware.authenticate, eventController.subscribeToEvent);

// Update subscription status
router.put('/:eventId/subscribe', authMiddleware.authenticate, eventController.updateSubscription);

// Get event subscribers
router.get('/:eventId/subscribers', authMiddleware.authenticate, eventController.getEventSubscribers);

export default router;
```

### Main Server File (index.ts)

```typescript
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import dotenv from 'dotenv';
import config from './config/default';

import authRoutes from './routes/auth.routes';
import guildRoutes from './routes/guild.routes';
import eventRoutes from './routes/event.routes';

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Session middleware
app.use(session({
  secret: config.jwt.secret,
  resave: false,
  saveUninitialized: false
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/guilds', guildRoutes);
app.use('/api/events', eventRoutes);

// Start server
const PORT = config.server.port;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## Frontend Implementation

### API Service (src/services/api.service.ts)

```typescript
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true
});

export const authApi = {
  login: (region: string) => 
    apiClient.get(`/auth/login?region=${region}`),
  
  getCurrentUser: () => 
    apiClient.get('/auth/me'),
  
  logout: () => 
    apiClient.get('/auth/logout')
};

export const guildApi = {
  getGuildByName: (region: string, realm: string, name: string) => 
    apiClient.get(`/guilds/${region}/${realm}/${name}`),
  
  getGuildMembers: (guildId: number) => 
    apiClient.get(`/guilds/${guildId}/members`)
};

export const eventApi = {
  getGuildEvents: (guildId: number) => 
    apiClient.get(`/events/guild/${guildId}`),
  
  createEvent: (eventData: any) => 
    apiClient.post('/events', eventData),
  
  updateEvent: (eventId: number, eventData: any) => 
    apiClient.put(`/events/${eventId}`, eventData),
  
  deleteEvent: (eventId: number) => 
    apiClient.delete(`/events/${eventId}`),
  
  subscribeToEvent: (eventId: number, subscriptionData: any) => 
    apiClient.post(`/events/${eventId}/subscribe`, subscriptionData),
  
  updateSubscription: (eventId: number, subscriptionData: any) => 
    apiClient.put(`/events/${eventId}/subscribe`, subscriptionData),
  
  getEventSubscribers: (eventId: number) => 
    apiClient.get(`/events/${eventId}/subscribers`)
};
```

### Auth Context (src/context/AuthContext.tsx)

```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api.service';

interface User {
  id: number;
  battle_net_id: string;
  battletag: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (region: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const response = await authApi.getCurrentUser();
        setUser(response.data);
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (region: string) => {
    try {
      const response = await authApi.login(region);
      window.location.href = response.data.authUrl;
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

### Protected Route Component (src/components/ProtectedRoute.tsx)

```typescript
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
```

### Login Page (src/pages/Login.tsx)

```typescript
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const Login: React.FC = () => {
  const { login } = useAuth();
  const [region, setRegion] = useState('eu');

  const handleLogin = () => {
    login(region);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6 text-center">WoW Guild Manager</h1>
        
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Select Region</label>
          <select
            className="w-full p-2 border rounded"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          >
            <option value="eu">Europe</option>
            <option value="us">Americas</option>
            <option value="kr">Korea</option>
            <option value="tw">Taiwan</option>
          </select>
        </div>
        
        <button
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          onClick={handleLogin}
        >
          Login with Battle.net
        </button>
      </div>
    </div>
  );
};

export default Login;
```

### Auth Callback Page (src/pages/AuthCallback.tsx)

```typescript
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        navigate('/dashboard');
      } else {
        navigate('/login');
      }
    }
  }, [user, loading, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-xl mb-4">Authenticating...</h2>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
      </div>
    </div>
  );
};

export default AuthCallback;
```

### Guild Selector Component (src/components/GuildSelector.tsx)

```typescript
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { guildApi } from '../services/api.service';

const GuildSelector: React.FC = () => {
  const navigate = useNavigate();
  const [region, setRegion] = useState('eu');
  const [realm, setRealm] = useState('');
  const [guildName, setGuildName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!realm || !guildName) {
      setError('Please enter both realm and guild name');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await guildApi.getGuildByName(region, realm, guildName);
      navigate(`/guild/${response.data.id}`);
    } catch (error) {
      setError('Failed to find guild. Please check the realm and guild name.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Select Your Guild</h2>
      
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Region</label>
          <select
            className="w-full p-2 border rounded"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          >
            <option value="eu">Europe</option>
            <option value="us">Americas</option>
            <option value="kr">Korea</option>
            <option value="tw">Taiwan</option>
          </select>
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Realm</label>
          <input
            type="text"
            className="w-full p-2 border rounded"
            value={realm}
            onChange={(e) => setRealm(e.target.value)}
            placeholder="Enter realm name"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Guild Name</label>
          <input
            type="text"
            className="w-full p-2 border rounded"
            value={guildName}
            onChange={(e) => setGuildName(e.target.value)}
            placeholder="Enter guild name"
          />
        </div>
        
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Find Guild'}
        </button>
      </form>
    </div>
  );
};

export default GuildSelector;
```

### Event Calendar Component (src/components/EventCalendar.tsx)

```typescript
import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { eventApi } from '../services/api.service';

const localizer = momentLocalizer(moment);

interface Event {
  id: number;
  title: string;
  start: Date;
  end: Date;
  event_type: string;
}

interface EventCalendarProps {
  guildId: number;
  onSelectEvent: (event: Event) => void;
  onSelectSlot: (slotInfo: { start: Date; end: Date }) => void;
}

const EventCalendar: React.FC<EventCalendarProps> = ({ 
  guildId, 
  onSelectEvent, 
  onSelectSlot 
}) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await eventApi.getGuildEvents(guildId);
        
        // Format events for calendar
        const formattedEvents = response.data.map((event: any) => ({
          id: event.id,
          title: event.title,
          start: new Date(event.start_time),
          end: new Date(event.end_time),
          event_type: event.event_type
        }));
        
        setEvents(formattedEvents);
      } catch (error) {
        console.error('Failed to fetch events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [guildId]);

  const eventStyleGetter = (event: Event) => {
    let backgroundColor = '#3174ad';
    
    // Different colors for different event types
    switch (event.event_type) {
      case 'Raid':
        backgroundColor = '#e53e3e'; // Red
        break;
      case 'Dungeon':
        backgroundColor = '#38a169'; // Green
        break;
      case 'Special':
        backgroundColor = '#805ad5'; // Purple
        break;
    }
    
    return {
      style: {
        backgroundColor,
        borderRadius: '5px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block'
      }
    };
  };

  if (loading) {
    return <div>Loading events...</div>;
  }

  return (
    <div className="h-[600px]">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%' }}
        onSelectEvent={onSelectEvent}
        onSelectSlot={onSelectSlot}
        selectable
        eventPropGetter={eventStyleGetter}
        views={['month', 'week', 'day']}
      />
    </div>
  );
};

export default EventCalendar;
```

### Event Form Component (src/components/EventForm.tsx)

```typescript
import React from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';

interface EventFormProps {
  initialValues: {
    title: string;
    description: string;
    event_type: string;
    start_time: string;
    end_time: string;
    max_participants: number;
    guild_id: number;
  };
  onSubmit: (values: any) => Promise<void>;
  buttonText: string;
}

const EventSchema = Yup.object().shape({
  title: Yup.string().required('Required'),
  description: Yup.string(),
  event_type: Yup.string().required('Required'),
  start_time: Yup.string().required('Required'),
  end_time: Yup.string().required('Required'),
  max_participants: Yup.number().min(1, 'Must be at least 1')
});

const EventForm: React.FC<EventFormProps> = ({ initialValues, onSubmit, buttonText }) => {
  return (
    <Formik
      initialValues={initialValues}
      validationSchema={EventSchema}
      onSubmit={async (values, { setSubmitting }) => {
        try {
          await onSubmit(values);
        } catch (error) {
          console.error('Event submission error:', error);
        } finally {
          setSubmitting(false);
        }
      }}
    >
      {({ isSubmitting }) => (
        <Form className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Event Title
            </label>
            <Field
              type="text"
              name="title"
              className="w-full p-2 border rounded"
              placeholder="Event title"
            />
            <ErrorMessage name="title" component="div" className="text-red-500 text-sm mt-1" />
          </div>
          
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <Field
              as="textarea"
              name="description"
              className="w-full p-2 border rounded"
              placeholder="Event description"
              rows={3}
            />
            <ErrorMessage name="description" component="div" className="text-red-500 text-sm mt-1" />
          </div>
          
          <div>
            <label htmlFor="event_type" className="block text-sm font-medium text-gray-700 mb-1">
              Event Type
            </label>
            <Field
              as="select"
              name="event_type"
              className="w-full p-2 border rounded"
            >
              <option value="">Select Type</option>
              <option value="Raid">Raid</option>
              <option value="Dungeon">Dungeon</option>
              <option value="Special">Special Event</option>
            </Field>
            <ErrorMessage name="event_type" component="div" className="text-red-500 text-sm mt-1" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="start_time" className="block text-sm font-medium text-gray-700 mb-1">
                Start Time
              </label>
              <Field
                type="datetime-local"
                name="start_time"
                className="w-full p-2 border rounded"
              />
              <ErrorMessage name="start_time" component="div" className="text-red-500 text-sm mt-1" />
            </div>
            
            <div>
              <label htmlFor="end_time" className="block text-sm font-medium text-gray-700 mb-1">
                End Time
              </label>
              <Field
                type="datetime-local"
                name="end_time"
                className="w-full p-2 border rounded"
              />
              <ErrorMessage name="end_time" component="div" className="text-red-500 text-sm mt-1" />
            </div>
          </div>
          
          <div>
            <label htmlFor="max_participants" className="block text-sm font-medium text-gray-700 mb-1">
              Max Participants
            </label>
            <Field
              type="number"
              name="max_participants"
              className="w-full p-2 border rounded"
              min="1"
            />
            <ErrorMessage name="max_participants" component="div" className="text-red-500 text-sm mt-1" />
          </div>
          
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Processing...' : buttonText}
          </button>
        </Form>
      )}
    </Formik>
  );
};

export default EventForm;
```

### App Router (src/App.tsx)

```typescript
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import Dashboard from './pages/Dashboard';
import GuildPage from './pages/GuildPage';
import EventDetailsPage from './pages/EventDetailsPage';
import CreateEventPage from './pages/CreateEventPage';
import EditEventPage from './pages/EditEventPage';

const queryClient = new QueryClient();

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/guild/:guildId" 
              element={
                <ProtectedRoute>
                  <GuildPage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/guild/:guildId/event/create" 
              element={
                <ProtectedRoute>
                  <CreateEventPage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/event/:eventId" 
              element={
                <ProtectedRoute>
                  <EventDetailsPage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/event/:eventId/edit" 
              element={
                <ProtectedRoute>
                  <EditEventPage />
                </ProtectedRoute>
              } 
            />
            
            <Route path="/" element={<Navigate to="/dashboard" />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
```

## Battle.net OAuth Integration

### Registering Your Application

1. Go to the [Battle.net Developer Portal](https://develop.battle.net/access/clients)
2. Log in with your Battle.net account
3. Click on "Create Client"
4. Fill in the required information:
   - Name: WoW Guild Manager
   - Redirect URL: <http://localhost:5000/api/auth/callback> (for development)
   - Service URL: Your app's URL
5. Select the required OAuth scopes:
   - wow.profile
6. Save the client and note the Client ID and Client Secret

### Setting Up Environment Variables

Update your `.env` file with the Battle.net credentials:

```
BATTLE_NET_CLIENT_ID=your_client_id
BATTLE_NET_CLIENT_SECRET=your_client_secret
```

## Implementation Timeline

### Phase 1: Setup & Authentication (Week 1)

- [x] Set up project structure
- [x] Initialize database schema
- [x] Implement Battle.net OAuth
- [x] Create user authentication system

### Phase 2: Guild Management (Week 2)

- [ ] Implement guild selection and storage
- [ ] Create guild member display
- [ ] Integrate with Battle.net API for roster

### Phase 3: Event Calendar (Week 3)

- [ ] Build event creation functionality
- [ ] Implement calendar interface
- [ ] Add event subscription system

### Phase 4: Testing & Deployment (Week 4)

- [ ] Test all features
- [ ] Fix bugs and optimize
- [ ] Set up self-hosted deployment
- [ ] Documentation

## Deployment Instructions

### Database Setup

```bash
# Create PostgreSQL database
createdb wow_guild_manager

# Run SQL scripts
psql -d wow_guild_manager -f database/schema.sql
```

### Backend Deployment

```bash
# Build backend
cd backend
bun run build

# Start backend server
bun run start
```

### Frontend Deployment

```bash
# Build frontend
cd frontend
npm run build

# Serve frontend files (example with nginx)
sudo cp -r dist/* /var/www/html/
```

## Security Considerations

- Use HTTPS in production
- Implement rate limiting for API requests
- Securely store access tokens and refresh tokens
- Regularly update dependencies
- Validate all user inputs
- Implement proper error handling
- Set appropriate cookie security options
- Use environment variables for sensitive configuration

## Next Steps and Future Enhancements

After this first iteration, consider these future enhancements:

1. **Role Management**
   - Assign roles to guild members (officer, raid leader, etc.)
   - Permission-based access control

2. **Advanced Event Features**
   - Role requirements for events (tanks, healers, DPS)
   - Item level requirements
   - Loot distribution systems

3. **Raid Progression Tracking**
   - Track guild progress through raid tiers
   - Record boss kills and clear times

4. **Discord Integration**
   - Send event notifications to Discord
   - Sync Discord roles with guild roles

5. **Character Management**
   - Detailed character profiles
   - Gear and progress tracking
