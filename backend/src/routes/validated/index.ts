import { Express } from 'express';
import authRoutes from './auth.routes.validated.js';
import guildRoutes from './guild.routes.validated.js';
import characterRoutes from './character.routes.validated.js';
import rosterRoutes from './roster.routes.validated.js';
import eventRoutes from './event.routes.validated.js';

/**
 * Registers all validated routes with the Express application
 * @param app Express application instance
 */
export function registerValidatedRoutes(app: Express): void {
  app.use('/api/auth', authRoutes);
  app.use('/api/guilds', guildRoutes);
  app.use('/api/characters', characterRoutes);
  app.use('/api/rosters', rosterRoutes);
  app.use('/api/events', eventRoutes);
  
  // Log that the validated routes have been registered
  console.log('✅ Validated routes registered');
}