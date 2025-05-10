import {
  DbGuild,
  DbCharacter,
  DbGuildMember,
  BattleNetGuild,
  BattleNetGuildRoster,
  BattleNetCharacter,
  BattleNetCharacterEquipment,
  BattleNetMythicKeystoneProfile,
  BattleNetProfessions,
  BattleNetGuildMember
} from './guild.js';

import { BattleNetUserProfile, DbUser } from './user.js';

/**
 * Enhanced database models that explicitly include JSON fields
 * with proper typing instead of using any
 */

export interface DbGuildEnhanced extends DbGuild {
  guild_data_json?: BattleNetGuild | null;
  roster_json?: BattleNetGuildRoster | null;
}

export interface DbCharacterEnhanced extends DbCharacter {
  profile_json?: BattleNetCharacter | null;
  equipment_json?: BattleNetCharacterEquipment | null;
  mythic_profile_json?: BattleNetMythicKeystoneProfile | null;
  professions_json?: BattleNetProfessions['primaries'] | null;
}

export interface DbGuildMemberEnhanced extends DbGuildMember {
  member_data_json?: BattleNetGuildMember | null;
}

export interface DbUserEnhanced extends DbUser {
  user_data?: BattleNetUserProfile | null;
}

/**
 * Type guards to verify JSON data structures
 */

export function isBattleNetGuild(data: unknown): data is BattleNetGuild {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'name' in data &&
    'faction' in data &&
    'realm' in data
  );
}

export function isBattleNetGuildRoster(data: unknown): data is BattleNetGuildRoster {
  return (
    typeof data === 'object' &&
    data !== null &&
    '_links' in data &&
    'guild' in data &&
    'members' in data &&
    Array.isArray((data as any).members)
  );
}

export function isBattleNetCharacter(data: unknown): data is BattleNetCharacter {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'name' in data &&
    'realm' in data
  );
}

export function isBattleNetCharacterEquipment(data: unknown): data is BattleNetCharacterEquipment {
  return (
    typeof data === 'object' &&
    data !== null &&
    'character' in data &&
    'equipped_items' in data &&
    Array.isArray((data as any).equipped_items)
  );
}

export function isBattleNetMythicKeystoneProfile(data: unknown): data is BattleNetMythicKeystoneProfile {
  return (
    typeof data === 'object' &&
    data !== null &&
    '_links' in data &&
    'current_period' in data
  );
}

export function isBattleNetProfessions(data: unknown): data is BattleNetProfessions {
  return (
    typeof data === 'object' &&
    data !== null &&
    '_links' in data &&
    'character' in data &&
    'primaries' in data
  );
}

export function isBattleNetUserProfile(data: unknown): data is BattleNetUserProfile {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'battletag' in data
  );
}