// backend/src/types/battlenet-api-compat.ts
import {
  BattleNetGuild as ApiGuild,
  BattleNetGuildRoster as ApiRoster,
  BattleNetGuildMember as ApiMember,
  BattleNetCharacter as ApiCharacter,
  BattleNetCharacterEquipment as ApiEquipment,
  BattleNetMythicKeystoneProfile as ApiMythicProfile,
  BattleNetProfessions as ApiProfessions
} from './battlenet-api.types.js';

import {
  BattleNetGuild as SharedGuild,
  BattleNetGuildRoster as SharedRoster,
  BattleNetGuildMember as SharedMember
} from '../../../shared/types/guild.js';

import { EnhancedCharacterData } from './enhanced-character.js';

/**
 * Adapts the API Guild type to the Shared Guild type
 */
export function adaptGuild(apiGuild: ApiGuild): SharedGuild {
  // Create a compatible object
  // Create object with properties from SharedGuild type
  const adaptedGuild: SharedGuild = {
    // Copy direct properties
    _links: apiGuild._links,
    id: apiGuild.id,
    name: apiGuild.name,
    faction: apiGuild.faction,
    realm: {
      id: apiGuild.realm.id,
      name: apiGuild.realm.name,
      slug: apiGuild.realm.slug,
      key: { href: "" } // Required by shared type
    },
    
    // Add any missing properties with default values
    crest: {
      emblem: {
        id: 0,
        media: { key: { href: "" }, id: 0 },
        color: { id: 0, rgba: { r: 0, g: 0, b: 0, a: 0 } }
      },
      border: {
        id: 0,
        media: { key: { href: "" }, id: 0 },
        color: { id: 0, rgba: { r: 0, g: 0, b: 0, a: 0 } }
      },
      background: {
        color: { id: 0, rgba: { r: 0, g: 0, b: 0, a: 0 } }
      }
    },
    roster: apiGuild.roster_url ? { href: apiGuild.roster_url } : { href: "" },
    achievements: { href: "" },
    activity: { href: "" },
    
    // Copy other properties that might exist on the API type
    achievement_points: apiGuild.achievement_points,
    member_count: apiGuild.member_count,
    created_timestamp: apiGuild.created_timestamp
  };
  
  return adaptedGuild;
}

/**
 * Adapts the API Roster type to the Shared Roster type
 */
export function adaptRoster(apiRoster: ApiRoster): SharedRoster {
  // Create a compatible object
  const adaptedRoster: SharedRoster = {
    _links: apiRoster._links,
    guild: {
      // Add required key property
      key: { href: "" }, 
      
      // Copy other properties
      id: apiRoster.guild.id,
      name: apiRoster.guild.name,
      realm: {
        id: apiRoster.guild.realm.id,
        slug: apiRoster.guild.realm.slug,
        name: apiRoster.guild.realm.name,
        key: { href: "" } // Required by shared type
      },
      faction: apiRoster.guild.faction
    },
    
    // Adapt each member
    members: apiRoster.members.map(adaptMember)
  };
  
  return adaptedRoster;
}

/**
 * Adapts the API Member type to the Shared Member type
 */
export function adaptMember(apiMember: ApiMember): SharedMember {
  // Create a compatible object
  const adaptedMember: SharedMember = {
    character: {
      id: apiMember.character.id,
      name: apiMember.character.name,
      level: apiMember.character.level,
      playable_class: {
        key: { href: "" }, // Required by shared type
        id: apiMember.character.playable_class.id,
        name: apiMember.character.playable_class.name
      },
      playable_race: {
        key: { href: "" }, // Required by shared type
        id: apiMember.character.playable_race.id,
        name: apiMember.character.playable_race.name
      },
      realm: {
        key: { href: "" }, // Required by shared type
        id: apiMember.character.realm.id,
        slug: apiMember.character.realm.slug,
        name: apiMember.character.realm.name
      },
      faction: { type: "ALLIANCE", name: "Alliance" } // Default value, should be overridden if available
    },
    rank: apiMember.rank
  };
  
  return adaptedMember;
}

/**
 * Adapts the API Character + Equipment + MythicProfile + Professions to EnhancedCharacterData
 */
export function adaptEnhancedCharacter(
  apiCharacter: ApiCharacter, 
  apiEquipment: ApiEquipment,
  apiMythicProfile: ApiMythicProfile | null,
  apiProfessions: ApiProfessions
): EnhancedCharacterData {
  // Create the base adapted character with all required properties
  const adaptedCharacter: EnhancedCharacterData = {
    // Required properties from base character type
    _links: apiCharacter._links,
    id: apiCharacter.id,
    name: apiCharacter.name,
    gender: apiCharacter.gender,
    level: apiCharacter.level,
    equipped_item_level: apiCharacter.equipped_item_level,
    achievement_points: apiCharacter.achievement_points,
    faction: apiCharacter.faction,
    race: {
      ...apiCharacter.race,
      key: { href: "" }, // Add missing key property
    },
    character_class: {
      ...apiCharacter.character_class,
      key: { href: "" }, // Add missing key property
    },
    active_spec: {
      ...apiCharacter.active_spec,
      key: { href: "" }, // Add missing key property
    },
    realm: {
      ...apiCharacter.realm,
      key: { href: "" }, // Add missing key property
    },
    last_login_timestamp: apiCharacter.last_login_timestamp,

    // Copy guild if it exists and add missing key property
    guild: apiCharacter.guild ? {
      ...apiCharacter.guild,
      key: { href: "" },
      realm: {
        ...apiCharacter.guild.realm,
        key: { href: "" }
      }
    } : undefined,

    // The equipment data
    equipment: apiEquipment,

    // Item level from equipped_item_level
    itemLevel: apiCharacter.equipped_item_level || 0,

    // mythicKeystone data
    mythicKeystone: apiMythicProfile,

    // Professions data
    professions: apiProfessions,

    // Required fields from EnhancedCharacterData with default values
    experience: 0,
    achievements: {
      total_points: apiCharacter.achievement_points,
      achievements: []
    },
    titles: {
      active_title: null,
      titles: []
    },
    pvp_summary: {
      honor_level: 0,
      pvp_map_statistics: []
    },
    encounters: {
      dungeons: [],
      raids: []
    },
    media: {
      avatar_url: "",
      inset_url: "",
      main_url: ""
    },
    last_login_timestamp_ms: apiCharacter.last_login_timestamp || 0,
    average_item_level: apiCharacter.equipped_item_level || 0,
    specializations: [{
      talent_loadouts: [],
      glyphs: [],
      pvp_talent_slots: []
    }]
  };
  
  return adaptedCharacter;
}