import { z } from 'zod';
import { regionSchema } from './common.schema.js';
import { UserRole } from '../../../shared/types/user.js';

/**
 * Auth-related validation schemas
 */

// Login validation
export const loginSchema = z.object({
  region: regionSchema.optional().default('eu'),
});

// Auth callback validation
export const callbackSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  state: z.string().min(1, 'State parameter is required'),
  state_in_redirect: z.string().min(1, 'State in redirect is required'),
  expiry_in_redirect: z.string().regex(/^\d+$/, 'Expiry must be a numeric timestamp')
    .transform(val => parseInt(val, 10))
    .refine(val => !isNaN(val) && val > 0, {
      message: 'Expiry must be a valid timestamp'
    })
});

// Token refresh validation
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// Role update validation
export const updateRoleSchema = z.object({
  userId: z.number().int().positive('User ID must be a positive integer'),
  role: z.nativeEnum(UserRole, {
    errorMap: () => ({ message: `Role must be one of: ${Object.values(UserRole).join(', ')}` })
  }),
});

// Discord link validation
export const discordLinkSchema = z.object({
  token: z.string().min(1, 'Discord link token is required'),
});