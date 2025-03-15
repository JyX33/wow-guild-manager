# Model Architecture Improvements Implementation Plan

This document provides detailed instructions for improving the model architecture in the WoW Guild Manager application. This plan is designed for implementation by AI code tools like Claude Code.

## 1. BaseModel Consistency

### Current Issue

The `BaseModel` class has inconsistent error handling and implementation patterns. Some models correctly use the error handling while others don't.

```typescript
// Current BaseModel.ts:
export default class BaseModel<T> {
  tableName: string;
  
  constructor(tableName: string) {
    this.tableName = tableName;
  }
  
  async findById(id: number): Promise<T | null> {
    try {
      const result = await db.query(
        `SELECT * FROM ${this.tableName} WHERE id = $1`,
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      throw new AppError(`Error finding ${this.tableName} by ID: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
  
  // ... other methods ...
}
```

But some derived models have their own error handling approaches.

### Implementation Steps

1. **Standardize Model Error Handling**

   Find: `backend/src/db/BaseModel.ts`
   
   Update to ensure consistent error handling and type safety:

```typescript
import db from './db';
import { AppError } from '../utils/error-handler';

export default class BaseModel<T> {
  tableName: string;
  
  constructor(tableName: string) {
    this.tableName = tableName;
  }
  
  /**
   * Find a single record by ID
   */
  async findById(id: number): Promise<T | null> {
    try {
      const result = await db.query(
        `SELECT * FROM ${this.tableName} WHERE id = $1`,
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      throw new AppError(`Error finding ${this.tableName} by ID: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
  
  /**
   * Find all records matching conditions
   */
  async findAll(conditions?: Record<string, any>): Promise<T[]> {
    try {
      if (!conditions || Object.keys(conditions).length === 0) {
        const result = await db.query(`SELECT * FROM ${this.tableName}`);
        return result.rows;
      }
      
      const keys = Object.keys(conditions);
      const values = Object.values(conditions);
      
      const whereClause = keys.map((key, index) => `${key} = $${index + 1}`).join(' AND ');
      
      const result = await db.query(
        `SELECT * FROM ${this.tableName} WHERE ${whereClause}`,
        values
      );
      return result.rows;
    } catch (error) {
      throw new AppError(`Error finding all ${this.tableName}: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
  
  /**
   * Create a new record
   */
  async create(data: Partial<T>): Promise<T> {
    try {
      const keys = Object.keys(data);
      const values = Object.values(data);
      
      const columnNames = keys.join(', ');
      const valuePlaceholders = keys.map((_, index) => `$${index + 1}`).join(', ');
      
      const result = await db.query(
        `INSERT INTO ${this.tableName} (${columnNames}) VALUES (${valuePlaceholders}) RETURNING *`,
        values
      );
      
      return result.rows[0];
    } catch (error) {
      throw new AppError(`Error creating ${this.tableName}: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
  
  /**
   * Update an existing record
   */
  async update(id: number, data: Partial<T>): Promise<T | null> {
    try {
      const keys = Object.keys(data);
      const values = Object.values(data);
      
      const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');
      
      const result = await db.query(
        `UPDATE ${this.tableName} SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`,
        [...values, id]
      );
      
      return result.rows[0] || null;
    } catch (error) {
      throw new AppError(`Error updating ${this.tableName}: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
  
  /**
   * Delete a record
   */
  async delete(id: number): Promise<boolean> {
    try {
      const result = await db.query(
        `DELETE FROM ${this.tableName} WHERE id = $1 RETURNING id`,
        [id]
      );
      
      return result.rowCount > 0;
    } catch (error) {
      throw new AppError(`Error deleting ${this.tableName}: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
  
  /**
   * Find a single record by conditions
   */
  async findOne(conditions: Record<string, any>): Promise<T | null> {
    try {
      const keys = Object.keys(conditions);
      const values = Object.values(conditions);
      
      const whereClause = keys.map((key, index) => `${key} = $${index + 1}`).join(' AND ');
      
      const result = await db.query(
        `SELECT * FROM ${this.tableName} WHERE ${whereClause} LIMIT 1`,
        values
      );
      
      return result.rows[0] || null;
    } catch (error) {
      throw new AppError(`Error finding ${this.tableName}: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
  
  /**
   * Count records matching conditions
   */
  async count(conditions?: Record<string, any>): Promise<number> {
    try {
      let query = `SELECT COUNT(*) FROM ${this.tableName}`;
      let values: any[] = [];
      
      if (conditions && Object.keys(conditions).length > 0) {
        const keys = Object.keys(conditions);
        values = Object.values(conditions);
        
        const whereClause = keys.map((key, index) => `${key} = $${index + 1}`).join(' AND ');
        query += ` WHERE ${whereClause}`;
      }
      
      const result = await db.query(query, values);
      return parseInt(result.rows[0].count);
    } catch (error) {
      throw new AppError(`Error counting ${this.tableName}: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
}
```

2. **Update UserModel for Token Handling**

   Find: `backend/src/models/user.model.ts`

   Add specific token-handling methods:

```typescript
import { User, UserRole, UserWithTokens } from '../../../shared/types/index';
import BaseModel from '../db/BaseModel';
import { AppError } from '../utils/error-handler';

class UserModel extends BaseModel<User> {
  constructor() {
    super('users');
  }

  async findByBattleNetId(battleNetId: string): Promise<User | null> {
    try {
      return await this.findOne({ battle_net_id: battleNetId });
    } catch (error) {
      throw new AppError(`Error finding user by Battle.net ID: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }

  async createUser(userData: Partial<User>): Promise<User> {
    // Set default role to USER if not provided
    if (!userData.role) {
      userData.role = UserRole.USER;
    }

    try {
      return await this.create(userData);
    } catch (error) {
      throw new AppError(`Error creating user: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }

  /**
   * Get a user with token information included
   */
  async getUserWithTokens(id: number): Promise<UserWithTokens | null> {
    try {
      const user = await this.findById(id);
      return user as UserWithTokens;
    } catch (error) {
      throw new AppError(`Error getting user with tokens: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }

  /**
   * Update user tokens with type safety
   */
  async updateTokens(
    id: number, 
    accessToken: string, 
    refreshToken: string, 
    expiresAt: Date
  ): Promise<User | null> {
    try {
      return await this.update(id, {
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      throw new AppError(`Error updating user tokens: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }

  /**
   * Validate tokens and check if token is expired
   */
  async validateUserToken(id: number): Promise<{ valid: boolean; expired: boolean }> {
    try {
      const user = await this.getUserWithTokens(id);
      
      if (!user || !user.access_token) {
        return { valid: false, expired: false };
      }
      
      const expired = user.token_expires_at ? new Date(user.token_expires_at) < new Date() : true;
      
      return {
        valid: !!user.access_token,
        expired
      };
    } catch (error) {
      throw new AppError(`Error validating user token: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }

  async updateRole(id: number, role: UserRole): Promise<User | null> {
    try {
      return await this.update(id, { role, updated_at: new Date().toISOString() });
    } catch (error) {
      throw new AppError(`Error updating user role: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }

  async getUsersWithRole(role: UserRole): Promise<User[]> {
    try {
      return await this.findAll({ role });
    } catch (error) {
      throw new AppError(`Error getting users with role: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
}

export default new UserModel();
```

3. **Improve Guild Model with Better Member Relationship**

   Find: `backend/src/models/guild.model.ts`

   Update to implement proper data joining:

```typescript
import { Guild, GuildMember } from '../../../shared/types/index';
import BaseModel from '../db/BaseModel';
import db from '../db/db';
import { AppError } from '../utils/error-handler';

class GuildModel extends BaseModel<Guild> {
  constructor() {
    super('guilds');
  }

  async findByNameRealmRegion(name: string, realm: string, region: string): Promise<Guild | null> {
    try {
      return await this.findOne({ name, realm, region });
    } catch (error) {
      throw new AppError(`Error finding guild by name/realm/region: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }

  /**
   * Get a guild with its members
   */
  async getGuildWithMembers(guildId: number): Promise<{ guild: Guild; members: GuildMember[] } | null> {
    try {
      // Get the guild first
      const guild = await this.findById(guildId);
      
      if (!guild) {
        return null;
      }
      
      // Get members from guild_data, or return empty array if none
      const members = guild.guild_data?.members || [];
      
      return {
        guild,
        members
      };
    } catch (error) {
      throw new AppError(`Error retrieving guild with members: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
  
  /**
   * Update guild data from the API
   */
  async updateGuildData(id: number, guildData: any): Promise<Guild | null> {
    try {
      return await this.update(id, {
        guild_data: guildData,
        last_updated: new Date().toISOString()
      });
    } catch (error) {
      throw new AppError(`Error updating guild data: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
  
  /**
   * Check if guild data needs refreshing (older than 24 hours)
   */
  async needsRefresh(id: number): Promise<boolean> {
    try {
      const guild = await this.findById(id);
      
      if (!guild || !guild.last_updated) {
        return true;
      }
      
      const lastUpdated = new Date(guild.last_updated);
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      return lastUpdated < oneDayAgo;
    } catch (error) {
      throw new AppError(`Error checking if guild needs refresh: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
}

export default new GuildModel();
```

4. **Improve Event Model with Transaction Support**

   Find: `backend/src/models/event.model.ts`

   Update for better transaction handling:

```typescript
import { Event } from '../../../shared/types/index';
import BaseModel from '../db/BaseModel';
import db from '../db/db';
import { AppError } from '../utils/error-handler';

class EventModel extends BaseModel<Event> {
  constructor() {
    super('events');
  }

  /**
   * Find events by guild ID
   */
  async findByGuildId(guildId: number): Promise<Event[]> {
    try {
      return await this.findAll({ guild_id: guildId });
    } catch (error) {
      throw new AppError(`Error finding events by guild ID: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
  
  /**
   * Find events by creator ID
   */
  async findByCreatorId(userId: number): Promise<Event[]> {
    try {
      return await this.findAll({ created_by: userId });
    } catch (error) {
      throw new AppError(`Error finding events by creator ID: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
  
  /**
   * Find future events by guild ID
   */
  async findFutureEvents(guildId: number): Promise<Event[]> {
    try {
      const now = new Date().toISOString();
      
      const result = await db.query(
        `SELECT * FROM ${this.tableName} WHERE guild_id = $1 AND end_time > $2 ORDER BY start_time ASC`,
        [guildId, now]
      );
      
      return result.rows;
    } catch (error) {
      throw new AppError(`Error finding future events: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
  
  /**
   * Delete an event with all its subscriptions
   */
  async deleteEvent(id: number): Promise<Event | null> {
    try {
      // Start a transaction to ensure both operations succeed or fail together
      const client = await db.getClient();
      
      try {
        await client.query('BEGIN');
        
        // First delete all subscriptions for this event
        await client.query(
          'DELETE FROM event_subscriptions WHERE event_id = $1',
          [id]
        );
        
        // Then delete the event itself
        const result = await client.query(
          `DELETE FROM ${this.tableName} WHERE id = $1 RETURNING *`,
          [id]
        );
        
        await client.query('COMMIT');
        
        return result.rows[0] || null;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (error) {
      throw new AppError(`Error deleting event: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
  
  /**
   * Check if a user is the creator of an event
   */
  async isEventCreator(eventId: number, userId: number): Promise<boolean> {
    try {
      const event = await this.findById(eventId);
      return !!event && event.created_by === userId;
    } catch (error) {
      throw new AppError(`Error checking event creator: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
}

export default new EventModel();
```

5. **Improve Subscription Model**

   Find: `backend/src/models/subscription.model.ts`

   Update with added functionality:

```typescript
import { EventSubscription } from '../../../shared/types/index';
import BaseModel from '../db/BaseModel';
import db from '../db/db';
import { AppError } from '../utils/error-handler';

class SubscriptionModel extends BaseModel<EventSubscription> {
  constructor() {
    super('event_subscriptions');
  }

  /**
   * Find by event and user
   */
  async findByEventAndUser(eventId: number, userId: number): Promise<EventSubscription | null> {
    try {
      return await this.findOne({ event_id: eventId, user_id: userId });
    } catch (error) {
      throw new AppError(`Error finding subscription by event and user: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
  
  /**
   * Find all subscribers for an event, with user information
   */
  async findByEventId(eventId: number): Promise<EventSubscription[]> {
    try {
      const result = await db.query(
        `SELECT es.*, u.battletag
         FROM event_subscriptions es
         JOIN users u ON es.user_id = u.id
         WHERE es.event_id = $1
         ORDER BY es.status ASC, es.character_role ASC`,
        [eventId]
      );
      return result.rows;
    } catch (error) {
      throw new AppError(`Error finding subscriptions by event ID: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
  
  /**
   * Find all events a user is subscribed to
   */
  async findEventsByUser(userId: number): Promise<any[]> {
    try {
      const result = await db.query(
        `SELECT e.*, es.status, es.character_name, es.character_class, es.character_role
         FROM events e
         JOIN event_subscriptions es ON e.id = es.event_id
         WHERE es.user_id = $1
         ORDER BY e.start_time ASC`,
        [userId]
      );
      return result.rows;
    } catch (error) {
      throw new AppError(`Error finding events by user: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
  
  /**
   * Get subscriber count by status
   */
  async getSubscriberCountsByStatus(eventId: number): Promise<Record<string, number>> {
    try {
      const result = await db.query(
        `SELECT status, COUNT(*) as count
         FROM event_subscriptions
         WHERE event_id = $1
         GROUP BY status`,
        [eventId]
      );
      
      // Convert to object with status as key
      const counts: Record<string, number> = {};
      result.rows.forEach((row) => {
        counts[row.status] = parseInt(row.count);
      });
      
      return counts;
    } catch (error) {
      throw new AppError(`Error getting subscriber counts: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
  
  /**
   * Get subscriber count by role
   */
  async getSubscriberCountsByRole(eventId: number): Promise<Record<string, number>> {
    try {
      const result = await db.query(
        `SELECT character_role, COUNT(*) as count
         FROM event_subscriptions
         WHERE event_id = $1 AND status = 'Confirmed'
         GROUP BY character_role`,
        [eventId]
      );
      
      // Convert to object with role as key
      const counts: Record<string, number> = {};
      result.rows.forEach((row) => {
        counts[row.character_role] = parseInt(row.count);
      });
      
      return counts;
    } catch (error) {
      throw new AppError(`Error getting subscriber role counts: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
}

export default new SubscriptionModel();
```

6. **Add a Generic Transaction Handler Utility**

   Create a new file: `backend/src/utils/transaction.ts`

```typescript
import db from '../db/db';
import { AppError } from './error-handler';

/**
 * Execute a function within a database transaction
 * 
 * @param callback Function to execute within transaction
 * @returns Result of the callback function
 */
export async function withTransaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    const result = await callback(client);
    
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    
    if (error instanceof AppError) {
      throw error;
    }
    
    throw new AppError(
      `Transaction failed: ${error instanceof Error ? error.message : String(error)}`,
      500
    );
  } finally {
    client.release();
  }
}
```

By implementing these changes, you'll establish a more consistent and robust model architecture with proper error handling, transaction support, and type safety. This will make the codebase more maintainable and reduce the chance of subtle bugs.
