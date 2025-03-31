import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole, UserWithTokens } from '../../../shared/types/user';
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
  // @ts-ignore // TODO: Investigate TS7030 with asyncHandler
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
      // Verify token and expect 'tvs' claim
      const decoded = jwt.verify(token, config.auth.jwtSecret) as { id: number; tvs: string };
      
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

      // --- Token Revocation Check ---
      // Compare token's 'valid since' timestamp with the user's current 'valid since' timestamp
      if (!user.tokens_valid_since || !decoded.tvs || new Date(decoded.tvs) < new Date(user.tokens_valid_since)) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Token has been revoked - please log in again',
            status: 401,
            details: { revoked: true, requiresLogin: true }
          }
        });
      }
      // --- End Token Revocation Check ---
      
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
    // @ts-ignore // TODO: Investigate TS7030 with asyncHandler
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
  
  // @ts-ignore // TODO: Investigate TS7030 with asyncHandler
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
      // Verify refresh token and expect 'tvs' claim
      const decoded = jwt.verify(refreshToken, config.auth.jwtRefreshSecret) as { id: number; tvs: string };
      
      // Get user from database with tokens
      const user = await userModel.getUserWithTokens(decoded.id);
      
      if (!user) {
        // User not found based on token ID
        return res.status(401).json({
          success: false, error: { message: 'User not found - please log in again', status: 401, details: { requiresLogin: true } }
        });
      }

      // --- Rotation Check ---
      // Ensure the presented refresh token matches the one stored in the DB
      if (user.refresh_token !== refreshToken) {
        // This indicates the token was likely already used/rotated
        return res.status(401).json({
          success: false, error: { message: 'Invalid refresh token (potentially reused) - please log in again', status: 401, details: { requiresLogin: true } }
        });
      }
      // --- End Rotation Check ---

      // --- Token Revocation Check ---
      // Compare token's 'valid since' timestamp with the user's current 'valid since' timestamp
      if (!user.tokens_valid_since || !decoded.tvs || new Date(decoded.tvs) < new Date(user.tokens_valid_since)) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Token has been revoked - please log in again',
            status: 401,
            details: { revoked: true, requiresLogin: true }
          }
        });
      }
      // --- End Token Revocation Check ---
      
      // If all checks pass, attach user and proceed to the controller
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