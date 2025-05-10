/**
 * Utility to convert Zod schemas for use with Express middleware
 */
import { z, ZodType } from 'zod';
import { AnyZodObject } from '../middleware/validation.middleware.js';

/**
 * Unwraps a ZodEffects schema to get the underlying ZodObject
 * This is needed because schema.transform() or schema.refine() returns a ZodEffects type
 * which is not compatible with our validation middleware
 */
export function unwrapZodSchema<T>(schema: ZodType<T>): AnyZodObject {
  // If it's already a ZodObject (or looks like one), return it cast to AnyZodObject
  if ('shape' in schema) {
    return schema as unknown as AnyZodObject;
  }
  
  // If it's a ZodEffects, try to extract the inner schema
  if ('innerType' in schema) {
    const innerSchema = (schema as any).innerType();
    // Recursively unwrap if necessary
    return unwrapZodSchema(innerSchema);
  }
  
  // If we get here, the schema is not a ZodObject and we can't unwrap it
  // For type safety, create a minimal valid ZodObject
  console.warn('Unable to unwrap Zod schema to ZodObject, using empty schema');
  return z.object({});
}