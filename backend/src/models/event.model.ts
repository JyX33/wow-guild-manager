import { Event } from '../../../shared/types/index.js';
import BaseModel from '../db/BaseModel.js';
import db from '../db/db.js';
import { AppError } from '../utils/error-handler.js';

class EventModel extends BaseModel<Event> {
  constructor() {
    super('events');
  }

  /**
   * Find events by guild ID
   */
  async findByGuildId(guildId: number): Promise<Event[]> {
    try {
      return await this.findAll({ guild_id: guildId });
    } catch (error) {
      throw new AppError(`Error finding events by guild ID: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
  
  /**
   * Find events by creator ID
   */
  async findByCreatorId(userId: number): Promise<Event[]> {
    try {
      return await this.findAll({ created_by: userId });
    } catch (error) {
      throw new AppError(`Error finding events by creator ID: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
  
  /**
   * Find future events by guild ID
   */
  async findFutureEvents(guildId: number): Promise<Event[]> {
    try {
      const now = new Date().toISOString();
      
      const result = await db.query(
        `SELECT * FROM ${this.tableName} WHERE guild_id = $1 AND end_time > $2 ORDER BY start_time ASC`,
        [guildId, now]
      );
      
      return result.rows;
    } catch (error) {
      throw new AppError(`Error finding future events: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
  
  /**
   * Delete an event with all its subscriptions
   */
  async deleteEvent(id: number): Promise<Event | null> {
    try {
      // Start a transaction to ensure both operations succeed or fail together
      const client = await db.getClient();
      
      try {
        await client.query('BEGIN');
        
        // First delete all subscriptions for this event
        await client.query(
          'DELETE FROM event_subscriptions WHERE event_id = $1',
          [id]
        );
        
        // Then delete the event itself
        const result = await client.query(
          `DELETE FROM ${this.tableName} WHERE id = $1 RETURNING *`,
          [id]
        );
        
        await client.query('COMMIT');
        
        return result.rows[0] || null;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (error) {
      throw new AppError(`Error deleting event: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
  
  /**
   * Check if a user is the creator of an event
   */
  async isEventCreator(eventId: number, userId: number): Promise<boolean> {
    try {
      const event = await this.findById(eventId);
      return !!event && event.created_by === userId;
    } catch (error) {
      throw new AppError(`Error checking event creator: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
}

export default new EventModel();