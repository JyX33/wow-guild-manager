# Phase 1: Eliminating `any` Type in Database Query Parameters

## Overview
This implementation plan focuses on replacing all `any` types in database query parameters with proper strong typing. This is prioritized as the most critical improvement because it affects the core data access layer and improves type safety for all database operations.

## Implementation Steps

### 1. Create Query Parameter Interfaces

```typescript
// /mnt/f/Projects/wow-guild-manager/shared/types/db.ts

/**
 * Base interface for database query conditions
 * Used for strongly typed querying instead of Record<string, any>
 */
export interface DbQueryCondition<T> {
  [key: string]: T[keyof T] | Array<T[keyof T]> | null;
}

/**
 * Database query operators for complex queries
 */
export enum DbQueryOperator {
  EQUALS = '=',
  NOT_EQUALS = '!=',
  GREATER_THAN = '>',
  LESS_THAN = '<',
  GREATER_THAN_EQUALS = '>=',
  LESS_THAN_EQUALS = '<=',
  LIKE = 'LIKE',
  ILIKE = 'ILIKE',
  IN = 'IN',
  NOT_IN = 'NOT IN',
  IS_NULL = 'IS NULL',
  IS_NOT_NULL = 'IS NOT NULL',
}

/**
 * Complex condition allowing specific SQL operators
 */
export interface DbComplexCondition<T> {
  field: keyof T;
  operator: DbQueryOperator;
  value: T[keyof T] | Array<T[keyof T]> | null;
}

/**
 * Query sorting options
 */
export interface DbQuerySort<T> {
  field: keyof T;
  direction: 'ASC' | 'DESC';
}

/**
 * Pagination parameters
 */
export interface DbQueryPagination {
  page: number;
  limit: number;
}

/**
 * Complete query parameters structure
 */
export interface DbQueryParams<T> {
  conditions?: DbQueryCondition<T>;
  complexConditions?: DbComplexCondition<T>[];
  sort?: DbQuerySort<T>[];
  pagination?: DbQueryPagination;
}

/**
 * Query result with pagination metadata
 */
export interface DbPaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

### 2. Update BaseModel Generic Types

```typescript
// /mnt/f/Projects/wow-guild-manager/backend/src/db/BaseModel.ts

import { DbQueryCondition, DbQueryParams, DbPaginatedResult } from '../../../shared/types/db.js';

export default class BaseModel<T> {
  tableName: string;
  
  constructor(tableName: string) {
    this.tableName = tableName;
  }
  
