// backend/src/routes/admin.routes.ts
import { Router } from "express";
import { authenticateJWT } from "../middleware/auth.middleware.js";
import { getValidationStats, resetValidationStats } from "../utils/validation-monitor.js";
import { UserRole } from "../../../shared/types/user.js";
import { asyncHandler } from "../utils/error-handler.js";

const router = Router();

// Require admin authentication for all routes in this file
router.use(authenticateJWT);

// Admin-only route to check API validation statistics
router.get(
  "/validation-stats",
  asyncHandler(async (req, res) => {
    // Check if user is an admin
    if (req.user?.role !== UserRole.ADMIN) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions. Admin role required.",
      });
    }

    const stats = getValidationStats();
    return res.json({
      success: true,
      data: stats,
    });
  })
);

// Admin-only route to reset API validation statistics
router.post(
  "/validation-stats/reset",
  asyncHandler(async (req, res) => {
    // Check if user is an admin
    if (req.user?.role !== UserRole.ADMIN) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions. Admin role required.",
      });
    }

    resetValidationStats();
    return res.json({
      success: true,
      message: "Validation statistics have been reset.",
    });
  })
);

export default router;