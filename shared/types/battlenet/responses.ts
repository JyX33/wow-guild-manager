/**
 * Utility types for working with Battle.net API responses
 */

import { BattleNetCharacter } from './character';
import { BattleNetCharacterEquipment } from './character';
import { BattleNetMythicKeystoneProfile } from './character';
import { BattleNetProfessions } from './character';

/**
 * Combined type for data fetched by getEnhancedCharacterData
 */
export interface EnhancedCharacterData extends BattleNetCharacter {
  equipment?: BattleNetCharacterEquipment;
  mythicKeystone?: BattleNetMythicKeystoneProfile | null; // Allow null if profile doesn't exist
  professions?: BattleNetProfessions; // Include full professions data
}