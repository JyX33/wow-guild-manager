import { Request, Response } from "express";
import { AppError, asyncHandler } from "../utils/error-handler.js";
import * as characterModel from "../models/character.model.js";
import logger from "../utils/logger.js"; // Import the logger
import { success, failure } from "../utils/response.js";
import { ensureExists, ensureOwnership } from "../utils/controller.helpers.js";

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
    const characters = await characterModel.findByUserId(userId as number);

    success(res, characters);
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

    ensureExists(character, "Character");

    // Check if character belongs to the logged-in user
    ensureOwnership(character, req.user?.id, "Character");

    success(res, character);
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

    ensureExists(character, "Character");

    success(res, character);
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

    ensureExists(character, "Character");

    success(res, character, 200);
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

    success(res, newCharacter, 201);
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

    ensureExists(character, "Character");

    // Check if character belongs to the logged-in user
    ensureOwnership(character, req.user?.id, "Character");

    const updatedCharacter = await characterModel.update(characterId, req.body);

    success(res, updatedCharacter);
  }),
};
