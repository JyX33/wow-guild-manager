import db from "./db.js";
import { AppError } from "../utils/error-handler.js";
import {
  // DbComplexCondition, // Unused
  DbPaginatedResult,
  DbQueryCondition,
  DbQueryOperator,
  DbQueryParam,
  DbQueryParams,
} from "../../../shared/types/db.js";

export default class BaseModel<T, TEnhanced extends T = T> {
  tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  /**
   * Find a single record by ID
   */
  async findById(id: number): Promise<TEnhanced | null> {
    try {
      const result = await db.query(
        `SELECT * FROM ${this.tableName} WHERE id = $1`,
        [id],
      );
      return result.rows[0] || null;
    } catch (error) {
      throw new AppError(
        `Error finding ${this.tableName} by ID: ${
          error instanceof Error ? error.message : String(error)
        }`,
        500,
      );
    }
  }

  /**
   * Find all records matching conditions
   */
  async findAll(conditions?: DbQueryCondition<T>): Promise<TEnhanced[]> {
    try {
      if (!conditions || Object.keys(conditions).length === 0) {
        const result = await db.query(`SELECT * FROM ${this.tableName}`);
        return result.rows;
      }

      const keys = Object.keys(conditions);
      const values: DbQueryParam[] = Object.values(conditions);

      const whereClause = keys.map((key, index) => `${key} = $${index + 1}`)
        .join(" AND ");

      const result = await db.query(
        `SELECT * FROM ${this.tableName} WHERE ${whereClause}`,
        values,
      );
      return result.rows;
    } catch (error) {
      throw new AppError(
        `Error finding all ${this.tableName}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        500,
      );
    }
  }

  /**
   * Create a new record
   */
  async create(data: Partial<T>): Promise<TEnhanced> {
    try {
      const keys = Object.keys(data);
      const values: DbQueryParam[] = Object.values(data);

      const columnNames = keys.join(", ");
      const valuePlaceholders = keys.map((_, index) => `$${index + 1}`).join(
        ", ",
      );

      const result = await db.query(
        `INSERT INTO ${this.tableName} (${columnNames}) VALUES (${valuePlaceholders}) RETURNING *`,
        values,
      );

      return result.rows[0];
    } catch (error) {
      throw new AppError(
        `Error creating ${this.tableName}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        500,
      );
    }
  }

  /**
   * Update an existing record
   */
  async update(
    id: number | undefined,
    data: Partial<T>,
  ): Promise<TEnhanced | null> {
    try {
      const keys = Object.keys(data);
      // Process values: Stringify objects/arrays for JSON/JSONB columns
      const values: DbQueryParam[] = Object.values(data).map((value) => {
        if (typeof value === "object" && value !== null) {
          // Check if it's an array or a plain object
          // Stringify if it's intended for a JSON/JSONB column
          // Note: This assumes any object/array value is meant for a JSON column.
          return JSON.stringify(value);
        }
        return value; // Keep non-object values as they are
      });

      const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(
        ", ",
      );

      const result = await db.query(
        `UPDATE ${this.tableName} SET ${setClause} WHERE id = $${
          keys.length + 1
        } RETURNING *`,
        [...values, id], // Use the processed values
      );

      return result.rows[0] || null;
    } catch (error) {
      throw new AppError(
        `Error updating ${this.tableName}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        500,
      );
    }
  }

  /**
   * Delete a record
   */
  async delete(id: number): Promise<boolean> {
    try {
      const result = await db.query(
        `DELETE FROM ${this.tableName} WHERE id = $1 RETURNING id`,
        [id],
      );

      // Check if rowCount is not null before comparing
      return (result.rowCount !== null && result.rowCount > 0);
    } catch (error) {
      throw new AppError(
        `Error deleting ${this.tableName}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        500,
      );
    }
  }

