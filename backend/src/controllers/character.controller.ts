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

  /**
   * Get character by ID
   */
  getCharacterById: asyncHandler(async (req: Request, res: Response) => {
    logger.info({
      method: req.method,
      path: req.path,
      params: req.params,
      userId: req.session?.userId,
    }, "Handling getCharacterById request");

    if (!req.user) throw new AppError("Authentication required", 401);
    const characterId = parseInt(req.params.characterId);
    const character = await characterModel.findById(characterId);

    if (!character) {
      throw new AppError("Character not found", 404);
    }

    // Check if character belongs to the logged-in user
    if (character.user_id !== req.user.id) {
      throw new AppError("Unauthorized access to character", 403);
    }

    res.json({
      success: true,
      data: character,
    });
  }),

  /**
   * Get character by name, realm and region
   */
  getCharacterByNameRealmRegion: asyncHandler(async (req: Request, res: Response) => {
    logger.info({
      method: req.method,
      path: req.path,
      params: req.params,
      userId: req.session?.userId,
    }, "Handling getCharacterByNameRealmRegion request");

    if (!req.user) throw new AppError("Authentication required", 401);

    const { name, realm } = req.params; // region param not needed for findByNameRealm
    // Use findByNameRealm instead of the non-existent findByNameRealmRegion
    const character = await characterModel.findByNameRealm(name, realm);

    if (!character) {
      throw new AppError("Character not found", 404);
    }

    res.json({
      success: true,
      data: character,
    });
  }),

  /**
   * Sync character with Battle.net
   */
  syncCharacter: asyncHandler(async (req: Request, res: Response) => {
    logger.info({
      method: req.method,
      path: req.path,
      body: req.body,
      userId: req.session?.userId,
    }, "Handling syncCharacter request");

    if (!req.user) throw new AppError("Authentication required", 401);

    // This is a stub implementation - in a real implementation,
    // this would call the Battle.net sync service
    const { characterId } = req.body;

    // For now, just return the character
    const character = await characterModel.findById(characterId);

    if (!character) {
      throw new AppError("Character not found", 404);
    }

    res.json({
      success: true,
      data: character,
      message: "Character sync initiated",
    });
  }),

  /**
   * Create a new character
   */
  createCharacter: asyncHandler(async (req: Request, res: Response) => {
    logger.info({
      method: req.method,
      path: req.path,
      body: req.body,
      userId: req.session?.userId,
    }, "Handling createCharacter request");

    if (!req.user) throw new AppError("Authentication required", 401);

    const userId = req.user.id;
    const characterData = { ...req.body, user_id: userId };

    const newCharacter = await characterModel.create(characterData);

    res.status(201).json({
      success: true,
      data: newCharacter,
    });
  }),

  /**
   * Update an existing character
   */
  updateCharacter: asyncHandler(async (req: Request, res: Response) => {
    logger.info({
      method: req.method,
      path: req.path,
      params: req.params,
      body: req.body,
      userId: req.session?.userId,
    }, "Handling updateCharacter request");

    if (!req.user) throw new AppError("Authentication required", 401);

    const characterId = parseInt(req.params.characterId);
    const character = await characterModel.findById(characterId);

    if (!character) {
      throw new AppError("Character not found", 404);
    }

    // Check if character belongs to the logged-in user
    if (character.user_id !== req.user.id) {
      throw new AppError("Unauthorized access to character", 403);
    }

    const updatedCharacter = await characterModel.update(characterId, req.body);

    res.json({
      success: true,
      data: updatedCharacter,
    });
  }),
};
