// backend/src/types/battlenet-api-reference.ts
/**
 * Battle.net API Reference Types
 * 
 * This file contains type definitions that exactly match the Battle.net API response structures
 * as documented. These types serve as the source of truth for API validation.
 * 
 * NOTE: These types are based on the official Battle.net API documentation and should
 * only be updated when the API documentation changes.
 */

// Common Types

/**
 * Localized string with translations for all supported languages
 */
export interface LocalizedString {
  en_US: string;
  es_MX: string;
  pt_BR: string;
  de_DE: string;
  en_GB: string;
  es_ES: string;
  fr_FR: string;
  it_IT: string;
  ru_RU: string;
  ko_KR: string;
  zh_TW: string;
  zh_CN: string;
}

/**
 * Common link reference structure
 */
export interface LinkReference {
  href: string;
}

/**
 * Standard RGBA color value
 */
export interface RGBAColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

/**
 * Common self-link structure found in all Battle.net API responses
 */
export interface SelfLink {
  _links: {
    self: LinkReference;
  };
}

/**
 * Common key-name-id structure for referenced entities
 */
export interface KeyNameId {
  key: LinkReference;
  name: LocalizedString;
  id: number;
}

/**
 * Common realm reference
 */
export interface RealmReference {
  key: LinkReference;
  name: LocalizedString;
  id: number;
  slug: string;
}

/**
 * Common faction reference
 */
export interface FactionReference {
  type: string;
  name: LocalizedString;
}

/**
 * Common gender reference
 */
export interface GenderReference {
  type: string;
  name: LocalizedString;
}

/**
 * Common race reference
 */
export interface RaceReference {
  key: LinkReference;
  name: LocalizedString;
  id: number;
}

/**
 * Common class reference
 */
export interface ClassReference {
  key: LinkReference;
  name: LocalizedString;
  id: number;
}

/**
 * Common spec reference
 */
export interface SpecReference {
  key: LinkReference;
  name: LocalizedString;
  id: number;
}

// Guild API Types

/**
 * Guild Crest components
 */
export interface GuildCrest {
  emblem: {
    id: number;
    media: {
      key: LinkReference;
      id: number;
    };
    color: {
      id: number;
      rgba: RGBAColor;
    };
  };
  border: {
    id: number;
    media: {
      key: LinkReference;
      id: number;
    };
    color: {
      id: number;
      rgba: RGBAColor;
    };
  };
  background: {
    color: {
      id: number;
      rgba: RGBAColor;
    };
  };
}

/**
 * Guild API response structure
 * 
 * Based on the /data/wow/guild/{realm}/{nameSlug} endpoint
 */
export interface BattleNetGuildRef extends SelfLink {
  id: number;
  name: string;
  faction: FactionReference;
  achievement_points: number;
  member_count: number;
  realm: RealmReference;
  crest: GuildCrest;
  roster: LinkReference;
  achievements: LinkReference;
  created_timestamp: number;
  activity: LinkReference;
  name_search: string;
}

/**
 * Guild Roster API response structure
 * 
 * Based on the /data/wow/guild/{realm}/{nameSlug}/roster endpoint
 */
export interface BattleNetGuildRosterRef extends SelfLink {
  guild: {
    key: LinkReference;
    name: string;
    id: number;
    realm: RealmReference;
    faction: FactionReference;
  };
  members: Array<{
    character: {
      key: LinkReference;
      name: string;
      id: number;
      realm: {
        key: LinkReference;
        id: number;
        slug: string;
      };
      level: number;
      playable_class: ClassReference;
      playable_race: RaceReference;
      faction: FactionReference;
    };
    rank: number;
  }>;
}

// Character API Types

/**
 * Character Profile Summary API response structure
 * 
 * Based on the /profile/wow/character/{realm}/{characterName} endpoint
 */
export interface BattleNetCharacterRef extends SelfLink {
  id: number;
  name: string;
  gender: GenderReference;
  faction: FactionReference;
  race: RaceReference;
  character_class: ClassReference;
  active_spec: SpecReference;
  realm: RealmReference;
  guild?: {
    key: LinkReference;
    name: string;
    id: number;
    realm: RealmReference;
    faction: FactionReference;
  };
  level: number;
  experience: number;
  achievement_points: number;
  achievements: LinkReference;
  titles: LinkReference;
  pvp_summary: LinkReference;
  encounters: LinkReference;
  media: LinkReference;
  last_login_timestamp: number;
  average_item_level: number;
  equipped_item_level: number;
  specializations: LinkReference;
  statistics: LinkReference;
  mythic_keystone_profile: LinkReference;
  equipment: LinkReference;
  appearance: LinkReference;
  collections: LinkReference;
  active_title?: {
    key: LinkReference;
    name: LocalizedString;
    id: number;
    display_string: LocalizedString;
  };
  reputations: LinkReference;
  quests: LinkReference;
  achievements_statistics: LinkReference;
  professions: LinkReference;
  covenant_progress?: {
    chosen_covenant: {
      key: LinkReference;
      name: LocalizedString;
      id: number;
    };
    renown_level: number;
    soulbinds: LinkReference;
  };
  name_search: string;
}

/**
 * Character Equipment API response structure
 * 
 * Based on the /profile/wow/character/{realm}/{characterName}/equipment endpoint
 */
