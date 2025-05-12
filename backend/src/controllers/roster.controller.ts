import { Request, Response } from "express";
import * as RosterService from "../services/roster.service.js";

// Import specific types for better type references
import type { RosterMemberAddition } from "../../../shared/types/api/roster.js";
import { ErrorCode } from "../../../shared/types/utils/errors.js";
import logger from "../utils/logger.js";
import { asyncHandler } from "../utils/error-handler.js";
import { 
  createValidationError, 
  createNotFoundError, 
  createAppError
} from "../utils/error-factory.js";

// === Guild-Specific Roster Controllers ===

/**
 * GET /api/guilds/:guildId/rosters
 * Get all rosters for a specific guild.
 */
export const getGuildRosters = asyncHandler(async (req: Request, res: Response) => {
  const guildId = parseInt(req.params.guildId, 10);
  if (isNaN(guildId)) {
    throw createValidationError(
      "Invalid Guild ID.", 
      { guildId: "Must be a valid integer" },
      guildId,
      req
    );
  }

  const rosters = await RosterService.getGuildRosters(guildId);
  res.status(200).json({ success: true, data: rosters });
});

/**
 * POST /api/guilds/:guildId/rosters
 * Create a new roster for the guild. Requires Guild Master auth.
 * Body: { name: string }
 */
export const createGuildRoster = asyncHandler(async (req: Request, res: Response) => {
  const guildId = parseInt(req.params.guildId, 10);
  const { name } = req.body;

  if (isNaN(guildId)) {
    throw createValidationError(
      "Invalid Guild ID.", 
      { guildId: "Must be a valid integer" },
      guildId,
      req
    );
  }
  
  if (typeof name !== "string" || name.trim().length === 0) {
    throw createValidationError(
      "Roster name is required.",
      { name: "Must be a non-empty string" },
      name,
      req
    );
  }

  // Authorization (isGuildMaster) is handled by middleware in the route definition
  const newRoster = await RosterService.createGuildRoster(
    guildId,
    name.trim(),
  );
  
  res.status(201).json({ success: true, data: newRoster });
});

// === General Roster Controllers ===

/**
 * GET /api/rosters/:rosterId
 * Get specific roster details, including its members.
 */
export const getRosterDetails = asyncHandler(async (req: Request, res: Response) => {
  const rosterId = parseInt(req.params.rosterId, 10);
  if (isNaN(rosterId)) {
    throw createValidationError(
      "Invalid Roster ID.",
      { rosterId: "Must be a valid integer" },
      rosterId,
      req
    );
  }

  const roster = await RosterService.getRosterById(rosterId);
  if (!roster) {
    throw createNotFoundError("Roster", rosterId, req);
  }

  // TODO: Add authorization check - does user have access to this roster's guild?
  // This might require fetching the guildId from the roster and checking user membership/role.
  // For now, assuming authentication implies access if roster exists.

  const members = await RosterService.getRosterMembers(rosterId);
  res.status(200).json({ success: true, data: { ...roster, members } });
});

/**
 * PUT /api/rosters/:rosterId
 * Update roster details. Requires Guild Master auth for the roster's guild.
 * Body: { name: string }
 */
export const updateRosterDetails = asyncHandler(async (req: Request, res: Response) => {
  const rosterId = parseInt(req.params.rosterId, 10);
  const { name } = req.body;

  if (isNaN(rosterId)) {
    throw createValidationError(
      "Invalid Roster ID.",
      { rosterId: "Must be a valid integer" },
      rosterId,
      req
    );
  }
  
  if (typeof name !== "string" || name.trim().length === 0) {
    throw createValidationError(
      "Roster name is required.",
      { name: "Must be a non-empty string" },
      name,
      req
    );
  }

  // Authorization (isGuildMaster for the roster's guild) should be handled by middleware.
  // The middleware will need to fetch the roster, get its guildId, and then check master status.
  const updatedRoster = await RosterService.updateRoster(
    rosterId,
    name.trim(),
  );
  
  if (!updatedRoster) {
    throw createNotFoundError("Roster", rosterId, req);
  }
  
  res.status(200).json({ success: true, data: updatedRoster });
});

/**
 * DELETE /api/rosters/:rosterId
 * Delete a roster. Requires Guild Master auth for the roster's guild.
 */
export const deleteRoster = asyncHandler(async (req: Request, res: Response) => {
  const rosterId = parseInt(req.params.rosterId, 10);
  if (isNaN(rosterId)) {
    throw createValidationError(
      "Invalid Roster ID.",
      { rosterId: "Must be a valid integer" },
      rosterId,
      req
    );
  }

  // Authorization (isGuildMaster for the roster's guild) handled by middleware.
  const success = await RosterService.deleteRoster(rosterId);
  if (!success) {
    // This might happen if the roster was already deleted between auth check and service call
    throw createNotFoundError("Roster", rosterId, req);
  }
  
  res.status(204).send(); // No content on successful deletion
});

// === Roster Member Controllers ===

/**
 * POST /api/rosters/:rosterId/members
 * Add members to a roster. Requires Guild Master auth for the roster's guild.
 * Body: { additions: RosterMemberAddition[] }
 */
