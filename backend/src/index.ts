import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import dotenv from 'dotenv';
import config from '../config/default';

import authRoutes from './routes/auth.routes';
import guildRoutes from './routes/guild.routes';
import eventRoutes from './routes/event.routes';

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173', 
    'http://127.0.0.1:5173'
  ],
  credentials: true
}));

// Session middleware
app.use(session({
  secret: config.jwt.secret,
  resave: false,
  saveUninitialized: false
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/guilds', guildRoutes);
app.use('/api/events', eventRoutes);

// Start server
const PORT = config.server.port;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} (accessible from all interfaces)`);
});