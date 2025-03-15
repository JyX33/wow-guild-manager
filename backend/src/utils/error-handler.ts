import { NextFunction, Request, Response } from 'express';

export class AppError extends Error {
  status: number;
  details?: any;

  constructor(message: string, status: number = 500, details?: any) {
    super(message);
    this.status = status;
    this.details = details;
    this.name = this.constructor.name;
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
  
  // Only log errors that aren't 401 authentication errors since those are expected
  if (status !== 401) {
    console.error('Error:', err);
  }
  
  res.status(status).json({
    success: false,
    error: {
      message,
      details,
      status
    }
  });
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new AppError(`Resource not found - ${req.originalUrl}`, 404);
  next(error);
};