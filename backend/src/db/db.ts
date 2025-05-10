/// <reference types="pg" />

import { Pool, QueryConfig, QueryResult } from "pg";
import config from "../config/index.js";
import logger from "../utils/logger.js";
import { DbClient, QueryFn, TrackedClient } from "./db-types.js";
import { DbQueryParam } from "../../../shared/types/db.js";

// Create a connection pool
const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  user: config.database.user,
  password: config.database.password,
});

// Test the connection
pool.query("SELECT NOW()", (err: Error | null) => {
  if (err) {
    logger.error({ err }, "Error connecting to the database:");
  } else {
    logger.info("Database connected successfully");
  }
});

/**
 * Strongly typed database client with query tracking capabilities
 */
const dbClient: DbClient = {
  /**
   * Execute a query with proper type safety
   */
  query: ((
    textOrConfig: string | QueryConfig,
    values?: DbQueryParam[],
  ): Promise<QueryResult> => {
    if (typeof textOrConfig === "string" && values) {
      return pool.query(textOrConfig, values);
    } else if (typeof textOrConfig === "string") {
      return pool.query(textOrConfig);
    } else {
      return pool.query(textOrConfig);
    }
  }) as QueryFn,

  /**
   * Get a client from the pool with monitoring enhancements
   */
  getClient: async (): Promise<TrackedClient> => {
    const client = await pool.connect() as TrackedClient;
    const release = client.release;
    const originalQuery = client.query;

    // Add tracking properties with proper typing
    client.lastQuery = undefined;
    client.originalQuery = originalQuery;

    // Set a timeout of 5 seconds, after which we will log this client's last query
    const timeout = setTimeout(() => {
      logger.error(
        { lastQuery: client.lastQuery },
        "A client has been checked out for more than 5 seconds!",
      );
    }, 5000);

    // Monkey patch the query method to track the last query executed
    // Use type assertion to work around complex typing issues with pg library
    client.query = (function (
      config: any,
      values?: any,
      callback?: any,
    ) {
      // Store query for debugging
      client.lastQuery = values ? [config as string, ...values] : config;

      // Call the original query method with the right context
      try {
        // Use apply instead of call to handle variable arguments more safely
        // Handle the args properly with type assertion for correct tuple structure
      const args = [config, values, callback].filter((arg) => arg !== undefined) as Parameters<typeof originalQuery>;
      return originalQuery.apply(client, args);
      } catch (error) {
        // Convert any errors to a rejected promise
        return Promise.reject(error);
      }
    }) as typeof originalQuery;

    client.release = () => {
      clearTimeout(timeout);
      // Restore original query function
      client.query = originalQuery;
      client.release = release;
      return release.apply(client);
    };

    return client;
  },

  /**
   * End the connection pool
   */
  end: () => {
    logger.info("Closing database connection pool.");
    return pool.end();
  },
};

export default dbClient;
