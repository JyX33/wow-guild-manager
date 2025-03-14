import db from './db';
import { AppError } from '../utils/error-handler';

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
}