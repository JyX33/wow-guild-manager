import { Request, Response } from 'express';
import * as RosterService from '../services/roster.service.js';
import { RosterMemberAddition } from '../../../shared/types/api.js';
import { ApiError, ErrorCode } from '../../../shared/types/api.js'; // Import error types
import logger from '../utils/logger.js'; // Import logger

// Helper to send error responses
const sendError = (res: Response, status: number, message: string, code: ErrorCode, details?: any) => {
  logger.warn(`Roster API Error: ${message}`, { status, code, details }); // Log the warning
  const error: ApiError = { status, message, code, details };
  res.status(status).json({ success: false, error });
};

// === Guild-Specific Roster Controllers ===

/**
 * GET /api/guilds/:guildId/rosters
 * Get all rosters for a specific guild.
 */
export const getGuildRosters = async (req: Request, res: Response) => {
  const guildId = parseInt(req.params.guildId, 10);
  if (isNaN(guildId)) {
    return sendError(res, 400, 'Invalid Guild ID.', ErrorCode.VALIDATION_ERROR);
  }

  try {
    const rosters = await RosterService.getGuildRosters(guildId);
    res.status(200).json({ success: true, data: rosters });
  } catch (error: any) {
    logger.error({ err: error, guildId }, 'Error fetching guild rosters');
    sendError(res, 500, 'Failed to fetch guild rosters.', ErrorCode.INTERNAL_ERROR, error.message);
  }
};

/**
 * POST /api/guilds/:guildId/rosters
 * Create a new roster for the guild. Requires Guild Master auth.
 * Body: { name: string }
 */
export const createGuildRoster = async (req: Request, res: Response) => {
  const guildId = parseInt(req.params.guildId, 10);
  const { name } = req.body;

  if (isNaN(guildId)) {
    return sendError(res, 400, 'Invalid Guild ID.', ErrorCode.VALIDATION_ERROR);
  }
  if (typeof name !== 'string' || name.trim().length === 0) {
    return sendError(res, 400, 'Roster name is required.', ErrorCode.VALIDATION_ERROR);
  }

  try {
    // Authorization (isGuildMaster) is handled by middleware in the route definition
    const newRoster = await RosterService.createGuildRoster(guildId, name.trim());
    res.status(201).json({ success: true, data: newRoster });
  } catch (error: any) {
    logger.error({ err: error, guildId, name }, 'Error creating guild roster');
    sendError(res, 500, 'Failed to create roster.', ErrorCode.INTERNAL_ERROR, error.message);
  }
};


// === General Roster Controllers ===

/**
 * GET /api/rosters/:rosterId
 * Get specific roster details, including its members.
 */
export const getRosterDetails = async (req: Request, res: Response) => {
  const rosterId = parseInt(req.params.rosterId, 10);
  if (isNaN(rosterId)) {
    return sendError(res, 400, 'Invalid Roster ID.', ErrorCode.VALIDATION_ERROR);
  }

  try {
    const roster = await RosterService.getRosterById(rosterId);
    if (!roster) {
      return sendError(res, 404, 'Roster not found.', ErrorCode.NOT_FOUND);
    }

    // TODO: Add authorization check - does user have access to this roster's guild?
    // This might require fetching the guildId from the roster and checking user membership/role.
    // For now, assuming authentication implies access if roster exists.

    const members = await RosterService.getRosterMembers(rosterId);
    res.status(200).json({ success: true, data: { ...roster, members } });
  } catch (error: any) {
    logger.error({ err: error, rosterId }, 'Error fetching roster details');
    sendError(res, 500, 'Failed to fetch roster details.', ErrorCode.INTERNAL_ERROR, error.message);
  }
};

/**
 * PUT /api/rosters/:rosterId
 * Update roster details. Requires Guild Master auth for the roster's guild.
 * Body: { name: string }
 */
export const updateRosterDetails = async (req: Request, res: Response) => {
  const rosterId = parseInt(req.params.rosterId, 10);
  const { name } = req.body;

  if (isNaN(rosterId)) {
    return sendError(res, 400, 'Invalid Roster ID.', ErrorCode.VALIDATION_ERROR);
  }
  if (typeof name !== 'string' || name.trim().length === 0) {
    return sendError(res, 400, 'Roster name is required.', ErrorCode.VALIDATION_ERROR);
  }

  try {
    // Authorization (isGuildMaster for the roster's guild) should be handled by middleware.
    // The middleware will need to fetch the roster, get its guildId, and then check master status.
    const updatedRoster = await RosterService.updateRoster(rosterId, name.trim());
    if (!updatedRoster) {
      return sendError(res, 404, 'Roster not found or update failed.', ErrorCode.NOT_FOUND);
    }
    res.status(200).json({ success: true, data: updatedRoster });
  } catch (error: any) {
    logger.error({ err: error, rosterId, name }, 'Error updating roster');
    sendError(res, 500, 'Failed to update roster.', ErrorCode.INTERNAL_ERROR, error.message);
  }
};

/**
 * DELETE /api/rosters/:rosterId
 * Delete a roster. Requires Guild Master auth for the roster's guild.
 */
export const deleteRoster = async (req: Request, res: Response) => {
  const rosterId = parseInt(req.params.rosterId, 10);
  if (isNaN(rosterId)) {
    return sendError(res, 400, 'Invalid Roster ID.', ErrorCode.VALIDATION_ERROR);
  }

  try {
    // Authorization (isGuildMaster for the roster's guild) handled by middleware.
    const success = await RosterService.deleteRoster(rosterId);
    if (!success) {
      // This might happen if the roster was already deleted between auth check and service call
      return sendError(res, 404, 'Roster not found or deletion failed.', ErrorCode.NOT_FOUND);
    }
    res.status(204).send(); // No content on successful deletion
  } catch (error: any) {
    logger.error({ err: error, rosterId }, 'Error deleting roster');
    sendError(res, 500, 'Failed to delete roster.', ErrorCode.INTERNAL_ERROR, error.message);
  }
};


