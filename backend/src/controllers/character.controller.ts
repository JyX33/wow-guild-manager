import { Request, Response } from "express";
import { asyncHandler } from "../utils/error-handler.js";
import * as characterModel from "../models/character.model.js";
import logger from "../utils/logger.js";
import { success } from "../utils/response.js";
import { 
  createValidationError, 
  createNotFoundError, 
  createUnauthorizedError,
  createForbiddenError 
} from "../utils/error-factory.js";

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
    
    if (!req.user) {
      throw createUnauthorizedError("Authentication required", req);
    }
    
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

    if (!req.user) {
      throw createUnauthorizedError("Authentication required", req);
    }
    
    const characterId = parseInt(req.params.characterId);
    if (isNaN(characterId)) {
      throw createValidationError(
        "Invalid character ID", 
        { characterId: "Must be a valid integer" },
        characterId,
        req
      );
    }
    
    const character = await characterModel.findById(characterId);
    if (!character) {
      throw createNotFoundError("Character", characterId, req);
    }

    // Check if character belongs to the logged-in user
    if (character.user_id !== req.user.id) {
      throw createForbiddenError(`Unauthorized access to character ${characterId}`, req);
    }

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

    if (!req.user) {
      throw createUnauthorizedError("Authentication required", req);
    }

    const { name, realm } = req.params; // region param not needed for findByNameRealm
    if (!name || !realm) {
      throw createValidationError(
        "Missing required parameters", 
        { 
          name: !name ? "Character name is required" : undefined,
          realm: !realm ? "Realm name is required" : undefined,
        },
        { name, realm },
        req
      );
    }
    
    // Use findByNameRealm instead of the non-existent findByNameRealmRegion
    const character = await characterModel.findByNameRealm(name, realm);
    if (!character) {
      throw createNotFoundError("Character", `${name}-${realm}`, req);
    }

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

    if (!req.user) {
      throw createUnauthorizedError("Authentication required", req);
    }

    // This is a stub implementation - in a real implementation,
    // this would call the Battle.net sync service
    const { characterId } = req.body;
    
    if (!characterId || isNaN(parseInt(characterId))) {
      throw createValidationError(
        "Invalid character ID", 
        { characterId: "Must provide a valid character ID" },
        characterId,
        req
      );
    }

    // For now, just return the character
    const character = await characterModel.findById(characterId);
    if (!character) {
      throw createNotFoundError("Character", characterId, req);
    }

    // Check if character belongs to the logged-in user
    if (character.user_id !== req.user.id) {
      throw createForbiddenError(`Unauthorized access to character ${characterId}`, req);
    }

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

    if (!req.user) {
      throw createUnauthorizedError("Authentication required", req);
    }

    // Validate required fields
    const { name, realm, class: characterClass } = req.body;
    const validationErrors: Record<string, string> = {};
    
    if (!name) validationErrors.name = "Character name is required";
    if (!realm) validationErrors.realm = "Realm is required";
    if (!characterClass) validationErrors.class = "Character class is required";
    
    if (Object.keys(validationErrors).length > 0) {
      throw createValidationError(
        "Missing required character fields", 
        validationErrors,
        req.body,
        req
      );
    }

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

    if (!req.user) {
      throw createUnauthorizedError("Authentication required", req);
    }

    const characterId = parseInt(req.params.characterId);
    if (isNaN(characterId)) {
      throw createValidationError(
        "Invalid character ID", 
        { characterId: "Must be a valid integer" },
        characterId,
        req
      );
    }
    
    const character = await characterModel.findById(characterId);
    if (!character) {
      throw createNotFoundError("Character", characterId, req);
    }

    // Check if character belongs to the logged-in user
    if (character.user_id !== req.user.id) {
      throw createForbiddenError(`Unauthorized access to character ${characterId}`, req);
    }

    const updatedCharacter = await characterModel.update(characterId, req.body);

    success(res, updatedCharacter);
  }),
};