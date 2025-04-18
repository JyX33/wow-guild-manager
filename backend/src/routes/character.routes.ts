import express from 'express';
import characterController from '../controllers/character.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';

const router = express.Router();

// All character routes require authentication
router.use(authMiddleware.authenticate);

// Get all characters for the current user
router.get('/', characterController.getUserCharacters);

// Get main character for the current user
router.get('/main', characterController.getMainCharacter);

// Get a specific character by ID
router.get('/:id', characterController.getCharacterById);

// Create a new character
router.post('/', characterController.createCharacter);

// Update an existing character
router.put('/:id', characterController.updateCharacter);

// Delete a character
router.delete('/:id', characterController.deleteCharacter);

// Set a character as the main character
router.post('/:id/main', characterController.setMainCharacter);

// Sync characters from Battle.net
router.post('/sync', authMiddleware.authenticate, characterController.syncCharacters);

export default router;