/// <reference types="pg" />

import { Pool } from 'pg';
import config from '../config';

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
    console.error('Error connecting to the database:', err);
  } else {
    console.log('Database connected successfully');
  }
});

export default {
  query: (text: string, params?: any[]) => pool.query(text, params),
  getClient: async () => {
    const client = await pool.connect();
    // const query = client.query; // Removed unused variable
    const release = client.release;
    
      // Add a dynamic property for tracking
      (client as any).lastQuery = null;

      // Set a timeout of 5 seconds, after which we will log this client's last query
      const timeout = setTimeout(() => {
        console.error('A client has been checked out for more than 5 seconds!');
        // Access the dynamic property
        console.error(`The last executed query on this client was: ${(client as any).lastQuery}`);
      }, 5000);

      // Monkey patch the query method to track the last query executed
      // Store original query function before overriding
      const originalQuery = client.query;
      client.query = (...args: any[]): Promise<any> => { // Explicitly return Promise<any> or more specific type
        (client as any).lastQuery = args; // Store args
        // Ensure 'apply' gets the correct context and arguments structure
        // The original 'query' can have multiple signatures, using 'any' for simplicity here
        return originalQuery.apply(client, args as any) as unknown as Promise<any>;
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
  end: () => pool.end()
};