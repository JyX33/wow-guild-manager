import { Request, Response } from 'express';
import { asyncHandler, AppError } from '../utils/error-handler.js';
import * as characterModel from '../models/character.model.js';
import * as userModel from '../models/user.model.js';
import * as guildModel from '../models/guild.model.js';
// Removed battleNetService import
import { BattleNetApiClient } from '../services/battlenet-api.client.js'; // Added ApiClient import
import { Character } from '../../../shared/types/index.js';
import logger from '../utils/logger.js'; // Import the logger

// Instantiate the API client (or inject if using a framework/DI container)
const apiClient = new BattleNetApiClient();

export default {
  /**
   * Get all characters for the logged-in user
   */
  getUserCharacters: asyncHandler(async (req: Request, res: Response) => {
    logger.info({ method: req.method, path: req.path, params: req.params, query: req.query, userId: req.session?.userId }, 'Handling getUserCharacters request');
    if (!req.user) throw new AppError('Authentication required', 401);
    const userId = req.user.id;
    const characters = await characterModel.findByUserId(userId);

    res.json({
      success: true,
      data: characters
    });
  }),

  /**
   * Get a specific character by ID (with permission check)
   */
  getCharacterById: asyncHandler(async (req: Request, res: Response) => {
    logger.info({ method: req.method, path: req.path, params: req.params, query: req.query, userId: req.session?.userId }, 'Handling getCharacterById request');
    const characterId = parseInt(req.params.id);
    if (!req.user) throw new AppError('Authentication required', 401);
    const userId = req.user.id;

    const character = await characterModel.findOne({
      id: characterId,
      user_id: userId
    });

    if (!character) {
      throw new AppError('Character not found or does not belong to you', 404);
    }

    res.json({
      success: true,
      data: character
    });
  }),

  /**
   * Get the main character for the logged-in user
   */
  // @ts-ignore // TODO: Investigate TS7030 with asyncHandler
  getMainCharacter: asyncHandler(async (req: Request, res: Response) => {
    logger.info({ method: req.method, path: req.path, params: req.params, query: req.query, userId: req.session?.userId }, 'Handling getMainCharacter request');
    if (!req.user) throw new AppError('Authentication required', 401);
    const userId = req.user.id;
    const character = await characterModel.findById(userId);

    if (!character) {
      return res.json({
        success: true,
        data: null
      });
    }

    res.json({
      success: true,
      data: character
    });
  }),

  /**
   * Create a new character for the logged-in user
   */
  createCharacter: asyncHandler(async (req: Request, res: Response) => {
    logger.info({ method: req.method, path: req.path, body: req.body, userId: req.session?.userId }, 'Handling createCharacter request');
    if (!req.user) throw new AppError('Authentication required', 401);
    const userId = req.user.id;
    const { name, realm, class: characterClass, level, role, is_main } = req.body;

    // Validate required fields
    if (!name || !realm || !characterClass || !level || !role) {
      throw new AppError('Missing required character information', 400);
    }

    // Set the user_id for the new character
    const characterData: Partial<Character> = {
      user_id: userId,
      name,
      realm,
      class: characterClass,
      level: Number(level),
      role,
      character_data: req.body.character_data || {}
    };

    // Create the character, optionally setting it as main
    const newCharacter = await characterModel.createCharacter(
      characterData
    );

    res.status(201).json({
      success: true,
      data: newCharacter
    });
  }),

  /**
   * Update an existing character
   */
  updateCharacter: asyncHandler(async (req: Request, res: Response) => {
    logger.info({ method: req.method, path: req.path, params: req.params, body: req.body, userId: req.session?.userId }, 'Handling updateCharacter request');
    const characterId = parseInt(req.params.id);
    if (!req.user) throw new AppError('Authentication required', 401);
    const userId = req.user.id;
    const { name, realm, class: characterClass, level, role, character_data } = req.body;

    // Build update data object with only provided fields
    const updateData: Partial<Character> = {};

    if (name) updateData.name = name;
    if (realm) updateData.realm = realm;
    if (characterClass) updateData.class = characterClass;
    if (level) updateData.level = Number(level);
    if (role) updateData.role = role;
    if (character_data) updateData.character_data = character_data;

    // Update the character
    const updatedCharacter = await characterModel.updateCharacter(
      characterId,
      userId,
      updateData
    );

    if (!updatedCharacter) {
      throw new AppError('Character not found or does not belong to you', 404);
    }

    res.json({
      success: true,
      data: updatedCharacter
    });
  }),

  /**
   * Delete a character
   */
  deleteCharacter: asyncHandler(async (req: Request, res: Response) => {
    logger.info({ method: req.method, path: req.path, params: req.params, userId: req.session?.userId }, 'Handling deleteCharacter request');
    const characterId = parseInt(req.params.id);
    if (!req.user) throw new AppError('Authentication required', 401);
    const userId = req.user.id;

    const deleted = await characterModel.deleteUserCharacter(characterId, userId);

    if (!deleted) {
      throw new AppError('Character not found or does not belong to you', 404);
    }

    res.json({
      success: true,
      message: 'Character deleted successfully'
    });
  }),


  /**
   * Sync characters from Battle.net
   */
  syncCharacters: asyncHandler(async (req: Request, res: Response) => {
    logger.info({ method: req.method, path: req.path, userId: req.session?.userId }, 'Handling syncCharacters request');
    if (!req.user) throw new AppError('Authentication required', 401);
    const userId = req.user.id;

    // Get user with tokens
    const user = await userModel.getUserWithTokens(userId);

    if (!user || !user.access_token) {
      throw new AppError('User authentication token not found', 401);
    }

    // Get region from session or use default
    const region = req.session.region || 'eu';

    // Get account profile from Battle.net using the ApiClient
    const wowProfile = await apiClient.getWowProfile(
      region,
      user.access_token
    );

    // Sync characters first
    const syncResult = await characterModel.syncCharactersFromBattleNet(
      userId,
      wowProfile.wow_accounts || []
    );

    // Now update guild associations for each character
    let guildAssociationsUpdated = 0;

    for (const account of wowProfile.wow_accounts || []) {
      for (const character of account.characters || []) {
        try {
          if (character.guild) {
            // Check if guild exists in our database
            let guildId = null;

            const guild = await guildModel.findByNameRealmRegion(
              character.guild.name,
              character.guild.realm.slug,
              region
            );

            if (guild) {
              guildId = guild.id;

              // Find the character in our database
              const dbCharacter = await characterModel.findByNameRealm(
                character.name,
                character.realm.slug
              );

              if (dbCharacter && (!dbCharacter.guild_id || dbCharacter.guild_id !== guildId)) {
                // Update the character with guild association
                await characterModel.update(dbCharacter.id, {
                  updated_at: new Date().toISOString()
                });

                guildAssociationsUpdated++;
              }
            }
            // If guild doesn't exist, we don't create it here
            // It will be created when the user explicitly accesses it
          }
        } catch (error) {
          logger.error({ err: error, charName: character.name, userId }, `Error updating guild association for ${character.name}:`);
        }
      }
    }

    // Set a main character if none exists
    if (syncResult.added > 0) {
      const mainChar = await characterModel.getMainCharacter(userId);
      if (!mainChar) {
        // Get the highest level character to set as main
        const highestLevelChar = await characterModel.getHighestLevelCharacter(userId);
        if (highestLevelChar) {
          await characterModel.setMainCharacter(highestLevelChar.id, userId);
        }
      }
    }

    // Update last synced timestamp
    await userModel.updateCharacterSyncTimestamp(userId);

    res.json({
      success: true,
      data: {
        ...syncResult,
        guild_associations_updated: guildAssociationsUpdated
      }
    });
  })
};