// === Roster Member Controllers ===

/**
 * POST /api/rosters/:rosterId/members
 * Add members to a roster. Requires Guild Master auth for the roster's guild.
 * Body: { additions: RosterMemberAddition[] }
 */
export const addRosterMembers = async (req: Request, res: Response) => {
  // --- Logging Start ---
  console.log(`[RosterController.addRosterMembers] Received request for roster ID: ${req.params.rosterId}`);
  // --- Logging End ---
  const rosterId = parseInt(req.params.rosterId, 10);
  const { additions } = req.body;

  if (isNaN(rosterId)) {
    return sendError(res, 400, 'Invalid Roster ID.', ErrorCode.VALIDATION_ERROR);
  }
  if (!Array.isArray(additions) || additions.length === 0) {
    return sendError(res, 400, 'Invalid or empty additions array.', ErrorCode.VALIDATION_ERROR);
  }
  // Basic validation of additions structure (more robust validation could be added)
  for (const item of additions) {
      if (!item || typeof item !== 'object' || !['character', 'rank'].includes(item.type)) {
          return sendError(res, 400, 'Invalid item type in additions array.', ErrorCode.VALIDATION_ERROR);
      }
      if (item.type === 'character' && typeof item.characterId !== 'number') {
          return sendError(res, 400, 'Invalid characterId in additions array.', ErrorCode.VALIDATION_ERROR);
      }
      if (item.type === 'rank' && typeof item.rankId !== 'number') {
          return sendError(res, 400, 'Invalid rankId in additions array.', ErrorCode.VALIDATION_ERROR);
      }
      if (item.role !== undefined && item.role !== null && typeof item.role !== 'string') {
          return sendError(res, 400, 'Invalid role type in additions array (must be string or null).', ErrorCode.VALIDATION_ERROR);
      }
  }


  try {
    // Authorization (isGuildMaster for the roster's guild) handled by middleware.
    // Need the guildId for the service function. Middleware should fetch roster and attach guildId to req.
    const guildId = (req as any).guildId; // Assuming middleware attaches guildId
    if (!guildId) {
        logger.error('Guild ID missing from request after authorization middleware in addRosterMembers');
        return sendError(res, 500, 'Internal configuration error.', ErrorCode.INTERNAL_ERROR);
    }

    // --- Logging Start ---
    console.log(`[RosterController.addRosterMembers] Calling RosterService.addRosterMembers for roster ${rosterId}, guild ${guildId}`);
    // --- Logging End ---
    const updatedMembers = await RosterService.addRosterMembers(rosterId, additions as RosterMemberAddition[], guildId);
    res.status(200).json({ success: true, data: updatedMembers });
  } catch (error: any) {
    logger.error({ err: error, rosterId, additions }, 'Error adding roster members');
    sendError(res, 500, 'Failed to add roster members.', ErrorCode.INTERNAL_ERROR, error.message);
  }
};

/**
 * PUT /api/rosters/:rosterId/members/:characterId
 * Update a specific member's assigned role. Requires Guild Master auth.
 * Body: { role: string | null }
 */
export const updateRosterMember = async (req: Request, res: Response) => {
  const rosterId = parseInt(req.params.rosterId, 10);
  const characterId = parseInt(req.params.characterId, 10);
  const { role } = req.body; // Role can be string or null

  if (isNaN(rosterId) || isNaN(characterId)) {
    return sendError(res, 400, 'Invalid Roster or Character ID.', ErrorCode.VALIDATION_ERROR);
  }
   if (role !== undefined && role !== null && typeof role !== 'string') {
      return sendError(res, 400, 'Invalid role type (must be string or null).', ErrorCode.VALIDATION_ERROR);
  }

  try {
    // Authorization (isGuildMaster for the roster's guild) handled by middleware.
    const updatedMember = await RosterService.updateRosterMemberRole(rosterId, characterId, role === undefined ? null : role); // Pass null if undefined
    if (!updatedMember) {
      return sendError(res, 404, 'Roster member not found or update failed.', ErrorCode.NOT_FOUND);
    }
    res.status(200).json({ success: true, data: updatedMember });
  } catch (error: any) {
    logger.error({ err: error, rosterId, characterId, role }, 'Error updating roster member');
    sendError(res, 500, 'Failed to update roster member.', ErrorCode.INTERNAL_ERROR, error.message);
  }
};

/**
 * DELETE /api/rosters/:rosterId/members/:characterId
 * Remove a specific member from the roster. Requires Guild Master auth.
 */
export const removeRosterMember = async (req: Request, res: Response) => {
  const rosterId = parseInt(req.params.rosterId, 10);
  const characterId = parseInt(req.params.characterId, 10);

  if (isNaN(rosterId) || isNaN(characterId)) {
    return sendError(res, 400, 'Invalid Roster or Character ID.', ErrorCode.VALIDATION_ERROR);
  }

  try {
    // Authorization (isGuildMaster for the roster's guild) handled by middleware.
    const success = await RosterService.removeRosterMember(rosterId, characterId);
    if (!success) {
      return sendError(res, 404, 'Roster member not found or deletion failed.', ErrorCode.NOT_FOUND);
    }
    res.status(204).send(); // No content on successful deletion
  } catch (error: any) {
    logger.error({ err: error, rosterId, characterId }, 'Error removing roster member');
    sendError(res, 500, 'Failed to remove roster member.', ErrorCode.INTERNAL_ERROR, error.message);
  }
};
