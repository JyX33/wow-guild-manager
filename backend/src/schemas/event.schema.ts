import { z } from 'zod';
import { idSchema, dateSchema } from './common.schema.js';

/**
 * Event-related validation schemas
 */

// Event ID parameter validation
export const eventIdParamSchema = z.object({
  eventId: idSchema('Event ID must be a positive integer'),
});

// Create event validation
export const createEventSchema = z.object({
  guild_id: idSchema('Guild ID must be a positive integer'),
  title: z.string().min(3, 'Event title must be at least 3 characters').max(100, 'Event title cannot exceed 100 characters'),
  description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
  start_time: dateSchema.iso,
  end_time: dateSchema.iso,
  // Make sure end_time is after start_time
  event_type: z.string().min(1, 'Event type is required'),
  location: z.string().optional(),
  max_participants: z.number().int().positive().optional(),
  requirements: z.object({
    min_item_level: z.number().positive().optional(),
    roles_needed: z.object({
      tank: z.number().int().min(0).optional(),
      healer: z.number().int().min(0).optional(),
      dps: z.number().int().min(0).optional(),
    }).optional(),
    class_restrictions: z.array(z.string()).optional(),
  }).optional(),
  is_recurring: z.boolean().optional().default(false),
  recurrence_pattern: z.object({
    frequency: z.enum(['daily', 'weekly', 'monthly']),
    interval: z.number().int().positive(),
    count: z.number().int().positive().optional(),
    until: dateSchema.iso.optional(),
    day_of_week: z.array(z.number().int().min(0).max(6)).optional(),
  }).optional(),
}).refine(
  (data) => {
    if (!data.start_time || !data.end_time) return true;
    return new Date(data.end_time) > new Date(data.start_time);
  },
  {
    message: 'End time must be after start time',
    path: ['end_time']
  }
);

// Update event validation
export const updateEventSchema = z.object({
  title: z.string().min(3, 'Event title must be at least 3 characters').max(100, 'Event title cannot exceed 100 characters').optional(),
  description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
  start_time: dateSchema.iso.optional(),
  end_time: dateSchema.iso.optional(),
  event_type: z.string().min(1, 'Event type is required').optional(),
  location: z.string().optional(),
  max_participants: z.number().int().positive().optional(),
  requirements: z.object({
    min_item_level: z.number().positive().optional(),
    roles_needed: z.object({
      tank: z.number().int().min(0).optional(),
      healer: z.number().int().min(0).optional(),
      dps: z.number().int().min(0).optional(),
    }).optional(),
    class_restrictions: z.array(z.string()).optional(),
  }).optional(),
  is_recurring: z.boolean().optional(),
  recurrence_pattern: z.object({
    frequency: z.enum(['daily', 'weekly', 'monthly']),
    interval: z.number().int().positive(),
    count: z.number().int().positive().optional(),
    until: dateSchema.iso.optional(),
    day_of_week: z.array(z.number().int().min(0).max(6)).optional(),
  }).optional(),
  status: z.enum(['scheduled', 'cancelled', 'completed']).optional(),
}).refine(
  (data) => {
    if (!data.start_time || !data.end_time) return true;
    return new Date(data.end_time) > new Date(data.start_time);
  },
  {
    message: 'End time must be after start time',
    path: ['end_time']
  }
);

// RSVP validation
export const rsvpSchema = z.object({
  character_id: idSchema('Character ID must be a positive integer'),
  status: z.enum(['accepted', 'declined', 'tentative']),
  note: z.string().max(200, 'Note cannot exceed 200 characters').optional(),
});