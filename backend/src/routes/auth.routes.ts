import express from 'express';
import authController from '../controllers/auth.controller';
import authMiddleware from '../middleware/auth.middleware';
import { UserRole } from '../../../shared/types/user';

const router = express.Router();

// Initiate Battle.net OAuth flow
router.get('/login', authController.login);

// Handle Battle.net OAuth callback
router.get('/callback', authController.callback);

// Refresh access token using refresh token
router.get('/refresh', authMiddleware.refreshToken, authController.refreshToken);

// Logout user
router.get('/logout', authController.logout);

// Get current authenticated user
router.get('/me', authMiddleware.authenticate, authController.getCurrentUser);

// Update user role (admin only)
router.put('/role', 
  authMiddleware.authenticate, 
  authMiddleware.requireRole(UserRole.ADMIN), 
  authController.updateUserRole
);

export default router;