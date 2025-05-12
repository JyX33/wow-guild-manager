/**
 * Common types used across Battle.net API responses
 */

/**
 * Localized string with values for each supported locale
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
 * Reference to another API resource
 */
export interface KeyReference {
  href: string;
}

/**
 * Simple type and name structure used for many fields
 */
export interface TypeName {
  type: string;
  name: string;
}

/**
 * Realm reference structure
 */
export interface RealmReference {
  key: KeyReference;
  name: string;
  id: number;
  slug: string;
}

/**
 * Playable class reference
 */
export interface PlayableClass {
  key: KeyReference;
  name: string;
  id: number;
}

/**
 * Playable race reference
 */
export interface PlayableRace {
  key: KeyReference;
  name: string;
  id: number;
}

/**
 * Color structure used in various resources
 */
export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}