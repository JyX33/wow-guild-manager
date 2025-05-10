import express from "express";
import characterController from "../controllers/character.controller.js";
import { authenticateJWT } from "../middleware/auth.middleware.js"; // Import the new middleware
const router = express.Router();

// All character routes require authentication
router.use(authenticateJWT); // Use the new middleware

// Get all characters for the current user
router.get("/", characterController.getUserCharacters);

export default router;
