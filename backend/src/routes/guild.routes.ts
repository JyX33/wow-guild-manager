import express from 'express';
import guildController from '../controllers/guild.controller';
import authMiddleware from '../middleware/auth.middleware';
import { isGuildMaster } from '../middleware/guild-master.middleware';
// Removed duplicate: import { asyncHandler } from '../utils/error-handler';

const router = express.Router();

// Get all guilds the user is in
router.get('/user', authMiddleware.authenticate, guildController.getUserGuilds);

// Get guild by ID
router.get('/id/:guildId', authMiddleware.authenticate, guildController.getGuildById);

// Get guild members (enhanced) - MORE SPECIFIC ROUTE FIRST

// GET /api/guilds/:guildId/classified-roster - Get guild members with main/alt classification
router.get('/:guildId/classified-roster', authMiddleware.authenticate, guildController.getClassifiedGuildRoster);
router.get('/:guildId/members/enhanced', authMiddleware.authenticate, guildController.getEnhancedGuildMembers);

// Get guild members (basic)
router.get('/:guildId/members', authMiddleware.authenticate, guildController.getGuildMembers);

// Guild rank management
router.get('/:guildId/ranks', authMiddleware.authenticate, guildController.getGuildRanks);

// Enhanced guild rank structure with member counts
router.get('/:guildId/rank-structure', authMiddleware.authenticate, guildController.getGuildRankStructure);

// Get guild by region, realm and name - GENERIC ROUTE LAST
router.get('/:region/:realm/:name', authMiddleware.authenticate, guildController.getGuildByName);

import { asyncHandler } from '../utils/error-handler'; // Make sure asyncHandler is imported

// Update rank name (protected - only guild master)
router.put('/:guildId/ranks/:rankId',
  authMiddleware.authenticate,
  asyncHandler(isGuildMaster), // Wrap the async middleware
  guildController.updateRankName
);

export default router;