import db from './db';

export default {
  findById: async (id: number) => {
    const result = await db.query(
      'SELECT * FROM events WHERE id = $1',
      [id]
    );
    return result.rows[0];
  },
  
  findByGuildId: async (guildId: number) => {
    const result = await db.query(
      'SELECT * FROM events WHERE guild_id = $1 ORDER BY start_time',
      [guildId]
    );
    return result.rows;
  },
  
  create: async (eventData: any) => {
    const result = await db.query(
      `INSERT INTO events 
      (title, description, event_type, start_time, end_time, created_by, guild_id, max_participants, event_details) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
      RETURNING *`,
      [
        eventData.title,
        eventData.description,
        eventData.event_type,
        eventData.start_time,
        eventData.end_time,
        eventData.created_by,
        eventData.guild_id,
        eventData.max_participants,
        eventData.event_details
      ]
    );
    return result.rows[0];
  },
  
  update: async (id: number, eventData: any) => {
    const result = await db.query(
      `UPDATE events 
      SET title = $1, description = $2, event_type = $3, start_time = $4, 
          end_time = $5, max_participants = $6, event_details = $7 
      WHERE id = $8 
      RETURNING *`,
      [
        eventData.title,
        eventData.description,
        eventData.event_type,
        eventData.start_time,
        eventData.end_time,
        eventData.max_participants,
        eventData.event_details,
        id
      ]
    );
    return result.rows[0];
  },
  
  delete: async (id: number) => {
    await db.query(
      'DELETE FROM event_subscriptions WHERE event_id = $1',
      [id]
    );
    const result = await db.query(
      'DELETE FROM events WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }
};