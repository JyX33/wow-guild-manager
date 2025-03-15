import { Request, Response } from 'express';
import { asyncHandler, AppError } from '../utils/error-handler';
import characterModel from '../models/character.model';
import { Character } from '../../../shared/types/index';

export default {
  /**
   * Get all characters for the logged-in user
   */
  getUserCharacters: asyncHandler(async (req: Request, res: Response) => {
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
    const characterId = parseInt(req.params.id);
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
  getMainCharacter: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;
    const character = await characterModel.getMainCharacter(userId);
    
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
      characterData,
      !!is_main
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
    const characterId = parseInt(req.params.id);
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
    const characterId = parseInt(req.params.id);
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
   * Set a character as the main character
   */
  setMainCharacter: asyncHandler(async (req: Request, res: Response) => {
    const characterId = parseInt(req.params.id);
    const userId = req.user.id;
    
    const updatedCharacter = await characterModel.setMainCharacter(characterId, userId);
    
    res.json({
      success: true,
      data: updatedCharacter
    });
  })
};