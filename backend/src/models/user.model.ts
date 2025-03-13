import db from './db';

export default {
  findById: async (id: number) => {
    const result = await db.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  },
  
  findByBattleNetId: async (battleNetId: string) => {
    const result = await db.query(
      'SELECT * FROM users WHERE battle_net_id = $1',
      [battleNetId]
    );
    return result.rows[0];
  },
  
  create: async (userData: any) => {
    const result = await db.query(
      `INSERT INTO users 
      (battle_net_id, battletag, access_token, refresh_token, token_expires_at, user_data) 
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING *`,
      [
        userData.battle_net_id,
        userData.battletag,
        userData.access_token,
        userData.refresh_token,
        userData.token_expires_at,
        userData.user_data
      ]
    );
    return result.rows[0];
  },
  
  update: async (id: number, userData: any) => {
    const result = await db.query(
      `UPDATE users 
      SET access_token = $1, refresh_token = $2, token_expires_at = $3, 
          user_data = $4, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $5 
      RETURNING *`,
      [
        userData.access_token,
        userData.refresh_token,
        userData.token_expires_at,
        userData.user_data,
        id
      ]
    );
    return result.rows[0];
  }
};