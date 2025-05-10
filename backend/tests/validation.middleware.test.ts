import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate, ValidateTarget } from '../src/middleware/validation.middleware.js';
import { createValidationError } from '../src/utils/error-factory.js';

// Mock dependencies
jest.mock('../src/utils/error-factory.js', () => ({
  createValidationError: jest.fn(),
}));

jest.mock('../src/utils/logger.js', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

describe('Validation Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
    (createValidationError as jest.Mock).mockClear();
  });

  describe('validate function', () => {
    it('should call next() when validation passes', async () => {
      // Setup
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });
      
      mockRequest.body = {
        name: 'John',
        age: 30,
      };
      
      const middleware = validate(schema, ValidateTarget.BODY);
      
      // Execute
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Assert
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should call next() with validation error when body validation fails', async () => {
      // Setup
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });
      
      mockRequest.body = {
        name: 'John',
        age: 'thirty', // Invalid type, should be number
      };
      
      const validationError = new Error('Validation Error');
      (createValidationError as jest.Mock).mockReturnValue(validationError);
      
      const middleware = validate(schema, ValidateTarget.BODY);
      
      // Execute
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Assert
      expect(createValidationError).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(validationError);
    });

    it('should validate query parameters correctly', async () => {
      // Setup
      const schema = z.object({
        search: z.string().optional(),
        limit: z.coerce.number().int().positive(),
      });
      
      mockRequest.query = {
        search: 'test',
        limit: '20',
      };
      
      const middleware = validate(schema, ValidateTarget.QUERY);
      
      // Execute
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Assert
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should validate params correctly', async () => {
      // Setup
      const schema = z.object({
        id: z.coerce.number().int().positive(),
      });
      
      mockRequest.params = {
        id: '123',
      };
      
      const middleware = validate(schema, ValidateTarget.PARAMS);
      
      // Execute
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Assert
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should handle non-Zod errors', async () => {
      // Setup
      const schema = z.object({
        name: z.string(),
      });
      
      // Simulate some unexpected error
      const unexpectedError = new Error('Unexpected Error');
      mockRequest.body = {
        name: 'John',
      };
      
      const middleware = validate(schema, ValidateTarget.BODY);
      
      // Mock parseAsync to throw a generic error
      jest.spyOn(schema, 'parseAsync').mockImplementation(() => {
        throw unexpectedError;
      });
      
      // Execute
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Assert
      expect(mockNext).toHaveBeenCalledWith(unexpectedError);
    });
  });
});