import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import session from 'express-session';
import pg from 'pg'; // Import pg
import connectPgSimple from 'connect-pg-simple'; // Import connect-pg-simple
import fs from 'fs';
import https from 'https';
import http from 'http'; // Import http module
import path from 'path';
import schedule from 'node-schedule';
import battleNetSyncService from './jobs/battlenet-sync.service.js';
import config from './config/index.js';
import logger from './utils/logger.js'; // Import the logger

import authRoutes from './routes/auth.routes.js';
import eventRoutes from './routes/event.routes.js';
import guildRoutes from './routes/guild.routes.js';
import characterRoutes from './routes/character.routes.js';
import { errorHandlerMiddleware, notFoundHandler } from './utils/error-handler.js';

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: [
    config.server.frontendUrl,
    'https://127.0.0.1:5000'
  ],
  credentials: true
}));

// PostgreSQL session store setup
const PgStore = connectPgSimple(session as any); // Cast to any to resolve type conflict
const connectionString = `postgresql://${config.database.user}:${config.database.password}@${config.database.host}:${config.database.port}/${config.database.name}`;
const pgPool = new pg.Pool({ connectionString });

const sessionStore = new PgStore({
  pool: pgPool,
  tableName: 'user_sessions', // Name of the session table
  createTableIfMissing: true, // Automatically create the table
});


// Session middleware
app.use(session({
  store: sessionStore, // Use the PostgreSQL store
  secret: config.auth.jwtSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true, // Always true since we use HTTPS
    httpOnly: true,
    maxAge: config.auth.cookieMaxAge
  }
}) as any); // Cast to any to bypass complex type error for now


// API Health check routes
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
  });
});

app.get('/api/healthcheck', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/guilds', guildRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/characters', characterRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandlerMiddleware);

// Start server based on environment
const PORT = config.server.port;
const NODE_ENV = config.server.nodeEnv; // Keep this for logging if needed elsewhere

// Check process.env directly for server start logic
logger.info(`[Debug] Value of process.env.NODE_ENV: '${process.env.NODE_ENV}'`);
logger.info(`[Debug] Type of process.env.NODE_ENV: ${typeof process.env.NODE_ENV}`);
logger.info(`[Debug] Comparison result (process.env.NODE_ENV === 'production'): ${process.env.NODE_ENV === 'production'}`);
if (process.env.NODE_ENV === 'production') {
  // In production (behind Coolify's proxy), run HTTP server
  http.createServer(app).listen(PORT, '0.0.0.0', () => {
    logger.info(`HTTP Server running on port ${PORT} (${NODE_ENV} mode, behind reverse proxy)`);
    logger.info(`Frontend URL: ${config.server.frontendUrl}`);
  });
} else {
  // In development or other environments, run HTTPS server with self-signed certs
  try {
    const certPath = path.resolve(__dirname, '../../certs/cert.pem');
    const keyPath = path.resolve(__dirname, '../../certs/key.pem');

    if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
      logger.error(`Certificate files not found at ${certPath} or ${keyPath}. Cannot start HTTPS server.`);
      process.exit(1); // Exit if certs are missing in non-production
    }

    const httpsOptions = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath)
    };

    https.createServer(httpsOptions, app).listen(PORT, '0.0.0.0', () => {
      logger.info(`HTTPS Server running on port ${PORT} (${NODE_ENV} mode, accessible from all interfaces)`);
      logger.info(`Frontend URL: ${config.server.frontendUrl}`);
    });
  } catch (error) {
    logger.error({ err: error }, `Failed to start HTTPS server in ${NODE_ENV} mode.`);
    process.exit(1);
  }
}

// Schedule background sync job (e.g., run every hour at the start of the hour)
// Define the default cron schedule
const defaultSyncSchedule = '0 * * * *'; // Run every hour at minute 0
// Read schedule from environment variable or use default
const syncSchedule = process.env.SYNC_JOB_CRON_SCHEDULE || defaultSyncSchedule;
logger.info(`[Scheduler] Using sync schedule: "${syncSchedule}" (Default: "${defaultSyncSchedule}")`);

const syncJob = schedule.scheduleJob(syncSchedule, async () => {
  logger.info(`[Scheduler] Running scheduled Battle.net sync job at ${new Date().toISOString()}`);
  try {
    await battleNetSyncService.runSync();
  } catch (error) {
    logger.error({ err: error }, '[Scheduler] Error during scheduled sync job:');
  }
});
logger.info(`[Scheduler] Next sync job scheduled for: ${syncJob.nextInvocation()}`);

// Optional: Run sync once on startup after a short delay
setTimeout(() => {
  logger.info('[Startup] Triggering initial Battle.net sync...');
  battleNetSyncService.runSync().catch((error: any) => {
    logger.error({ err: error }, '[Startup] Error during initial sync:');
  });
}, 10000); // Delay 10 seconds
