import { EventSubscription } from '../../../shared/types/index.js'; // Removed unused LegacyEventSubscription
import BaseModel from '../db/BaseModel.js';
import db from '../db/db.js';
import { AppError } from '../utils/error-handler.js';

interface SubscriptionRow extends EventSubscription {
  battletag: string;
  character_name: string;
  character_class: string;
  character_role: string;
}

interface EventWithSubscription {
  id: number;
  status: string;
  character_id: number;
  character_name: string;
  character_class: string;
  character_role: string;
  [key: string]: any;  // For other event properties
}

class SubscriptionModel extends BaseModel<EventSubscription> {
  constructor() {
    super('event_subscriptions');
  }

  /**
   * Find by event and user
   */
  async findByEventAndUser(eventId: number, userId: number): Promise<EventSubscription | null> {
    try {
      return await this.findOne({ event_id: eventId, user_id: userId });
    } catch (error) {
      throw new AppError(`Error finding subscription by event and user: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
  
  /**
   * Find all subscribers for an event, with user and character information
   */
  async findByEventId(eventId: number): Promise<SubscriptionRow[]> {
    try {
      const result = await db.query(
        `SELECT es.*, u.battletag, c.name as character_name, c.class as character_class, c.role as character_role
         FROM event_subscriptions es
         JOIN users u ON es.user_id = u.id
         JOIN characters c ON es.character_id = c.id
         WHERE es.event_id = $1
         ORDER BY es.status ASC, c.role ASC`,
        [eventId]
      );
      return result.rows as SubscriptionRow[];
    } catch (error) {
      throw new AppError(`Error finding subscriptions by event ID: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
  
  /**
   * Find all events a user is subscribed to
   */
  async findEventsByUser(userId: number): Promise<EventWithSubscription[]> {
    try {
      const result = await db.query(
        `SELECT e.*, es.status, es.character_id, c.name as character_name, c.class as character_class, c.role as character_role
         FROM events e
         JOIN event_subscriptions es ON e.id = es.event_id
         JOIN characters c ON es.character_id = c.id
         WHERE es.user_id = $1
         ORDER BY e.start_time ASC`,
        [userId]
      );
      return result.rows as EventWithSubscription[];
    } catch (error) {
      throw new AppError(`Error finding events by user: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
  
  /**
   * Get subscriber count by status
   */
  async getSubscriberCountsByStatus(eventId: number): Promise<Record<string, number>> {
    try {
      const result = await db.query(
        `SELECT status, COUNT(*) as count
         FROM event_subscriptions
         WHERE event_id = $1
         GROUP BY status`,
        [eventId]
      );
      
      // Convert to object with status as key
      const counts: Record<string, number> = {};
      result.rows.forEach((row: { status: string; count: string }) => {
        counts[row.status] = parseInt(row.count);
      });
      
      return counts;
    } catch (error) {
      throw new AppError(`Error getting subscriber counts: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
  
  /**
   * Get subscriber count by role
   */
  async getSubscriberCountsByRole(eventId: number): Promise<Record<string, number>> {
    try {
      const result = await db.query(
        `SELECT c.role as character_role, COUNT(*) as count
         FROM event_subscriptions es
         JOIN characters c ON es.character_id = c.id
         WHERE es.event_id = $1 AND es.status = 'Confirmed'
         GROUP BY c.role`,
        [eventId]
      );
      
      // Convert to object with role as key
      const counts: Record<string, number> = {};
      result.rows.forEach((row: { character_role: string; count: string }) => {
        counts[row.character_role] = parseInt(row.count);
      });
      
      return counts;
    } catch (error) {
      throw new AppError(`Error getting subscriber role counts: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
}

export default new SubscriptionModel();