import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { createValidationError } from '../utils/error-factory.js';
import logger from '../utils/logger.js';

// Re-export AnyZodObject type for use in other files
export type AnyZodObject = z.ZodObject<any, any, any, { [k: string]: any }, { [k: string]: any }>;

/**
 * Enum for different parts of the request to validate
 */
export enum ValidateTarget {
  BODY = 'body',
  QUERY = 'query',
  PARAMS = 'params',
  HEADERS = 'headers',
}

/**
 * Validation middleware factory
 * @param schema The Zod schema to validate against
 * @param target The part of the request to validate (body, query, params)
 * @returns Express middleware function
 */
export const validate = (schema: AnyZodObject, target: ValidateTarget = ValidateTarget.BODY) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      // Get data to validate based on target
      const dataToValidate = req[target as keyof Request];
      
      // Parse the data against the schema
      await schema.parseAsync(dataToValidate);
      
      // Validation passed, continue to the next middleware
      next();
    } catch (error) {
      // Handle Zod validation errors
      if (error instanceof ZodError) {
        // Use zod-validation-error to create a readable error message
        const validationError = fromZodError(error);
        
        // Extract field-level errors for detailed feedback
        const fieldErrors: Record<string, string> = {};
        
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          fieldErrors[path] = err.message;
        });
        
        logger.debug(
          { 
            error: validationError, 
            target, 
            path: req.path,
            invalidData: req[target as keyof Request]
          }, 
          `Validation error in ${target} for ${req.path}`
        );
        
        // Create a validation error with our error factory
        next(createValidationError(
          validationError.message,
          fieldErrors,
          req[target as keyof Request],
          req
        ));
      } else {
        // Pass any other errors to the error handler
        next(error);
      }
    }
  };
};

/**
 * Validate multiple parts of a request with different schemas
 * @param schemaMap Object mapping target parts to their schemas
 * @returns Express middleware function 
 */
export const validateRequest = (schemaMap: Record<ValidateTarget, AnyZodObject>) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate each target against its schema
      for (const [target, schema] of Object.entries(schemaMap)) {
        const dataToValidate = req[target as keyof Request];
        await schema.parseAsync(dataToValidate);
      }
      
      // All validations passed
      next();
    } catch (error) {
      // Handle Zod validation errors
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        
        // Extract field-level errors
        const fieldErrors: Record<string, string> = {};
        
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          fieldErrors[path] = err.message;
        });
        
        logger.debug(
          { 
            error: validationError, 
            path: req.path,
          }, 
          `Validation error for ${req.path}`
        );
        
        // Create a validation error with our error factory
        next(createValidationError(
          validationError.message,
          fieldErrors,
          undefined,
          req
        ));
      } else {
        // Pass any other errors to the error handler
        next(error);
      }
    }
  };
};