import express from 'express';
import guildController from '../controllers/guild.controller';
import authMiddleware from '../middleware/auth.middleware';
import { isGuildMaster } from '../middleware/guild-master.middleware';

const router = express.Router();

// Get all guilds the user is in
router.get('/user', authMiddleware.authenticate, guildController.getUserGuilds);

// Get guild by ID
router.get('/id/:guildId', authMiddleware.authenticate, guildController.getGuildById);

// Get guild members (enhanced) - MORE SPECIFIC ROUTE FIRST
router.get('/:guildId/members/enhanced', authMiddleware.authenticate, guildController.getEnhancedGuildMembers);

// Get guild members (basic)
router.get('/:guildId/members', authMiddleware.authenticate, guildController.getGuildMembers);

// Guild rank management
router.get('/:guildId/ranks', authMiddleware.authenticate, guildController.getGuildRanks);

// Enhanced guild rank structure with member counts
router.get('/:guildId/rank-structure', authMiddleware.authenticate, guildController.getGuildRankStructure);

// Sync guild characters with database (populate guild_id, etc.)
router.post('/:guildId/sync-roster', 
  authMiddleware.authenticate, 
  isGuildMaster, 
  guildController.syncGuildCharacters
);

// Get guild by region, realm and name - GENERIC ROUTE LAST
router.get('/:region/:realm/:name', authMiddleware.authenticate, guildController.getGuildByName);

// Update rank name (protected - only guild master)
router.put('/:guildId/ranks/:rankId',
  authMiddleware.authenticate,
  isGuildMaster,
  guildController.updateRankName
);

export default router;