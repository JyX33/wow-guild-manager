import { NextFunction, Request, Response } from 'express';

export class AppError extends Error {
  status: number;
  details?: any;
  code?: string;
  requestContext?: {
    method: string;
    path: string;
    params: any;
    query: any;
  };

  constructor(
    message: string, 
    status: number = 500, 
    options?: {
      details?: any;
      code?: string;
      request?: Request;
    }
  ) {
    super(message);
    this.status = status;
    this.details = options?.details;
    this.code = options?.code;
    this.name = this.constructor.name;

    if (options?.request) {
      this.requestContext = {
        method: options.request.method,
        path: options.request.path,
        params: options.request.params,
        query: options.request.query
      };
    }

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandlerMiddleware = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const status = 'status' in err ? err.status : 500;
  const message = err.message || 'Something went wrong';
  const details = 'details' in err ? err.details : undefined;
  const code = 'code' in err ? err.code : 'INTERNAL_ERROR';
  
  // Enhanced error logging
  if (status !== 401) {
    console.error({
      timestamp: new Date().toISOString(),
      error: {
        name: err.name,
        message,
        code,
        status,
        stack: err.stack,
        details,
        request: 'requestContext' in err ? err.requestContext : {
          method: req.method,
          path: req.path,
          params: req.params,
          query: req.query
        }
      }
    });
  }
  
  res.status(status).json({
    success: false,
    error: {
      message,
      code,
      details,
      status
    }
  });
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      if (!(err instanceof AppError)) {
        err = new AppError(err.message, 500, {
          request: req,
          details: err.details || err.stack
        });
      }
      next(err);
    });
  };
};

export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new AppError(`Resource not found - ${req.originalUrl}`, 404, {
    request: req,
    code: 'RESOURCE_NOT_FOUND'
  });
  next(error);
};

// Common error codes
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  API_ERROR: 'API_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED'
};