export const addRosterMembers = asyncHandler(async (req: Request, res: Response) => {
  const rosterId = parseInt(req.params.rosterId, 10);
  const { additions } = req.body;

  if (isNaN(rosterId)) {
    throw createValidationError(
      "Invalid Roster ID.",
      { rosterId: "Must be a valid integer" },
      rosterId,
      req
    );
  }
  
  if (!Array.isArray(additions) || additions.length === 0) {
    throw createValidationError(
      "Invalid or empty additions array.",
      { additions: "Must be a non-empty array" },
      additions,
      req
    );
  }
  
  // Basic validation of additions structure
  for (const item of additions) {
    if (
      !item || typeof item !== "object" ||
      !["character", "rank"].includes(item.type)
    ) {
      throw createValidationError(
        "Invalid item type in additions array.",
        { type: "Must be 'character' or 'rank'" },
        item,
        req
      );
    }
    
    if (item.type === "character" && typeof item.characterId !== "number") {
      throw createValidationError(
        "Invalid characterId in additions array.",
        { characterId: "Must be a number for character type" },
        item,
        req
      );
    }
    
    if (item.type === "rank" && typeof item.rankId !== "number") {
      throw createValidationError(
        "Invalid rankId in additions array.",
        { rankId: "Must be a number for rank type" },
        item,
        req
      );
    }
    
    if (
      item.role !== undefined && item.role !== null &&
      typeof item.role !== "string"
    ) {
      throw createValidationError(
        "Invalid role type in additions array.",
        { role: "Must be a string or null" },
        item.role,
        req
      );
    }
  }

  // Authorization (isGuildMaster for the roster's guild) handled by middleware.
  // Need the guildId for the service function. Middleware should fetch roster and attach guildId to req.
  const guildId = (req as any).guildId; // Assuming middleware attaches guildId
  if (!guildId) {
    logger.error(
      "Guild ID missing from request after authorization middleware in addRosterMembers",
    );
    throw createAppError(
      "Internal configuration error.",
      ErrorCode.INTERNAL_ERROR,
      { middleware: "Missing expected guildId property" },
      req
    );
  }

  const updatedMembers = await RosterService.addRosterMembers(
    rosterId,
    additions as RosterMemberAddition[],
    guildId,
  );
  
  res.status(200).json({ success: true, data: updatedMembers });
});

/**
 * PUT /api/rosters/:rosterId/members/:characterId
 * Update a specific member's assigned role. Requires Guild Master auth.
 * Body: { role: string | null }
 */
export const updateRosterMember = asyncHandler(async (req: Request, res: Response) => {
  const rosterId = parseInt(req.params.rosterId, 10);
  const characterId = parseInt(req.params.characterId, 10);
  const { role } = req.body; // Role can be string or null

  if (isNaN(rosterId) || isNaN(characterId)) {
    throw createValidationError(
      "Invalid Roster or Character ID.",
      { 
        rosterId: isNaN(rosterId) ? "Must be a valid integer" : undefined,
        characterId: isNaN(characterId) ? "Must be a valid integer" : undefined
      },
      { rosterId, characterId },
      req
    );
  }
  
  if (role !== undefined && role !== null && typeof role !== "string") {
    throw createValidationError(
      "Invalid role type.",
      { role: "Must be a string or null" },
      role,
      req
    );
  }

  // Authorization (isGuildMaster for the roster's guild) handled by middleware.
  const updatedMember = await RosterService.updateRosterMemberRole(
    rosterId,
    characterId,
    role === undefined ? null : role, // Pass null if undefined
  );
  
  if (!updatedMember) {
    throw createNotFoundError("Roster member", `${rosterId}-${characterId}`, req);
  }
  
  res.status(200).json({ success: true, data: updatedMember });
});

/**
 * DELETE /api/rosters/:rosterId/members/:characterId
 * Remove a specific member from the roster. Requires Guild Master auth.
 */
export const removeRosterMember = asyncHandler(async (req: Request, res: Response) => {
  // Add detailed logging
  logger.info({
    method: req.method,
    path: req.path,
    params: req.params,
    query: req.query,
    userId: req.session?.userId,
  }, "Handling removeRosterMember request");
  
  const rosterId = parseInt(req.params.rosterId, 10);
  const characterId = parseInt(req.params.characterId, 10);

  if (isNaN(rosterId) || isNaN(characterId)) {
    throw createValidationError(
      "Invalid Roster or Character ID.",
      { 
        rosterId: isNaN(rosterId) ? "Must be a valid integer" : undefined,
        characterId: isNaN(characterId) ? "Must be a valid integer" : undefined
      },
      { rosterId, characterId },
      req
    );
  }

  // Authorization (isGuildMaster for the roster's guild) handled by middleware.
  const success = await RosterService.removeRosterMember(
    rosterId,
    characterId,
  );
  
  if (!success) {
    throw createNotFoundError("Roster member", `${rosterId}-${characterId}`, req);
  }
  
  res.status(204).send(); // No content on successful deletion
});