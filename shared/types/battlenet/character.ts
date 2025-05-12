/**
 * Character-related Battle.net API types
 */

import { KeyReference, TypeName, RealmReference, PlayableClass, PlayableRace } from './common';

/**
 * Character details from Character Profile API
 */
export interface BattleNetCharacter {
  _links: {
    self: {
      href: string;
    };
  };
  id: number;
  name: string;
  gender: TypeName;
  faction: TypeName;
  race: PlayableRace;
  character_class: PlayableClass;
  active_spec: PlayableClass;
  realm: RealmReference;
  guild?: {
    key: KeyReference;
    name: string;
    id: number;
    realm: RealmReference;
    faction: TypeName;
  };
  level: number;
  experience: number;
  achievement_points: number;
  achievements: {
    href: string;
  };
  titles: {
    href: string
  }
  pvp_summary: {
    href: string;
  };
  encounters: {
    href: string;
  };
  media: {
    href: string;
  };
  last_login_timestamp: number;
  average_item_level: number;
  equipped_item_level: number;
  specializations: {
    href: string;
  };
  statistics: {
    href: string;
  };
  mythic_keystone_profile: {
    href: string;
  };
}

/**
 * Character equipment from Equipment API
 */
export interface BattleNetCharacterEquipment {
  _links: {
    self: {
      href: string;
    };
  };
  character: {
    key: KeyReference;
    name: string;
    id: number;
    realm: RealmReference;
  };
  equipped_items: BattleNetItem[];
}

/**
 * Character's mythic keystone profile
 */
export interface BattleNetMythicKeystoneProfile {
  _links: {
    self: {
      href: string;
    }
  };
  current_period: {
    period: {
      key: KeyReference;
      id: number;
    };
    best_runs: BattleNetMythicKeystoneRun[];
  };
  seasons?: Array<{
    key: KeyReference;
    id: number;
  }>;
  current_mythic_rating?: {
    color: {
      r: number;
      g: number;
      b: number;
      a: number;
    }
    rating: number;
  };
}

/**
 * Character's professions profile
 */
export interface BattleNetProfessions {
  _links: {
    self: {
      href: string;
    }
  };
  character: {
    key: KeyReference;
    name: string;
    id: number;
    realm: RealmReference;
  };
  primaries: Array<{
    profession: {
      key: KeyReference;
      name: string;
      id: number;
    };
    skill_points: number;
    max_skill_points: number;
    specializations: Array<{
      specialization_id: number;
      name: string;
      points_spent: number;
    }>;
    tiers: Array<{
      tier_id: number;
      known_recipes: Array<{
        key: KeyReference;
        name: string;
        id: number;
      }>;
    }>;
  }>;
  secondaries?: Array<{
    profession: {
      key: KeyReference;
      name: string;
      id: number;
    };
    skill_points: number;
    max_skill_points: number;
  }>;
}

/**
 * Mythic keystone run details
 */
export interface BattleNetMythicKeystoneRun {
  completed_timestamp: string;
  duration: number;
  keystone_level: number;
  dungeon: {
    key: KeyReference;
    name: string;
    id: number;
  };
  members: Array<{
    character: {
      name: string;
      id: number;
      realm: RealmReference;
    };
    specialization: {
      key: KeyReference;
      name: string;
      id: number;
    };
    race: PlayableRace;
    equipped_item_level: number;
  }>;
  is_completed_within_time?: boolean;
  mythic_rating?: {
    color: {
      r: number;
      g: number;
      b: number;
      a: number;
    }
    rating: number;
  }
  map_rating?: {
    color: {
      r: number;
      g: number;
      b: number;
      a: number;
    }
    rating: number;
  }
}

// Import this from item.ts to avoid circular dependency
import { BattleNetItem } from './item';