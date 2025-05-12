/**
 * Database query types for strongly typed database operations
 */

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

/**
 * Type for database query parameters
 * Used to properly type parameters passed to queries
 */
export type DbQueryParam = string | number | boolean | null | Date | Buffer | unknown | Array<string | number | boolean | null | Date | Buffer | unknown>;