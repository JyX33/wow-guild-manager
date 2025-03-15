import { EventSubscription } from '../../../shared/types/index';
import BaseModel from '../db/BaseModel';
import db from '../db/db';
import { AppError } from '../utils/error-handler';

class SubscriptionModel extends BaseModel<EventSubscription> {
  constructor() {
    super('event_subscriptions');
  }

  async findByEventAndUser(eventId: number, userId: number): Promise<EventSubscription | null> {
    try {
      return await this.findOne({ event_id: eventId, user_id: userId });
    } catch (error) {
      throw new AppError(`Error finding subscription by event and user: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
  
  async findByEventId(eventId: number): Promise<EventSubscription[]> {
    try {
      const result = await db.query(
        `SELECT es.*, u.battletag
         FROM event_subscriptions es
         JOIN users u ON es.user_id = u.id
         WHERE es.event_id = $1`,
        [eventId]
      );
      return result.rows;
    } catch (error) {
      throw new AppError(`Error finding subscriptions by event ID: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
}

export default new SubscriptionModel();