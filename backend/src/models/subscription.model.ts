import db from './db';

export default {
  findById: async (id: number) => {
    const result = await db.query(
      'SELECT * FROM event_subscriptions WHERE id = $1',
      [id]
    );
    return result.rows[0];
  },
  
  findByEventAndUser: async (eventId: number, userId: number) => {
    const result = await db.query(
      'SELECT * FROM event_subscriptions WHERE event_id = $1 AND user_id = $2',
      [eventId, userId]
    );
    return result.rows[0];
  },
  
  findByEventId: async (eventId: number) => {
    const result = await db.query(
      `SELECT es.*, u.battletag 
       FROM event_subscriptions es
       JOIN users u ON es.user_id = u.id
       WHERE es.event_id = $1`,
      [eventId]
    );
    return result.rows;
  },
  
  create: async (subscriptionData: any) => {
    const result = await db.query(
      `INSERT INTO event_subscriptions 
      (event_id, user_id, status, character_name, character_class, character_role) 
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING *`,
      [
        subscriptionData.event_id,
        subscriptionData.user_id,
        subscriptionData.status,
        subscriptionData.character_name,
        subscriptionData.character_class,
        subscriptionData.character_role
      ]
    );
    return result.rows[0];
  },
  
  update: async (id: number, subscriptionData: any) => {
    const result = await db.query(
      `UPDATE event_subscriptions 
      SET status = $1, character_name = $2, character_class = $3, character_role = $4
      WHERE id = $5 
      RETURNING *`,
      [
        subscriptionData.status,
        subscriptionData.character_name,
        subscriptionData.character_class,
        subscriptionData.character_role,
        id
      ]
    );
    return result.rows[0];
  },
  
  delete: async (id: number) => {
    const result = await db.query(
      'DELETE FROM event_subscriptions WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }
};