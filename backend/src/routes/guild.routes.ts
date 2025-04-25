import express from 'express';
import guildController from '../controllers/guild.controller.js';
import * as rosterController from '../controllers/roster.controller.js'; // Use named import
import { authenticateJWT } from '../middleware/auth.middleware.js'; // Import the new middleware
import { isGuildMaster } from '../middleware/guild-master.middleware.js';
const router = express.Router();

// Get all guilds the user is in
router.get('/user', authenticateJWT, guildController.getUserGuilds);

// Get guild by ID
router.get('/id/:guildId', authenticateJWT, guildController.getGuildById);

// Get guild members (enhanced) - MORE SPECIFIC ROUTE FIRST

// GET /api/guilds/:guildId/classified-roster - Get guild members with main/alt classification
router.get('/:guildId/classified-roster', authenticateJWT, guildController.getClassifiedGuildRoster);
router.get('/:guildId/members/enhanced', authenticateJWT, guildController.getEnhancedGuildMembers);

// Get guild members (basic)
router.get('/:guildId/members', authenticateJWT, guildController.getGuildMembers);

router.get('/:guildId/member-activity', authenticateJWT, guildController.getGuildMemberActivity);
// Guild rank management
router.get('/:guildId/ranks', authenticateJWT, guildController.getGuildRanks);

// Enhanced guild rank structure with member counts
router.get('/:guildId/rank-structure', authenticateJWT, guildController.getGuildRankStructure);

// Get guild by region, realm and name - GENERIC ROUTE LAST
router.get('/:region/:realm/:name', authenticateJWT, guildController.getGuildByName);

import { asyncHandler } from '../utils/error-handler.js'; // Make sure asyncHandler is imported

// Update rank name (protected - only guild master)
router.put('/:guildId/ranks/:rankId',
  authenticateJWT,
  asyncHandler(isGuildMaster), // Wrap the async middleware
  guildController.updateRankName
);

// --- Roster Routes for a specific Guild ---

// Get all rosters for a guild
router.get('/:guildId/rosters',
  authenticateJWT,
  asyncHandler(rosterController.getGuildRosters) // Assuming rosterController has this method
);

// Create a new roster for a guild (protected - only guild master)
router.post('/:guildId/rosters',
  authenticateJWT,
  asyncHandler(isGuildMaster),
  asyncHandler(rosterController.createGuildRoster) // Assuming rosterController has this method
);


export default router;