import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/error-handler.js';
import logger from '../utils/logger.js';

// Extend the Request interface to include the user property
declare module 'express' {
  interface Request {
    user?: any; // Or a more specific user type if available
  }
}

export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.JWT_SECRET!, (err, user) => {
      if (err) {
        logger.warn({ err }, 'JWT verification failed');
        return next(new AppError('Invalid or expired token', 403));
      }

      req.user = user;
      next();
    });
  } else {
    next(new AppError('Authentication token not provided', 401));
  }
};

export const requireRole = (requiredRole: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Assuming req.user is populated by authenticateJWT middleware
    if (!req.user || !req.user.role || req.user.role !== requiredRole) {
      return next(new AppError('Insufficient permissions', 403));
    }
    next();
  };
};