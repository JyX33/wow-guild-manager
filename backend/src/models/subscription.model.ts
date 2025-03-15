import { EventSubscription } from '../../../shared/types/index';
import BaseModel from '../db/BaseModel';
import db from '../db/db';
import { AppError } from '../utils/error-handler';

interface SubscriptionRow extends EventSubscription {
  battletag: string;
}

interface EventWithSubscription {
  id: number;
  status: string;
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
   * Find all subscribers for an event, with user information
   */
  async findByEventId(eventId: number): Promise<SubscriptionRow[]> {
    try {
      const result = await db.query(
        `SELECT es.*, u.battletag
         FROM event_subscriptions es
         JOIN users u ON es.user_id = u.id
         WHERE es.event_id = $1
         ORDER BY es.status ASC, es.character_role ASC`,
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
        `SELECT e.*, es.status, es.character_name, es.character_class, es.character_role
         FROM events e
         JOIN event_subscriptions es ON e.id = es.event_id
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
        `SELECT character_role, COUNT(*) as count
         FROM event_subscriptions
         WHERE event_id = $1 AND status = 'Confirmed'
         GROUP BY character_role`,
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