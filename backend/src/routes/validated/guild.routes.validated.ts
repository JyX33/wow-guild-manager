import express from "express";
import guildController from "../../controllers/guild.controller.js";
import * as rosterController from "../../controllers/roster.controller.js";
import { authenticateJWT } from "../../middleware/auth.middleware.js";
import { isGuildMaster } from "../../middleware/guild-master.middleware.js";
import { asyncHandler } from "../../utils/error-handler.js";
import { validate, ValidateTarget } from "../../middleware/validation.middleware.js";
import {
  guildIdParamSchema,
  guildByNameParamsSchema,
  guildRankParamsSchema,
  updateRankNameSchema,
  createRosterSchema
} from "../../schemas/index.js";

const router = express.Router();

// Get all guilds the user is in
router.get("/user", authenticateJWT, guildController.getUserGuilds);

// Get guild by ID
router.get("/id/:guildId", 
  authenticateJWT,
  validate(guildIdParamSchema, ValidateTarget.PARAMS),
  guildController.getGuildById
);

// Get guild members with main/alt classification
router.get(
  "/:guildId/classified-roster",
  authenticateJWT,
  validate(guildIdParamSchema, ValidateTarget.PARAMS),
  guildController.getClassifiedGuildRoster
);

// Get guild members (enhanced)
router.get(
  "/:guildId/members/enhanced",
  authenticateJWT,
  validate(guildIdParamSchema, ValidateTarget.PARAMS),
  guildController.getEnhancedGuildMembers
);

// Get guild members (basic)
router.get(
  "/:guildId/members",
  authenticateJWT,
  validate(guildIdParamSchema, ValidateTarget.PARAMS),
  guildController.getGuildMembers
);

// Get member activity
router.get(
  "/:guildId/member-activity",
  authenticateJWT,
  validate(guildIdParamSchema, ValidateTarget.PARAMS),
  guildController.getGuildMemberActivity
);

// Guild rank management
router.get(
  "/:guildId/ranks", 
  authenticateJWT,
  validate(guildIdParamSchema, ValidateTarget.PARAMS),
  guildController.getGuildRanks
);

// Enhanced guild rank structure with member counts
router.get(
  "/:guildId/rank-structure",
  authenticateJWT,
  validate(guildIdParamSchema, ValidateTarget.PARAMS),
  guildController.getGuildRankStructure
);

// Get guild by region, realm and name
router.get(
  "/:region/:realm/:name",
  authenticateJWT,
  validate(guildByNameParamsSchema, ValidateTarget.PARAMS),
  guildController.getGuildByName
);

// Update rank name (protected - only guild master)
router.put(
  "/:guildId/ranks/:rankId",
  authenticateJWT,
  validate(guildRankParamsSchema, ValidateTarget.PARAMS),
  validate(updateRankNameSchema, ValidateTarget.BODY),
  asyncHandler(isGuildMaster),
  guildController.updateRankName
);

// --- Roster Routes for a specific Guild ---

// Get all rosters for a guild
router.get(
  "/:guildId/rosters",
  authenticateJWT,
  validate(guildIdParamSchema, ValidateTarget.PARAMS),
  asyncHandler(rosterController.getGuildRosters)
);

// Create a new roster for a guild (protected - only guild master)
router.post(
  "/:guildId/rosters",
  authenticateJWT,
  validate(guildIdParamSchema, ValidateTarget.PARAMS),
  validate(createRosterSchema, ValidateTarget.BODY),
  asyncHandler(isGuildMaster),
  asyncHandler(rosterController.createGuildRoster)
);

export default router;