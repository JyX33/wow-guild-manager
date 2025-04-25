// Re-export all services for easy imports
export * from './core';
export * from './auth.service';
export * from './guild.service';
export * from './event.service';
export * from './character.service';
export * from './roster.service';

// Import and re-export services as a single object
import { authService } from './auth.service';
import { guildService } from './guild.service';
import { eventService } from './event.service';
import { characterService } from './character.service';
import { rosterService } from './roster.service';

export const services = {
  auth: authService,
  guild: guildService,
  event: eventService,
  character: characterService,
  roster: rosterService,
};