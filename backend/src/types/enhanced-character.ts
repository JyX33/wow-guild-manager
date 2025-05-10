// backend/src/types/enhanced-character.ts
import { BattleNetCharacter } from "../../../shared/types/user.js";
import {
  BattleNetCharacterEquipment as ApiBattleNetCharacterEquipment,
  BattleNetMythicKeystoneProfile as ApiBattleNetMythicKeystoneProfile,
  BattleNetProfessions as ApiBattleNetProfessions
} from "./battlenet-api.types.js";
import { EnhancedCharacterData as SharedEnhancedCharacterData } from "../../../shared/types/guild.js";

/**
 * Internal EnhancedCharacterData that extends BattleNetCharacter with additional data
 * This matches the structure returned by the Battle.net API client's getEnhancedCharacterData method
 *
 * This will be converted to the shared EnhancedCharacterData type when needed
 */
export interface EnhancedCharacterData extends BattleNetCharacter {
  // Include _links property
  _links: {
    self: {
      href: string;
    };
  };
  // Required properties from BattleNetCharacter
  id: number;
  name: string;
  gender: {
    type: string;
    name: string;
  };
  faction: {
    type: string;
    name: string;
  };
  race: {
    key: { href: string };
    name: string;
    id: number;
  };
  character_class: {
    key: { href: string };
    name: string;
    id: number;
  };
  active_spec: {
    key: { href: string };
    name: string;
    id: number;
  };
  realm: {
    key: { href: string };
    name: string;
    id: number;
    slug: string;
  };
  last_login_timestamp: number;

  // Equipment data from Battle.net API
  equipment: ApiBattleNetCharacterEquipment;

  // Item level from character data
  itemLevel: number;

  // Mythic Keystone profile (optional)
  mythicKeystone: ApiBattleNetMythicKeystoneProfile | null;

  // Professions data
  professions: ApiBattleNetProfessions;

  // Additional properties needed by consumers
  experience: number;
  achievement_points: number;
  equipped_item_level: number;
  average_item_level: number;
  achievements: {
    total_points: number;
    achievements: any[];
  };
  titles: {
    active_title: any | null;
    titles: any[];
  };
  pvp_summary: {
    honor_level: number;
    pvp_map_statistics: any[];
  };
  encounters: {
    dungeons: any[];
    raids: any[];
  };
  media: {
    avatar_url: string;
    inset_url: string;
    main_url: string;
  };
  last_login_timestamp_ms: number;
  specializations: Array<{
    talent_loadouts: any[];
    glyphs: any[];
    pvp_talent_slots: any[];
  }>;

  // Optional guild property
  guild?: {
    key: { href: string };
    name: string;
    id: number;
    realm: {
      key: { href: string };
      name: string;
      id: number;
      slug: string;
    };
    faction: {
      type: string;
      name: string;
    };
  };
}

/**
 * Converts our internal EnhancedCharacterData to the shared EnhancedCharacterData format
 * This function adapts our internal type to match the shared type expected by other parts of the app
 */
export function toSharedEnhancedCharacterData(data: EnhancedCharacterData): SharedEnhancedCharacterData {
  // Create a stub of the shared type with properties from our internal type
  const shared: Partial<SharedEnhancedCharacterData> = {
    // Base character properties that match in both types
    id: data.id,
    name: data.name,
    gender: data.gender,
    faction: data.faction,
    race: data.race,
    character_class: data.character_class,
    active_spec: data.active_spec,
    realm: data.realm,
    level: data.level,
    achievement_points: data.achievement_points,
    equipped_item_level: data.equipped_item_level,
    average_item_level: data.average_item_level,
    last_login_timestamp: data.last_login_timestamp,
    guild: data.guild,

    // Add required properties from SharedEnhancedCharacterData
    // with null values for optional properties
    mythicKeystone: null,
    professions: undefined,

    // Add required link properties
    _links: data._links,
    statistics: { href: '' },
    mythic_keystone_profile: { href: '' },
    achievements: { href: '' },
    titles: { href: '' },
    pvp_summary: { href: '' },
    encounters: { href: '' },
    media: { href: '' },
    specializations: { href: '' }
  };

  return shared as SharedEnhancedCharacterData;
}