import express from 'express';
import authController from '../controllers/auth.controller';
import authMiddleware from '../middleware/auth.middleware';

const router = express.Router();

// Initiate Battle.net OAuth flow
router.get('/login', authController.login);

// Handle Battle.net OAuth callback
router.get('/callback', authController.callback);

// Logout user
router.get('/logout', authController.logout);

// Get current authenticated user
router.get('/me', authMiddleware.authenticate, authController.getCurrentUser);

export default router;