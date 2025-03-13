import db from './db';

export default {
  findById: async (id: number) => {
    const result = await db.query(
      'SELECT * FROM guilds WHERE id = $1',
      [id]
    );
    return result.rows[0];
  },
  
  findByNameRealmRegion: async (name: string, realm: string, region: string) => {
    const result = await db.query(
      'SELECT * FROM guilds WHERE name = $1 AND realm = $2 AND region = $3',
      [name, realm, region]
    );
    return result.rows[0];
  },
  
  create: async (guildData: any) => {
    const result = await db.query(
      `INSERT INTO guilds 
      (name, realm, region, guild_data) 
      VALUES ($1, $2, $3, $4) 
      RETURNING *`,
      [
        guildData.name,
        guildData.realm,
        guildData.region,
        guildData.guild_data
      ]
    );
    return result.rows[0];
  },
  
  update: async (id: number, guildData: any) => {
    const result = await db.query(
      `UPDATE guilds 
      SET guild_data = $1, last_updated = CURRENT_TIMESTAMP 
      WHERE id = $2 
      RETURNING *`,
      [
        guildData.guild_data,
        id
      ]
    );
    return result.rows[0];
  }
};