/**
 * Server configuration types
 */

/**
 * Database configuration
 */
export interface DatabaseConfig {
  host: string;
  port: number;
  name: string;
  user: string;
  password: string;
}

/**
 * Server configuration
 */
export interface ServerConfig {
  port: number;
  nodeEnv: string;
  frontendUrl: string;
}

/**
 * Complete application configuration
 */
export interface AppConfig {
  server: ServerConfig;
  database: DatabaseConfig;
  auth: any; // Imported from auth config
  battlenet: any; // Imported from battlenet config
  discord: any; // Imported from discord config
}