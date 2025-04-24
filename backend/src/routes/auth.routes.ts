import express from 'express';
import authController from '../controllers/auth.controller.js';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware.js'; // Import named exports
import { UserRole } from '../../../shared/types/user.js';

import { retrieveTokenDetails } from '../modules/discord/discordTokenStore.js';
import userModelInstance from '../models/user.model.js';
import { Request, Response } from 'express';
import logger from '../utils/logger.js';

const router = express.Router();

// Initiate Battle.net OAuth flow
router.get('/login', authController.login);

// Handle Battle.net OAuth callback
router.get('/callback', authController.callback);

// Refresh access token using refresh token
router.post('/refresh', authController.refreshToken); // Change to POST and use the controller function directly
 
// Logout user
router.get('/logout', authController.logout); // Logout is primarily client-side with stateless JWTs
 
// Get current authenticated user
router.get('/me', authenticateJWT, authController.getCurrentUser); // Use the new middleware
 
// Update user role (admin only)
router.put('/role',
  authenticateJWT, // Use the new middleware
  requireRole(UserRole.ADMIN), // Use the named import
  authController.updateUserRole
);
 
// Discord account linking verification endpoint
router.get('/discord-link', authenticateJWT, authController.verifyDiscordLink); // Use controller function

export default router;