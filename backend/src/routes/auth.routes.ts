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
router.get('/discord-link', async (req: Request, res: Response) => {
    logger.info('Received request for /api/auth/discord-link');
    const { token } = req.query;
    const userId = req.session.userId; // Assuming session middleware adds this

    if (!userId) {
        logger.warn('Discord link attempt without logged-in user session.');
        return res.status(401).json({ success: false, message: 'Unauthorized. Please log in first.' });
    }

    if (!token || typeof token !== 'string') {
        logger.warn('Discord link attempt with missing or invalid token.');
        return res.status(400).json({ success: false, message: 'Missing or invalid token.' });
    }

    const tokenDetails = retrieveTokenDetails(token);

    if (!tokenDetails) {
        logger.warn(`Discord link attempt with invalid/expired token: ${token}`);
        return res.status(400).json({ success: false, message: 'Invalid or expired link token.' });
    }

    try {
        logger.info(`Attempting to link Discord user ${tokenDetails.discordUsername} (${tokenDetails.discordId}) to user ID ${userId}`);
        await userModelInstance.update(userId, {
            discord_id: tokenDetails.discordId,
            discord_username: tokenDetails.discordUsername
        });
        logger.info(`Successfully linked Discord account for user ID ${userId}`);
        return res.status(200).json({ success: true, message: 'Discord account linked successfully.' });
    } catch (error) {
        logger.error({ err: error, userId, discordId: tokenDetails.discordId }, 'Failed to update user record with Discord ID');
        return res.status(500).json({ success: false, message: 'An internal error occurred while linking the account.' });
    }
});

export default router;