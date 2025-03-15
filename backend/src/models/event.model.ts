import { Event } from '../../../shared/types/index';
import BaseModel from '../db/BaseModel';
import db from '../db/db';
import { AppError } from '../utils/error-handler';

class EventModel extends BaseModel<Event> {
  constructor() {
    super('events');
  }

  async findByGuildId(guildId: number): Promise<Event[]> {
    try {
      return await this.findAll({ guild_id: guildId });
    } catch (error) {
      throw new AppError(`Error finding events by guild ID: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
  
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
          'DELETE FROM events WHERE id = $1 RETURNING *',
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
}

export default new EventModel();