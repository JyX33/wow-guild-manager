export default {
  server: {
    port: process.env.PORT || 5000
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    name: process.env.DB_NAME || 'wow_guild_manager',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
  },
  battlenet: {
    clientId: process.env.BATTLE_NET_CLIENT_ID,
    clientSecret: process.env.BATTLE_NET_CLIENT_SECRET,
    redirectUri: process.env.BATTLE_NET_REDIRECT_URI || 'https://localhost:5000/api/auth/callback',
    regions: {
      eu: {
        authBaseUrl: 'https://eu.battle.net/oauth',
        apiBaseUrl: 'https://eu.api.blizzard.com'
      },
      us: {
        authBaseUrl: 'https://us.battle.net/oauth',
        apiBaseUrl: 'https://us.api.blizzard.com'
      },
      kr: {
        authBaseUrl: 'https://kr.battle.net/oauth',
        apiBaseUrl: 'https://kr.api.blizzard.com'
      },
      tw: {
        authBaseUrl: 'https://tw.battle.net/oauth',
        apiBaseUrl: 'https://tw.api.blizzard.com'
      }
    }
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: '1d'
  }
};