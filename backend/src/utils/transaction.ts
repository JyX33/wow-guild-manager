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