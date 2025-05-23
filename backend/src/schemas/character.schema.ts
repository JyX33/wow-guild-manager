import { z } from 'zod';
import { idSchema, regionSchema, slugSchema, characterNameSchema, booleanDefault } from './common.schema.js';

/**
 * Character-related validation schemas
 */

// Character ID parameter validation
export const characterIdParamSchema = z.object({
  characterId: idSchema('Character ID must be a positive integer'),
});

// Character lookup parameters
export const characterLookupParamsSchema = z.object({
  region: regionSchema,
  realm: slugSchema('Realm slug must be lowercase with hyphens only'),
  name: z.string().min(1, 'Character name is required'),
});

// Character sync request validation
export const characterSyncSchema = z.object({
  characterId: idSchema('Character ID must be a positive integer'),
  force: booleanDefault(false),
});

// Character creation/update validation
export const characterSchema = z.object({
  name: characterNameSchema,
  realm: z.string().min(2, 'Realm is required'),
  region: regionSchema,
  class: z.string().optional(),
  level: z.number().int().min(1).max(70).optional(),
});

// Character connection to guild validation
export const characterGuildLinkSchema = z.object({
  characterId: idSchema('Character ID must be a positive integer'),
  guildId: idSchema('Guild ID must be a positive integer'),
  rank: z.number().int().min(0).max(9).optional(),
});