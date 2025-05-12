import { z } from 'zod';
import { idSchema, regionSchema, slugSchema, rankSchema, rankIdSchema } from './common.schema.js';

/**
 * Guild-related validation schemas
 */

// Guild ID parameter validation
export const guildIdParamSchema = z.object({
  guildId: idSchema('Guild ID must be a positive integer'),
});

// Guild by name route parameters validation
export const guildByNameParamsSchema = z.object({
  region: regionSchema,
  realm: slugSchema('Realm slug must be lowercase with hyphens only'),
  name: slugSchema('Guild name slug must be lowercase with hyphens only'),
});

// Guild rank parameter validation
export const guildRankParamsSchema = z.object({
  guildId: idSchema('Guild ID must be a positive integer'),
  rankId: rankIdSchema,
});

// Update rank name validation
export const updateRankNameSchema = z.object({
  rank_name: z.string()
    .min(1, 'Rank name is required')
    .max(50, 'Rank name cannot exceed 50 characters')
    .refine(val => val.trim().length > 0, {
      message: 'Rank name cannot be empty or only whitespace',
    }),
});