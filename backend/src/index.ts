import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import session from 'express-session';
import pg from 'pg'; // Import pg
import connectPgSimple from 'connect-pg-simple'; // Import connect-pg-simple
import fs from 'fs';
import https from 'https';
import path from 'path';
import schedule from 'node-schedule';
import battleNetSyncService from './jobs/battlenet-sync.service';
import config from './config';
import logger from './utils/logger'; // Import the logger

import authRoutes from './routes/auth.routes';
import eventRoutes from './routes/event.routes';
import guildRoutes from './routes/guild.routes';
import characterRoutes from './routes/character.routes';
import { errorHandlerMiddleware, notFoundHandler } from './utils/error-handler';

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

// Start HTTPS server
const PORT = config.server.port;

// SSL certificate paths - using absolute paths for certainty
const certPath = path.resolve(__dirname, '../../certs/cert.pem');
const keyPath = path.resolve(__dirname, '../../certs/key.pem');

// Create HTTPS server
const httpsOptions = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath)
};

https.createServer(httpsOptions, app).listen(PORT, '0.0.0.0', () => {
  logger.info(`HTTPS Server running on port ${PORT} (${config.server.nodeEnv} mode, accessible from all interfaces)`);
  logger.info(`Frontend URL: ${config.server.frontendUrl}`);
});

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
  battleNetSyncService.runSync().catch(error => {
    logger.error({ err: error }, '[Startup] Error during initial sync:');
  });
}, 10000); // Delay 10 seconds