  /**
   * Find a single record by conditions
   */
  async findOne(conditions: DbQueryCondition<T>): Promise<TEnhanced | null> {
    try {
      const keys = Object.keys(conditions);
      const values: DbQueryParam[] = Object.values(conditions);

      const whereClause = keys.map((key, index) => `${key} = $${index + 1}`)
        .join(" AND ");

      const result = await db.query(
        `SELECT * FROM ${this.tableName} WHERE ${whereClause} LIMIT 1`,
        values,
      );

      return result.rows[0] || null;
    } catch (error) {
      throw new AppError(
        `Error finding ${this.tableName}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        500,
      );
    }
  }

  /**
   * Count records matching conditions
   */
  async count(conditions?: DbQueryCondition<T>): Promise<number> {
    try {
      let query = `SELECT COUNT(*) FROM ${this.tableName}`;
      const values: DbQueryParam[] = [];

      if (conditions && Object.keys(conditions).length > 0) {
        const keys = Object.keys(conditions);
        const conditionValues: DbQueryParam[] = Object.values(conditions);
        values.push(...conditionValues);

        const whereClause = keys.map((key, index) => `${key} = $${index + 1}`)
          .join(" AND ");
        query += ` WHERE ${whereClause}`;
      }

      const result = await db.query(query, values);
      return parseInt(result.rows[0].count);
    } catch (error) {
      throw new AppError(
        `Error counting ${this.tableName}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        500,
      );
    }
  }

  /**
   * Find with advanced query parameters
   */
  async findWithParams(params: DbQueryParams<T>): Promise<TEnhanced[]> {
    try {
      // Start building the query
      let query = `SELECT * FROM ${this.tableName}`;
      const values: DbQueryParam[] = [];
      let paramIndex = 1;

      // Process simple conditions
      if (params.conditions && Object.keys(params.conditions).length > 0) {
        const keys = Object.keys(params.conditions);
        const conditionValues: DbQueryParam[] = Object.values(
          params.conditions,
        );
        values.push(...conditionValues);

        const whereClause = keys.map((key, index) =>
          `${key} = $${index + paramIndex}`
        ).join(" AND ");
        query += ` WHERE ${whereClause}`;
        paramIndex += keys.length;
      }

      // Process complex conditions
      if (params.complexConditions && params.complexConditions.length > 0) {
        const prefix =
          params.conditions && Object.keys(params.conditions).length > 0
            ? " AND "
            : " WHERE ";

        const complexClauses = params.complexConditions.map((condition) => {
          const { field, operator, value } = condition;

          // Handle operators that don't need values (IS NULL, IS NOT NULL)
          if (
            operator === DbQueryOperator.IS_NULL ||
            operator === DbQueryOperator.IS_NOT_NULL
          ) {
            return `${String(field)} ${operator}`;
          }

          // Handle list operators (IN, NOT IN)
          if (
            operator === DbQueryOperator.IN ||
            operator === DbQueryOperator.NOT_IN
          ) {
            if (Array.isArray(value)) {
              const placeholders = value.map((_, i) => `$${paramIndex + i}`)
                .join(", ");
              values.push(...value);
              paramIndex += value.length;
              return `${String(field)} ${operator} (${placeholders})`;
            } else {
              throw new Error(`Value for IN/NOT IN operator must be an array`);
            }
          }

          // Standard operators
          values.push(value as DbQueryParam);
          return `${String(field)} ${operator} $${paramIndex++}`;
        }).join(" AND ");

        query += prefix + complexClauses;
      }

      // Add sorting
      if (params.sort && params.sort.length > 0) {
        const sortClauses = params.sort.map((sort) =>
          `${String(sort.field)} ${sort.direction}`
        ).join(", ");
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
      throw new AppError(
        `Error querying ${this.tableName}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        500,
      );
    }
  }

  /**
   * Find with pagination
   */
  async findPaginated(
    params: DbQueryParams<T>,
  ): Promise<DbPaginatedResult<TEnhanced>> {
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
        totalPages,
      };
    } catch (error) {
      throw new AppError(
        `Error paginating ${this.tableName}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        500,
      );
    }
  }
}
