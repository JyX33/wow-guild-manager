import { Request, Response, NextFunction } from 'express';
import * as RosterService from '../services/roster.service.js';
import db from '../db/db.js'; // Import the database wrapper
import guildMemberModel from '../models/guild_member.model.js'; // Assuming this model can check guild master status
import { ApiError, ErrorCode } from '../../../shared/types/api.js';
import logger from '../utils/logger.js';

// Extend Express Request type to include user and potentially guildId
interface AuthenticatedRequest extends Request {
  user?: { id: number; /* other user props */ };
  guildId?: number; // To attach the guildId found from the roster
}

// Helper to send error responses
const sendAuthError = (res: Response, status: number, message: string, code: ErrorCode) => {
  logger.warn(`Roster Auth Error: ${message}`, { status, code });
  const error: ApiError = { status, message, code };
  res.status(status).json({ success: false, error });
};

/**
 * Middleware to check if the authenticated user is the guild master
 * for the guild associated with the rosterId in the request parameters.
 * Attaches `guildId` to the request object if successful.
 */
export const isRosterGuildMaster = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const rosterId = parseInt(req.params.rosterId, 10);
  const userId = req.user?.id;

  if (isNaN(rosterId)) {
    return sendAuthError(res, 400, 'Invalid Roster ID.', ErrorCode.VALIDATION_ERROR);
  }

  if (!userId) {
    // This should technically be caught by authenticateJWT first, but belt and suspenders
    return sendAuthError(res, 401, 'Authentication required.', ErrorCode.AUTHENTICATION_ERROR);
  }

  try {
    // 1. Fetch the roster to get its guildId
    const roster = await RosterService.getRosterById(rosterId);
    if (!roster) {
      return sendAuthError(res, 404, 'Roster not found.', ErrorCode.NOT_FOUND);
    }

    const guildId = roster.guildId;

    // 2. Check if the user has a character in this guild with rank_id 0 (Guild Master)
    // First, get the user's character IDs
    const userCharsResult = await db.query('SELECT id FROM characters WHERE user_id = $1', [userId]);
    if (userCharsResult.rowCount === 0) {
        return sendAuthError(res, 403, 'Forbidden: User has no characters.', ErrorCode.AUTHORIZATION_ERROR);
    }
    const userCharacterIds = userCharsResult.rows.map((r: any) => r.id);

    // Now check if any of those characters are in the target guild with rank 0
    const gmCheckResult = await db.query(
        `SELECT 1 FROM guild_members gm
         JOIN guild_ranks gr ON gm.rank_id = gr.id AND gm.guild_id = gr.guild_id
         WHERE gm.guild_id = $1
           AND gm.character_id = ANY($2::int[])
           AND gr.rank_id = 0 -- Assuming rank_id 0 is Guild Master
           AND gm.left_at IS NULL -- Ensure member is current
         LIMIT 1`,
        [guildId, userCharacterIds]
    );

    if ((gmCheckResult.rowCount ?? 0) === 0) {
      return sendAuthError(res, 403, 'Forbidden: Only the Guild Master can perform this action.', ErrorCode.AUTHORIZATION_ERROR);
    }

    // 3. Attach guildId to request for downstream use
    req.guildId = guildId;

    next(); // User is authorized
  } catch (error: any) {
    logger.error({ err: error, rosterId, userId }, 'Error checking roster guild master status');
    sendAuthError(res, 500, 'Internal server error during authorization check.', ErrorCode.INTERNAL_ERROR);
  }
};

// Optional: Middleware to check if user is simply a member of the roster's guild (for read access)
// export const isRosterGuildMember = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => { ... }