import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import https from 'https';
import fs from 'fs';
import path from 'path';
import config from './config';

import authRoutes from './routes/auth.routes';
import guildRoutes from './routes/guild.routes';
import eventRoutes from './routes/event.routes';
import { errorHandlerMiddleware, notFoundHandler } from './utils/error-handler';

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: [
    config.server.frontendUrl,
    'https://127.0.0.1:5173'
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

// API Health check route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/guilds', guildRoutes);
app.use('/api/events', eventRoutes);

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