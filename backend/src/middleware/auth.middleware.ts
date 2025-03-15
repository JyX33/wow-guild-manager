import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User, UserRole, UserWithTokens } from '../../../shared/types/index';
import config from '../config';
import userModel from '../models/user.model';
import { asyncHandler } from '../utils/error-handler';

// Extend Express Request type to include user property
declare global {
  namespace Express {
    interface Request {
      user?: UserWithTokens;
    }
  }
}

export default {
  authenticate: asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    // Get token from cookie or Authorization header
    const token = req.cookies.token || extractTokenFromHeader(req);
    
    if (!token) {
      // Instead of throwing an error, return a more specific message
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required - please log in',
          status: 401,
          details: { requiresLogin: true }
        }
      });
    }
    
    try {
      // Verify token
      const decoded = jwt.verify(token, config.auth.jwtSecret) as { id: number };
      
      // Get user from database - explicitly as UserWithTokens
      const user = await userModel.getUserWithTokens(decoded.id);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'User not found - please log in again',
            status: 401,
            details: { requiresLogin: true }
          }
        });
      }
      
      // Check if token is expired and needs refreshing
      if (user.token_expires_at && new Date(user.token_expires_at) < new Date()) {
        // This will be handled by the refreshToken middleware
        return res.status(401).json({
          success: false,
          error: {
            message: 'Session expired - please log in again',
            status: 401,
            details: { expired: true, requiresLogin: true }
          }
        });
      }
      
      req.user = user;
      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Session expired - please log in again',
            status: 401,
            details: { expired: true, requiresLogin: true }
          }
        });
      } else if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Invalid authentication - please log in again',
            status: 401,
            details: { requiresLogin: true }
          }
        });
      } else {
        throw error; // Pass other errors to the error handler
      }
    }
  }),
  
  requireRole: (roles: UserRole | UserRole[]) => {
    return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Authentication required - please log in',
            status: 401,
            details: { requiresLogin: true }
          }
        });
      }
      
      const allowedRoles = Array.isArray(roles) ? roles : [roles];
      
      if (!req.user.role || !allowedRoles.includes(req.user.role as UserRole)) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Insufficient permissions for this action',
            status: 403,
            details: { insufficientRole: true }
          }
        });
      }
      
      next();
    });
  },
  
  refreshToken: asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const refreshToken = req.cookies.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Refresh token required - please log in again',
          status: 401,
          details: { requiresLogin: true }
        }
      });
    }
    
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, config.auth.jwtRefreshSecret) as { id: number };
      
      // Get user from database with tokens
      const user = await userModel.getUserWithTokens(decoded.id);
      
      if (!user || user.refresh_token !== refreshToken) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Invalid refresh token - please log in again',
            status: 401,
            details: { requiresLogin: true }
          }
        });
      }
      
      // Generate new access token
      const token = jwt.sign(
        { id: user.id, battle_net_id: user.battle_net_id, role: user.role },
        config.auth.jwtSecret,
        { expiresIn: config.auth.jwtExpiresIn }
      );
      
      // Set new access token in cookie
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: config.auth.cookieMaxAge
      });
      
      req.user = user;
      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Refresh token expired - please log in again',
            status: 401,
            details: { requiresLogin: true }
          }
        });
      } else if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Invalid refresh token - please log in again',
            status: 401,
            details: { requiresLogin: true }
          }
        });
      } else {
        throw error; // Pass other errors to the error handler
      }
    }
  })
};

// Helper to extract token from Authorization header
function extractTokenFromHeader(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7); // Remove 'Bearer ' from header
  }
  return null;
}