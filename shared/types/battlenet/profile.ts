/**
 * Types for Battle.net profile API responses
 */

/**
 * User profile from Battle.net API
 */
export interface BattleNetUserProfile {
  id: string;
  battletag: string;
  sub: string;
  [key: string]: any; // For any additional fields returned by Battle.net API
}

/**
 * WoW Character summary from Battle.net Profile API
 */
export interface BattleNetCharacterSummary {
  name: string;
  id: number;
  realm: BattleNetRealmReference;
  level?: number;
  playable_class?: {
    id: number;
    name: string;
    key?: {
      href: string;
    };
  };
  playable_race?: {
    id: number;
    name: string;
    key?: {
      href: string;
    };
  };
  guild?: {
    name: string;
    id?: number;
    realm: BattleNetRealmReference;
  };
}

/**
 * Realm reference from Battle.net API
 */
export interface BattleNetRealmReference {
  slug: string;
  name: string;
  id?: number;
  key?: {
    href: string;
  };
}

/**
 * WoW Account from Battle.net API
 */
export interface BattleNetWoWAccount {
  characters: BattleNetCharacterSummary[];
}

/**
 * WoW Profile from Battle.net API
 */
export interface BattleNetWoWProfile {
  _links: {
    self: {
      href: string;
    };
  };
  id: number;
  wow_accounts: BattleNetWoWAccount[];
  collections?: {
    href: string;
  };
}