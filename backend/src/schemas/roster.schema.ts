import { z } from 'zod';
import { idSchema } from './common.schema.js';

/**
 * Roster-related validation schemas
 */

// Roster ID parameter validation
export const rosterIdParamSchema = z.object({
  rosterId: idSchema('Roster ID must be a positive integer'),
});

// Roster with guild parameter validation
export const rosterGuildParamSchema = z.object({
  guildId: idSchema('Guild ID must be a positive integer'),
  rosterId: idSchema('Roster ID must be a positive integer'),
});

// Create roster validation
export const createRosterSchema = z.object({
  guildId: idSchema('Guild ID must be a positive integer'),
  name: z.string().min(1, 'Roster name is required').max(50, 'Roster name cannot exceed 50 characters'),
  description: z.string().max(200, 'Description cannot exceed 200 characters').optional(),
});

// Update roster validation
export const updateRosterSchema = z.object({
  name: z.string().min(1, 'Roster name is required').max(50, 'Roster name cannot exceed 50 characters').optional(),
  description: z.string().max(200, 'Description cannot exceed 200 characters').optional(),
  is_active: z.boolean().optional(),
});

// Add member to roster validation
export const addRosterMemberSchema = z.object({
  characterId: idSchema('Character ID must be a positive integer'),
  role: z.enum(['Tank', 'Healer', 'DPS', 'Unknown'], {
    errorMap: () => ({ message: 'Role must be Tank, Healer, DPS, or Unknown' })
  }).optional(),
  notes: z.string().max(200, 'Notes cannot exceed 200 characters').optional(),
});

// Update roster member validation
export const updateRosterMemberSchema = z.object({
  role: z.enum(['Tank', 'Healer', 'DPS', 'Unknown'], {
    errorMap: () => ({ message: 'Role must be Tank, Healer, DPS, or Unknown' })
  }).optional(),
  notes: z.string().max(200, 'Notes cannot exceed 200 characters').optional(),
  is_active: z.boolean().optional(),
});