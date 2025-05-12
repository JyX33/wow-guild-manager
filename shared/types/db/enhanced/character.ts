/**
 * Enhanced database model for Character with typed JSON fields
 */

import { DbCharacter } from '../models/character';
import { 
  BattleNetCharacter, 
  BattleNetCharacterEquipment,
  BattleNetMythicKeystoneProfile,
  BattleNetProfessions
} from '../../battlenet/character';

/**
 * Enhanced Character model with typed JSON fields
 */
export interface DbCharacterEnhanced extends DbCharacter {
  profile_json?: BattleNetCharacter | null;
  equipment_json?: BattleNetCharacterEquipment | null;
  mythic_profile_json?: BattleNetMythicKeystoneProfile | null;
  professions_json?: BattleNetProfessions['primaries'] | null;
}