/**
 * Character application model types
 */

import { CharacterRole } from '../enums/guild';
import { BattleNetCharacter, BattleNetCharacterEquipment } from '../battlenet/character';

/**
 * Character model for application use
 */
export interface Character {
  id: number;
  name: string;
  realm: string;
  class: string;
  level: number;
  role: CharacterRole;
  is_main: boolean;
  user_id: number;
  guild_id?: number | null; // Allow null
  guild_rank?: number;
  character_data?: BattleNetCharacter; // Keep for now if needed elsewhere, or remove if fully replaced by JSONB fields
  equipment?: BattleNetCharacterEquipment;
  // Add fields from BattleNetCharacter that might be useful at the application level
  achievement_points?: number;
  equipped_item_level?: number;
  average_item_level?: number;
  last_login_timestamp?: number;
}