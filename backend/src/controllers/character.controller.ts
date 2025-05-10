import { Request, Response } from "express";
import { AppError, asyncHandler } from "../utils/error-handler.js";
import * as characterModel from "../models/character.model.js";
import logger from "../utils/logger.js"; // Import the logger

export default {
  /**
   * Get all characters for the logged-in user
   */
  getUserCharacters: asyncHandler(async (req: Request, res: Response) => {
    logger.info({
      method: req.method,
      path: req.path,
      params: req.params,
      query: req.query,
      userId: req.session?.userId,
    }, "Handling getUserCharacters request");
    if (!req.user) throw new AppError("Authentication required", 401);
    const userId = req.user.id;
    const characters = await characterModel.findByUserId(userId);

    res.json({
      success: true,
      data: characters,
    });
  }),
};
