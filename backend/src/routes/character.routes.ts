import express from 'express';
import characterController from '../controllers/character.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';

const router = express.Router();

// All character routes require authentication
router.use(authMiddleware.authenticate);

// Get all characters for the current user
router.get('/', characterController.getUserCharacters);

export default router;