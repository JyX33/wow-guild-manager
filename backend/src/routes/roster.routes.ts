import { Router } from 'express';
import * as rosterController from '../controllers/roster.controller.js';
import { authenticateJWT } from '../middleware/auth.middleware.js';
import { isRosterGuildMaster } from '../middleware/roster-auth.middleware.js'; // Import the new roster auth middleware
import { asyncHandler } from '../utils/error-handler.js'; // Import asyncHandler

const router = Router();

// --- Routes for specific rosters ---

// GET /api/rosters/:rosterId - Get specific roster details (including members)
// Requires authentication, further authorization might be needed (e.g., is member of the guild)
router.get('/:rosterId',
  authenticateJWT,
  // TODO: Add middleware to check if user is at least a member of the roster's guild?
  asyncHandler(rosterController.getRosterDetails)
);

// PUT /api/rosters/:rosterId - Update roster details
// Requires Guild Master auth for the roster's guild
router.put('/:rosterId',
  authenticateJWT,
  asyncHandler(isRosterGuildMaster), // Checks GM status based on rosterId
  asyncHandler(rosterController.updateRosterDetails)
);

// DELETE /api/rosters/:rosterId - Delete a roster
// Requires Guild Master auth for the roster's guild
router.delete('/:rosterId',
  authenticateJWT,
  asyncHandler(isRosterGuildMaster), // Checks GM status based on rosterId
  asyncHandler(rosterController.deleteRoster)
);


// --- Routes for roster members ---

// POST /api/rosters/:rosterId/members - Add members to a roster
// Requires Guild Master auth for the roster's guild
router.post('/:rosterId/members',
  authenticateJWT,
  asyncHandler(isRosterGuildMaster), // Checks GM status and attaches guildId to req
  asyncHandler(rosterController.addRosterMembers)
);

// PUT /api/rosters/:rosterId/members/:characterId - Update a specific member's role
// Requires Guild Master auth for the roster's guild
router.put('/:rosterId/members/:characterId',
  authenticateJWT,
  asyncHandler(isRosterGuildMaster), // Checks GM status based on rosterId
  asyncHandler(rosterController.updateRosterMember)
);

// DELETE /api/rosters/:rosterId/members/:characterId - Remove a specific member
// Requires Guild Master auth for the roster's guild
router.delete('/:rosterId/members/:characterId',
  authenticateJWT,
  asyncHandler(isRosterGuildMaster), // Checks GM status based on rosterId
  asyncHandler(rosterController.removeRosterMember)
);


export default router;