export interface BattleNetCharacterEquipmentRef extends SelfLink {
  character: {
    key: LinkReference;
    name: string;
    id: number;
    realm: RealmReference;
  };
  equipped_items: Array<{
    item: {
      key: LinkReference;
      id: number;
    };
    slot: {
      type: string;
      name: LocalizedString;
    };
    quantity: number;
    context?: number;
    bonus_list?: number[];
    quality: {
      type: string;
      name: LocalizedString;
    };
    name: LocalizedString;
    modified_appearance_id?: number;
    media: {
      key: LinkReference;
      id: number;
    };
    item_class: {
      key: LinkReference;
      name: LocalizedString;
      id: number;
    };
    item_subclass: {
      key: LinkReference;
      name: LocalizedString;
      id: number;
    };
    inventory_type: {
      type: string;
      name: LocalizedString;
    };
    binding?: {
      type: string;
      name: LocalizedString;
    };
    armor?: {
      value: number;
      display: {
        display_string: LocalizedString;
        color: RGBAColor;
      };
    };
    stats?: Array<{
      type: {
        type: string;
        name: LocalizedString;
      };
      value: number;
      display: {
        display_string: LocalizedString;
        color: RGBAColor;
      };
    }>;
    sell_price?: {
      value: number;
      display_strings: {
        header: LocalizedString;
        gold: LocalizedString;
        silver: LocalizedString;
        copper: LocalizedString;
      };
    };
    requirements?: {
      level?: {
        value: number;
        display_string: LocalizedString;
      };
      playable_classes?: {
        links: Array<ClassReference>;
        display_string: LocalizedString;
      };
    };
    level?: {
      value: number;
      display_string: LocalizedString;
    };
    transmog?: {
      item: {
        key: LinkReference;
        name: LocalizedString;
        id: number;
      };
      display_string: LocalizedString;
      item_modified_appearance_id: number;
    };
    durability?: {
      value: number;
      display_string: LocalizedString;
    };
    name_description?: {
      display_string: LocalizedString;
      color: RGBAColor;
    };
  }>;
  equipped_item_sets?: Array<{
    item_set: {
      key: LinkReference;
      name: LocalizedString;
      id: number;
    };
    items: Array<{
      item: {
        key: LinkReference;
        name: LocalizedString;
        id: number;
      };
      is_equipped: boolean;
    }>;
    effects: Array<{
      display_string: LocalizedString;
      required_count: number;
      is_active: boolean;
    }>;
    display_string: LocalizedString;
  }>;
}

/**
 * Character Mythic Keystone Profile API response structure
 * 
 * Based on the /profile/wow/character/{realm}/{characterName}/mythic-keystone-profile endpoint
 */
export interface BattleNetMythicKeystoneProfileRef extends SelfLink {
  current_period: {
    period: {
      key: LinkReference;
      id: number;
    };
    best_runs: Array<{
      completed_timestamp: number;
      duration: number;
      keystone_level: number;
      keystone_affixes: Array<{
        key: LinkReference;
        name: LocalizedString;
        id: number;
      }>;
      members: Array<{
        character: {
          name: string;
          id: number;
          realm: {
            key: LinkReference;
            id: number;
            slug: string;
          };
        };
        specialization: {
          key: LinkReference;
          name: LocalizedString;
          id: number;
        };
        race: {
          key: LinkReference;
          name: LocalizedString;
          id: number;
        };
        equipped_item_level: number;
      }>;
      dungeon: {
        key: LinkReference;
        name: LocalizedString;
        id: number;
      };
      is_completed_within_time: boolean;
      mythic_rating: {
        color: RGBAColor;
        rating: number;
      };
      map_rating: {
        color: RGBAColor;
        rating: number;
      };
    }>;
  };
  seasons: Array<{
    key: LinkReference;
    id: number;
  }>;
  character: {
    key: LinkReference;
    name: string;
    id: number;
    realm: RealmReference;
  };
  current_mythic_rating: {
    color: RGBAColor;
    rating: number;
  };
}

/**
 * Character Professions API response structure
 * 
 * Based on the /profile/wow/character/{realm}/{characterName}/professions endpoint
 */
export interface BattleNetProfessionsRef extends SelfLink {
  character: {
    key: LinkReference;
    name: string;
    id: number;
    realm: RealmReference;
  };
  primaries: Array<{
    profession: {
      key: LinkReference;
      name: string;
      id: number;
    };
    tiers: Array<{
      skill_points: number;
      max_skill_points: number;
      tier: {
        name: string;
        id: number;
      };
      known_recipes?: Array<{
        key: LinkReference;
        name: string;
        id: number;
      }>;
    }>;
  }>;
  secondaries: Array<{
    profession: {
      key: LinkReference;
      name: string;
      id: number;
    };
    skill_points: number;
    max_skill_points: number;
  }>;
}

/**
 * Character Collections Index API response structure
 * 
 * Based on the /profile/wow/character/{realm}/{characterName}/collections endpoint
 */
export interface BattleNetCollectionsIndexRef extends SelfLink {
  pets: LinkReference;
  mounts: LinkReference;
  heirlooms: LinkReference;
  toys: LinkReference;
  character: {
    key: LinkReference;
    name: string;
    id: number;
    realm: RealmReference;
  };
  transmogs: LinkReference;
}