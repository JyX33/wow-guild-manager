import { Router } from "express";
import * as rosterController from "../../controllers/roster.controller.js";
import { authenticateJWT } from "../../middleware/auth.middleware.js";
import { isRosterGuildMaster } from "../../middleware/roster-auth.middleware.js";
import { asyncHandler } from "../../utils/error-handler.js";
import { validate, ValidateTarget } from "../../middleware/validation.middleware.js";
import { z } from "zod";
import {
  rosterIdParamSchema,
  characterIdParamSchema,
  updateRosterSchema,
  addRosterMemberSchema,
  updateRosterMemberSchema
} from "../../schemas/index.js";

const router = Router();

// GET /api/rosters/:rosterId - Get specific roster details
router.get(
  "/:rosterId",
  authenticateJWT,
  validate(rosterIdParamSchema, ValidateTarget.PARAMS),
  asyncHandler(rosterController.getRosterDetails)
);

// PUT /api/rosters/:rosterId - Update roster details
router.put(
  "/:rosterId",
  authenticateJWT,
  validate(rosterIdParamSchema, ValidateTarget.PARAMS),
  validate(updateRosterSchema, ValidateTarget.BODY),
  asyncHandler(isRosterGuildMaster),
  asyncHandler(rosterController.updateRosterDetails)
);

// DELETE /api/rosters/:rosterId - Delete a roster
router.delete(
  "/:rosterId",
  authenticateJWT,
  validate(rosterIdParamSchema, ValidateTarget.PARAMS),
  asyncHandler(isRosterGuildMaster),
  asyncHandler(rosterController.deleteRoster)
);

// --- Routes for roster members ---

// POST /api/rosters/:rosterId/members - Add members to a roster
router.post(
  "/:rosterId/members",
  authenticateJWT,
  validate(rosterIdParamSchema, ValidateTarget.PARAMS),
  validate(addRosterMemberSchema, ValidateTarget.BODY),
  asyncHandler(isRosterGuildMaster),
  asyncHandler(rosterController.addRosterMembers)
);

// Combined param schema for roster and character ID
const rosterMemberParamSchema = z.object({
  rosterId: rosterIdParamSchema.shape.rosterId,
  characterId: characterIdParamSchema.shape.characterId
});

// PUT /api/rosters/:rosterId/members/:characterId - Update a specific member
router.put(
  "/:rosterId/members/:characterId",
  authenticateJWT,
  validate(rosterMemberParamSchema, ValidateTarget.PARAMS),
  validate(updateRosterMemberSchema, ValidateTarget.BODY),
  asyncHandler(isRosterGuildMaster),
  asyncHandler(rosterController.updateRosterMember)
);

// DELETE /api/rosters/:rosterId/members/:characterId - Remove a specific member
router.delete(
  "/:rosterId/members/:characterId",
  authenticateJWT,
  validate(rosterMemberParamSchema, ValidateTarget.PARAMS),
  asyncHandler(isRosterGuildMaster),
  asyncHandler(rosterController.removeRosterMember)
);

export default router;