import { z } from 'zod';

/**
 * Common validation schemas for reuse across different controllers
 */

// Basic ID validation with customizable error message
export const idSchema = (errorMessage = 'Invalid ID format') => 
  z.coerce.number().int().positive().or(z.string().regex(/^\d+$/).transform(Number))
    .refine(val => !isNaN(val), { message: errorMessage });

// Pagination parameters schema
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20)
});

// Battle.net region validation
export const regionSchema = z.enum(['us', 'eu', 'kr', 'tw'], {
  errorMap: () => ({ message: 'Region must be one of: us, eu, kr, tw' })
});

// Slug validation (lowercase-with-hyphens format)
export const slugSchema = (errorMessage = 'Invalid slug format') =>
  z.string().regex(/^[a-z0-9-]+$/, { message: errorMessage });

// Common string validation patterns
export const commonString = {
  name: z.string().min(1, 'Name is required').max(100, 'Name cannot exceed 100 characters'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  uuid: z.string().uuid('Invalid UUID format'),
  nonEmpty: z.string().min(1, 'Field cannot be empty'),
  trimmed: z.string().trim().min(1, 'Field cannot be empty or only whitespace'),
};

// Date validation helpers
export const dateSchema = {
  iso: z.string().datetime('Invalid ISO date format'),
  unix: z.number().int().positive('Invalid UNIX timestamp'),
  future: z.date().refine(date => date > new Date(), {
    message: 'Date must be in the future'
  }),
};

// Guild rank validation (0-9)
export const rankSchema = z.number().int().min(0).max(9);

// Boolean coercion for query parameters that might come as strings
export const booleanSchema = z.union([
  z.boolean(),
  z.enum(['true', 'false']).transform(val => val === 'true'),
  z.enum(['0', '1']).transform(val => val === '1'),
]);

// Generic error messages
export const errorMessages = {
  required: 'This field is required',
  invalidFormat: 'Invalid format',
  tooShort: (min: number) => `Must be at least ${min} characters`,
  tooLong: (max: number) => `Cannot exceed ${max} characters`,
  invalidOption: (options: string[]) => `Must be one of: ${options.join(', ')}`,
};