import db from './db.js';
import { AppError } from '../utils/error-handler.js';

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
      // Process values: Stringify objects/arrays for JSON/JSONB columns
      const values = Object.values(data).map(value => {
        if (typeof value === 'object' && value !== null) {
          // Check if it's an array or a plain object
          // Stringify if it's intended for a JSON/JSONB column
          // Note: This assumes any object/array value is meant for a JSON column.
          // A more robust solution might involve checking column types, but this is simpler.
          return JSON.stringify(value);
        }
        return value; // Keep non-object values as they are
      });

      const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');

      const result = await db.query(
        `UPDATE ${this.tableName} SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`,
        [...values, id] // Use the processed values
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
      
      // Check if rowCount is not null before comparing
      return (result.rowCount !== null && result.rowCount > 0);
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