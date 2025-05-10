import { PoolClient, QueryConfig, QueryResult } from "pg";
import { DbQueryParam } from "../../../shared/types/db.js";

/**
 * Interface for a database client with query tracking
 */
export interface TrackedClient extends PoolClient {
  lastQuery?: QueryConfig | [string, ...DbQueryParam[]] | string;
  originalQuery?: any; // Use any as a temporary workaround for complex typing issue
}

/**
 * QueryFn type definition for various query function signatures
 */
export type QueryFn =
  & ((text: string) => Promise<QueryResult>)
  & ((text: string, values: DbQueryParam[]) => Promise<QueryResult>)
  & ((config: QueryConfig) => Promise<QueryResult>);

/**
 * Database client interface with typed query methods
 */
export interface DbClient {
  query(text: string): Promise<QueryResult>;
  query(text: string, values: DbQueryParam[]): Promise<QueryResult>;
  query(config: QueryConfig): Promise<QueryResult>;
  getClient(): Promise<TrackedClient>;
  end(): Promise<void>;
}
