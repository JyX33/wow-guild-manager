import dotenv from 'dotenv';
import { AppConfig } from '../../../shared/types/index.js';

// Load environment variables from .env file ONLY if not in production
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

// Define required environment variables
const requiredEnvVars = [
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'BATTLE_NET_CLIENT_ID',
  'BATTLE_NET_CLIENT_SECRET',
  'JWT_SECRET'
];

// Check if all required environment variables are set
const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}
// log all environment variables
const allEnvVars = Object.entries(process.env).map(([key, value]) => `${key}: ${value}`).join('\n');
console.log('Environment Variables:\n', allEnvVars);

const config: AppConfig = {
  server: {
    port: parseInt(process.env.PORT || '5000'),
    nodeEnv: process.env.NODE_ENV || 'development',
    frontendUrl: process.env.FRONTEND_URL || 'https://localhost:5173'
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433'),
    name: process.env.DB_NAME || 'wow_guild_manager',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET || '',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || '',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    cookieMaxAge: parseInt(process.env.COOKIE_MAX_AGE || '3600000'), // 1 hour
    refreshCookieMaxAge: parseInt(process.env.REFRESH_COOKIE_MAX_AGE || '604800000') // 7 days
  },
  battlenet: {
    clientId: process.env.BATTLE_NET_CLIENT_ID || '',
    clientSecret: process.env.BATTLE_NET_CLIENT_SECRET || '',
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
      },
      cn: {
        authBaseUrl: 'https://www.battlenet.com.cn/oauth',
        apiBaseUrl: 'https://gateway.battlenet.com.cn'
      }
    }
  }
};

export default config;