  /**
   * Find all records matching conditions
   */
  async findAll(conditions?: DbQueryCondition<T>): Promise<T[]> {
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
   * Find a single record by conditions
   */
  async findOne(conditions: DbQueryCondition<T>): Promise<T | null> {
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
  async count(conditions?: DbQueryCondition<T>): Promise<number> {
    try {
      let query = `SELECT COUNT(*) FROM ${this.tableName}`;
      const values: Array<T[keyof T] | null> = [];
      
      if (conditions && Object.keys(conditions).length > 0) {
        const keys = Object.keys(conditions);
        values.push(...Object.values(conditions));
        
        const whereClause = keys.map((key, index) => `${key} = $${index + 1}`).join(' AND ');
        query += ` WHERE ${whereClause}`;
      }
      
      const result = await db.query(query, values);
      return parseInt(result.rows[0].count);
    } catch (error) {
      throw new AppError(`Error counting ${this.tableName}: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }

  /**
   * Find with advanced query parameters (new method)
   */
  async findWithParams(params: DbQueryParams<T>): Promise<T[]> {
    try {
      // Start building the query
      let query = `SELECT * FROM ${this.tableName}`;
      const values: Array<T[keyof T] | null> = [];
      let paramIndex = 1;

      // Process simple conditions
      if (params.conditions && Object.keys(params.conditions).length > 0) {
        const keys = Object.keys(params.conditions);
        values.push(...Object.values(params.conditions));
        
        const whereClause = keys.map((key, index) => `${key} = $${index + paramIndex}`).join(' AND ');
        query += ` WHERE ${whereClause}`;
        paramIndex += keys.length;
      }

      // Process complex conditions
      if (params.complexConditions && params.complexConditions.length > 0) {
        const prefix = params.conditions && Object.keys(params.conditions).length > 0 ? ' AND ' : ' WHERE ';
        
        const complexClauses = params.complexConditions.map((condition, index) => {
          const { field, operator, value } = condition;
          
          // Handle operators that don't need values (IS NULL, IS NOT NULL)
          if (operator === DbQueryOperator.IS_NULL || operator === DbQueryOperator.IS_NOT_NULL) {
            return `${String(field)} ${operator}`;
          }
          
          // Handle list operators (IN, NOT IN)
          if (operator === DbQueryOperator.IN || operator === DbQueryOperator.NOT_IN) {
            const valueArray = value as Array<T[keyof T]>;
            const placeholders = valueArray.map((_, i) => `$${paramIndex + i}`).join(', ');
            values.push(...valueArray);
            paramIndex += valueArray.length;
            return `${String(field)} ${operator} (${placeholders})`;
          }
          
          // Standard operators
          values.push(value as T[keyof T]);
          return `${String(field)} ${operator} $${paramIndex++}`;
        }).join(' AND ');
        
        query += prefix + complexClauses;
      }

      // Add sorting
      if (params.sort && params.sort.length > 0) {
        const sortClauses = params.sort.map(sort => `${String(sort.field)} ${sort.direction}`).join(', ');
        query += ` ORDER BY ${sortClauses}`;
      }

      // Add pagination
      if (params.pagination) {
        const { page, limit } = params.pagination;
        const offset = (page - 1) * limit;
        query += ` LIMIT ${limit} OFFSET ${offset}`;
      }

      const result = await db.query(query, values);
      return result.rows;
    } catch (error) {
      throw new AppError(`Error querying ${this.tableName}: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }

  /**
   * Find with pagination
   */
  async findPaginated(params: DbQueryParams<T>): Promise<DbPaginatedResult<T>> {
    try {
      // Ensure pagination params exist
      const pagination = params.pagination || { page: 1, limit: 20 };
      const queryParams = { ...params, pagination };

      // Get total count first
      const totalCount = await this.count(params.conditions);
      
      // Get paginated data
      const data = await this.findWithParams(queryParams);
      
      // Calculate total pages
      const totalPages = Math.ceil(totalCount / pagination.limit);
      
      return {
        data,
        total: totalCount,
        page: pagination.page,
        limit: pagination.limit,
        totalPages
      };
    } catch (error) {
      throw new AppError(`Error paginating ${this.tableName}: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
}
```

### 3. Update Database Client Query Interface

```typescript
// /mnt/f/Projects/wow-guild-manager/backend/src/db/db.ts

import { Pool, QueryResult, QueryConfig } from 'pg';
import config from '../config/index.js';
import logger from '../utils/logger.js';

// Define the type for query parameters
export type QueryParams = string | number | boolean | null | Date | Array<string | number | boolean | null | Date>;

// Define client with lastQuery tracking
export interface TrackedClient extends pg.PoolClient {
  lastQuery?: QueryConfig | [string, ...QueryParams[]] | string;
  originalQuery?: typeof pg.PoolClient.prototype.query;
}

// Create a connection pool
const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  user: config.database.user,
  password: config.database.password
});

// Test the connection
pool.query('SELECT NOW()', (err: Error | null) => {
  if (err) {
    logger.error({ err }, 'Error connecting to the database:');
  } else {
    logger.info('Database connected successfully');
  }
});

export default {
  query: (text: string, params?: QueryParams[]): Promise<QueryResult> => pool.query(text, params),
  getClient: async (): Promise<TrackedClient> => {
    const client = await pool.connect() as TrackedClient;
    const release = client.release;
    const originalQuery = client.query;

    // Add tracking properties
    client.lastQuery = null;
    client.originalQuery = originalQuery;

    // Set a timeout of 5 seconds, after which we will log this client's last query
    const timeout = setTimeout(() => {
      logger.error({ lastQuery: client.lastQuery }, 'A client has been checked out for more than 5 seconds!');
    }, 5000);

    // Monkey patch the query method to track the last query executed
    client.query = function(
      config: QueryConfig | string,
      values?: QueryParams[],
      callback?: (err: Error, result: QueryResult) => void
    ): Promise<QueryResult> {
      // Store query for debugging
      client.lastQuery = values ? [config as string, ...values] : config;
      
      // Call the original query method with the right context
      if (typeof config === 'string' && values && callback) {
        return originalQuery.call(client, config, values, callback);
      } else if (typeof config === 'string' && values) {
        return originalQuery.call(client, config, values);
      } else if (typeof config === 'string') {
        return originalQuery.call(client, config);
      } else {
        return originalQuery.call(client, config);
      }
    };

    client.release = () => {
      clearTimeout(timeout);
      // Restore original query function
      client.query = originalQuery;
      client.release = release;
      return release.apply(client);
    };

    return client;
  },
  // Add a method to end the pool
  end: () => {
    logger.info('Closing database connection pool.'); // Log pool closure
    return pool.end();
  }
};
```

### 4. Update Model Implementations with Type Safety

For each model, enforce proper typing by using the database-specific interfaces. For example:

```typescript
// /mnt/f/Projects/wow-guild-manager/backend/src/models/guild.model.ts

import { Guild } from '../../../shared/types/index.js';
import { DbGuild, BattleNetGuildRoster, BattleNetGuildMember } from '../../../shared/types/guild.js';
import { DbQueryCondition } from '../../../shared/types/db.js';
import BaseModel from '../db/BaseModel.js';
import { AppError } from '../utils/error-handler.js';
import db from '../db/db.js';
import { Guild as GuildType } from '../../../shared/types/guild.js';

// Create type-safe query conditions for guild
type GuildQueryCondition = DbQueryCondition<DbGuild>;

export class GuildModel extends BaseModel<DbGuild> {
  constructor() {
    super('guilds');
  }
  
  async findOutdatedGuilds(): Promise<GuildType[]> {
    try {
      const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000); // 8 hours ago
      
      const result = await db.query(
        `SELECT * FROM ${this.tableName}
         WHERE (last_roster_sync IS NULL OR last_roster_sync < $1)
           AND exclude_from_sync = false
         ORDER BY last_roster_sync ASC NULLS FIRST
         LIMIT 50`,
        [eightHoursAgo.toISOString()]
      );
      
      return result.rows;
    } catch (error) {
      throw new AppError(`Error finding outdated guilds: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }

  async findByNameRealmRegion(name: string, realm: string, region: string): Promise<Guild | null> {
    try {
      // Create a type-safe condition object
      const condition: GuildQueryCondition = { name, realm, region };
      return await this.findOne(condition);
    } catch (error) {
      throw new AppError(`Error finding guild by name/realm/region: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }

  // Other methods similarly updated with proper typing
}
```

## Testing Plan

1. Add unit tests for the updated BaseModel with the new type-safe methods
2. Test edge cases like null values, array values, and complex queries
3. Verify that existing functionality works with the new typings
4. Run TypeScript in strict mode to verify type compatibility