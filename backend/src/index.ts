import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import session from 'express-session';
import fs from 'fs';
import https from 'https';
import path from 'path';
import schedule from 'node-schedule';
import battleNetSyncService from './jobs/battlenet-sync.service';
import config from './config';

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

// Session middleware
app.use(session({
  secret: config.auth.jwtSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: config.server.nodeEnv === 'production',
    httpOnly: true,
    maxAge: config.auth.cookieMaxAge
  }
}));

// API Health check routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/healthcheck', (req, res) => {
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
  console.log(`HTTPS Server running on port ${PORT} (${config.server.nodeEnv} mode, accessible from all interfaces)`);
  console.log(`Frontend URL: ${config.server.frontendUrl}`);
});

// Schedule background sync job (e.g., run every hour at the start of the hour)
const syncJob = schedule.scheduleJob('0 * * * *', async () => {
  console.log(`[Scheduler] Running scheduled Battle.net sync job at ${new Date().toISOString()}`);
  try {
    await battleNetSyncService.runSync();
  } catch (error) {
    console.error('[Scheduler] Error during scheduled sync job:', error);
  }
});
console.log(`[Scheduler] Next sync job scheduled for: ${syncJob.nextInvocation()}`);

// Optional: Run sync once on startup after a short delay
setTimeout(() => {
  console.log('[Startup] Triggering initial Battle.net sync...');
  battleNetSyncService.runSync().catch(error => {
    console.error('[Startup] Error during initial sync:', error);
  });
}, 10000); // Delay 10 seconds
