// Character roles and classes
export type CharacterRole = 'Tank' | 'Healer' | 'DPS' | 'Support';

// Battle.net API Types
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

export interface KeyReference {
  href: string;
}

export interface TypeName {
  type: string;
  name: LocalizedString;
}

export interface GuildCrestColor {
  id: number;
  rgba: {
    r: number;
    g: number;
    b: number;
    a: number;
  };
}

export interface GuildCrestMedia {
  key: KeyReference;
  id: number;
}

export interface GuildCrest {
  emblem: {
    id: number;
    media: GuildCrestMedia;
    color: GuildCrestColor;
  };
  border: {
    id: number;
    media: GuildCrestMedia;
    color: GuildCrestColor;
  };
  background: {
    color: GuildCrestColor;
  };
}

export interface RealmReference {
  key: KeyReference;
  name: LocalizedString;
  id: number;
  slug: string;
}

export interface PlayableClass {
  key: KeyReference;
  name: LocalizedString;
  id: number;
}

export interface PlayableRace {
  key: KeyReference;
  name: LocalizedString;
  id: number;
}

export interface BattleNetGuildMember {
  character: {
    name: string;
    id: number;
    realm: RealmReference;
    level: number;
    playable_class: PlayableClass;
    playable_race: PlayableRace;
    faction: TypeName;
  };
  rank: number;
}

export interface BattleNetGuild {
  _links: {
    self: {
      href: string;
    };
  };
  id: number;
  name: string;
  faction: TypeName;
  achievement_points: number;
  member_count: number;
  realm: RealmReference;
  crest: GuildCrest;
  created_timestamp: number;
  roster: {
    href: string;
  };
  achievements: {
    href: string;
  };
  activity: {
    href: string;
  };
}

export interface BattleNetGuildRoster {
  _links: {
    self: {
      href: string;
    };
  };
  guild: {
    key: KeyReference;
    name: string;
    id: number;
    realm: RealmReference;
    faction: TypeName;
  };
  members: BattleNetGuildMember[];
}

export interface Guild {
  id: number;
  name: string;
  realm: string;
  region: string;
  last_updated?: string;
  guild_data: BattleNetGuild;
  is_guild_master?: boolean;
}

export interface GuildMember {
  id: number;
  guild_id: number;
  character_name: string;
  character_class: string;
  character_role: CharacterRole;
  rank: number;
  user_id?: number;
  battletag?: string;
}

export interface Character {
  id: number;
  user_id: number;
  name: string;
  realm: string;
  class: string;
  level: number;
  role: CharacterRole;
  is_main: boolean;
  created_at?: string;
  updated_at?: string;
  guild_id?: number;
  achievement_points: number;
  equipped_item_level: number;
  average_item_level: number;
  last_login_timestamp: string;
  active_spec: {
    key: KeyReference;
    name: LocalizedString;
    id: number;
  };
  active_title?: {
    key: KeyReference;
    name: LocalizedString;
    id: number;
    display_string: LocalizedString;
  };
  covenant_progress?: {
    chosen_covenant: {
      key: KeyReference;
      name: LocalizedString;
      id: number;
    };
    renown_level: number;
  };
  
}

export interface MythicKeystoneRun {
  completed_timestamp: string;
  duration: number;
  keystone_level: number;
  map_rating: number;
  dungeon: {
    key: KeyReference;
    name: LocalizedString;
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
      name: LocalizedString;
      id: number;
    };
    race: PlayableRace;
    equipped_item_level: number;
  }>;
}

export interface EnhancedGuildMember extends GuildMember {
  character: Character & {
    itemLevel: number;
    mythicKeystone: {
      current_period: {
        period: {
          id: number;
          start_timestamp: string;
          end_timestamp: string;
        };
        best_runs: MythicKeystoneRun[];
      };
      seasons?: Array<{
        id: number;
        season_id: number;
        best_runs: MythicKeystoneRun[];
      }>;
    };
    activeSpec: {
      key: KeyReference;
      name: LocalizedString;
      id: number;
    };
    professions: Array<{
      profession: {
        key: KeyReference;
        name: LocalizedString;
        id: number;
      };
      skill_points: number;
      max_skill_points: number;
      specializations: Array<{
        specialization_id: number;
        name: LocalizedString;
        points_spent: number;
      }>;
      tiers: Array<{
        tier_id: number;
        known_recipes: Array<{
          key: KeyReference;
          name: LocalizedString;
          id: number;
        }>;
      }>;
    }>;
  };
}

export interface GuildRank {
  id?: number;
  guild_id?: number;
  rank_id: number;
  rank_name: string;
  is_custom?: boolean;
  created_at?: string;
  updated_at?: string;
}