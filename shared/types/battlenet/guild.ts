/**
 * Guild-related Battle.net API types
 */

import { KeyReference, TypeName, RealmReference, PlayableClass, PlayableRace } from './common';

/**
 * Guild crest color
 */
export interface GuildCrestColor {
  id: number;
  rgba: {
    r: number;
    g: number;
    b: number;
    a: number;
  };
}

/**
 * Guild crest media reference
 */
export interface GuildCrestMedia {
  key: KeyReference;
  id: number;
}

/**
 * Complete guild crest structure
 */
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

/**
 * Guild member character from roster API
 */
export interface BattleNetGuildMemberCharacter {
  name: string;
  id: number;
  realm: RealmReference;
  level: number;
  playable_class: PlayableClass;
  playable_race: PlayableRace;
  faction: TypeName;
}

/**
 * Guild member from roster API
 */
export interface BattleNetGuildMember {
  character: BattleNetGuildMemberCharacter;
  rank: number;
}

/**
 * Complete guild roster API response
 */
export interface BattleNetGuildRoster {
  _links: {
    self: {
      href: string;
    };
  };
  guild: {
    key: {
      href: string;
    };
    name: string;
    id: number;
    realm: RealmReference;
    faction: {
      type: string;
      name: string;
    };
  };
  members: BattleNetGuildMember[];
}

/**
 * Guild summary from guild API
 */
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