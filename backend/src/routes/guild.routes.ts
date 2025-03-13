import express from 'express';
import guildController from '../controllers/guild.controller';
import authMiddleware from '../middleware/auth.middleware';

const router = express.Router();

// Get guild by region, realm and name
router.get('/:region/:realm/:name', authMiddleware.authenticate, guildController.getGuildByName);

// Get guild members
router.get('/:guildId/members', authMiddleware.authenticate, guildController.getGuildMembers);

export default router;