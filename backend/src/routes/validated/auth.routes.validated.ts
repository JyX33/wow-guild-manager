import express from "express";
import authController from "../../controllers/auth.controller.js";
import { authenticateJWT, requireRole } from "../../middleware/auth.middleware.js";
import { UserRole } from "../../../../shared/types/user.js";
import { validate, ValidateTarget } from "../../middleware/validation.middleware.js";
import {
  loginSchema,
  callbackSchema,
  refreshTokenSchema,
  updateRoleSchema,
  discordLinkSchema
} from "../../schemas/index.js";

const router = express.Router();

// Initiate Battle.net OAuth flow with region validation
router.get("/login", 
  validate(loginSchema, ValidateTarget.QUERY),
  authController.login
);

// Handle Battle.net OAuth callback with validation
router.get("/callback", 
  validate(callbackSchema, ValidateTarget.QUERY), 
  authController.callback
);

// Refresh access token using refresh token
router.post("/refresh", 
  validate(refreshTokenSchema, ValidateTarget.BODY),
  authController.refreshToken
);

// Logout user (no validation needed)
router.get("/logout", authController.logout);

// Get current authenticated user (no validation needed)
router.get("/me", authenticateJWT, authController.getCurrentUser);

// Update user role (admin only)
router.put(
  "/role",
  authenticateJWT,
  requireRole(UserRole.ADMIN),
  validate(updateRoleSchema, ValidateTarget.BODY),
  authController.updateUserRole
);

// Discord account linking verification endpoint
router.get("/discord-link", 
  authenticateJWT, 
  validate(discordLinkSchema, ValidateTarget.QUERY),
  authController.verifyDiscordLink
);

export default router;