import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../../config/default';

// Extend Express Request type to include user property
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export default {
  authenticate: async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get token from cookie
      const token = req.cookies.token;
      
      if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Verify token
      const decoded = jwt.verify(token, config.jwt.secret);
      req.user = decoded;
      
      next();
    } catch (error) {
      console.error('Authentication error:', error);
      res.status(401).json({ error: 'Invalid authentication' });
    }
  }
};