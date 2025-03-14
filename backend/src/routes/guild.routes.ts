import express from 'express';
import guildController from '../controllers/guild.controller';
import authMiddleware from '../middleware/auth.middleware';

const router = express.Router();

// Get guild by ID (needs to be a separate path to avoid conflict with the region/realm/name route)
router.get('/id/:guildId', authMiddleware.authenticate, guildController.getGuildById);

// Get guild by region, realm and name
router.get('/:region/:realm/:name', authMiddleware.authenticate, guildController.getGuildByName);

// Get guild members
router.get('/:guildId/members', authMiddleware.authenticate, guildController.getGuildMembers);

export default router;