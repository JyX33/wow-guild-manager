/**
 * Type compatibility tests for the shared types
 * 
 * This file doesn't contain actual runtime tests, but it does verify
 * type compatibility and proper exports via TypeScript compilation.
 * 
 * To run: npx tsc -p shared/types/tests/tsconfig.json
 */

// Import using the namespace pattern
import * as API from '../api';
import * as DB from '../db';
import * as BattleNet from '../battlenet';
import * as Models from '../models';
import * as Enums from '../enums';
import * as Config from '../config';
import * as Utils from '../utils';

// Also import some key types directly to verify direct imports
import { ApiResponse, ApiError } from '../api/responses';
import { Roster, RosterMember } from '../api/roster';
import { DbGuild } from '../db/models/guild';
import { DbCharacter } from '../db/models/character';
import { DbGuildEnhanced } from '../db/enhanced/guild';
import { BattleNetGuild, BattleNetGuildMember } from '../battlenet/guild';
import { BattleNetCharacter } from '../battlenet/character';
import { User, UserWithTokens } from '../models/user';
import { Guild, GuildMember } from '../models/guild';
import { BattleNetRegion, UserRole } from '../enums/user';
import { CharacterRole } from '../enums/guild';
import { ErrorCode, ErrorDetail } from '../utils/errors';
import { DeepPartial } from '../utils/helpers';

// ======================================================================
// API TYPE CHECKS
// ======================================================================

/**
 * Tests for API response types
 */
function testApiResponses() {
  // Basic ApiResponse with string data
  const successResponse: ApiResponse<string> = {
    success: true,
    data: 'Success message',
  };
  
  // ApiResponse with an error
  const errorResponse: ApiResponse = {
    success: false,
    error: {
      status: 404,
      message: 'Resource not found',
      code: ErrorCode.NOT_FOUND,
    },
  };
  
  // ApiResponse with Guild data
  const guildResponse: ApiResponse<Guild> = {
    success: true,
    data: {
      id: 1,
      name: 'Test Guild',
      realm: 'Test Realm',
      region: 'eu',
    },
  };
  
  // Using the namespace imports
  const paginatedResponse: API.PaginatedResponse<User> = {
    success: true,
    data: [
      {
        id: 1,
        battle_net_id: '1234',
        battletag: 'User#1234',
      },
    ],
    pagination: {
      total: 1,
      page: 1,
      limit: 10,
      total_pages: 1,
    },
  };
  
  return {
    successResponse,
    errorResponse,
    guildResponse,
    paginatedResponse,
  };
}

/**
 * Tests for Roster types
 */
function testRosterTypes() {
  // Basic Roster
  const roster: Roster = {
    id: 1,
    guildId: 1,
    name: 'Main Raid Team',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  // RosterMember
  const member: RosterMember = {
    characterId: 1,
    name: 'CharacterName',
    rank: 'Officer',
    class: 'Paladin',
    role: 'Tank',
  };
  
  // RosterMemberAddition by character
  const addByCharacter: API.RosterMemberAddition = {
    type: 'character',
    characterId: 1,
    role: 'DPS',
  };
  
  // RosterMemberAddition by rank
  const addByRank: API.RosterMemberAddition = {
    type: 'rank',
    rankId: 2,
  };
  
  return {
    roster,
    member,
    addByCharacter,
    addByRank,
  };
}

// ======================================================================
// DATABASE TYPE CHECKS
// ======================================================================

/**
 * Tests for DB query types
 */
function testDbQueryTypes() {
  // Simple query params
  const simpleQuery: DB.DbQueryParams<DbGuild> = {
    conditions: {
      region: 'eu',
      realm: 'Test Realm',
    },
  };
  
  // Complex query with pagination
  const complexQuery: DB.DbQueryParams<DbGuild> = {
    complexConditions: [
      {
        field: 'name',
        operator: DB.DbQueryOperator.LIKE,
        value: '%Test%',
      },
      {
        field: 'region',
        operator: DB.DbQueryOperator.IN,
        value: ['eu', 'us'],
      },
    ],
    pagination: {
      page: 1,
      limit: 10,
    },
    sort: [
      {
        field: 'name',
        direction: 'ASC',
      },
    ],
  };
  
  // Paginated result
  const result: DB.DbPaginatedResult<DbGuild> = {
    data: [
      {
        id: 1,
        name: 'Test Guild',
        realm: 'Test Realm',
        region: 'eu',
      },
    ],
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
  };
  
  return {
    simpleQuery,
    complexQuery,
    result,
  };
}

/**
 * Tests for DB model types
 */
function testDbModelTypes() {
  // Guild model
  const dbGuild: DbGuild = {
    id: 1,
    name: 'Test Guild',
    realm: 'Test Realm',
    region: 'eu',
  };
  
  // Character model
  const dbCharacter: DbCharacter = {
    id: 1,
    name: 'Test Character',
    realm: 'Test Realm',
    class: 'Paladin',
    level: 70,
  };
  
  // Enhanced guild model with JSON fields
  const enhancedGuild: DbGuildEnhanced = {
    id: 1,
    name: 'Test Guild',
    realm: 'Test Realm',
    region: 'eu',
    guild_data_json: {
      _links: { self: { href: '' } },
      id: 12345,
      name: 'Test Guild',
      faction: { type: 'ALLIANCE', name: 'Alliance' },
      realm: {
        key: { href: '' },
        name: 'Test Realm',
        id: 1,
        slug: 'test-realm',
      },
      achievement_points: 1000,
      member_count: 25,
      created_timestamp: 1620000000000,
      crest: {
        emblem: {
          id: 1,
          media: { key: { href: '' }, id: 1 },
          color: { id: 1, rgba: { r: 0, g: 0, b: 0, a: 0 } },
        },
        border: {
          id: 1,
          media: { key: { href: '' }, id: 1 },
          color: { id: 1, rgba: { r: 0, g: 0, b: 0, a: 0 } },
        },
        background: {
          color: { id: 1, rgba: { r: 0, g: 0, b: 0, a: 0 } },
        },
      },
      roster: { href: '' },
      achievements: { href: '' },
      activity: { href: '' },
    },
  };
  
  return {
    dbGuild,
    dbCharacter, 
    enhancedGuild,
  };
}

// ======================================================================
// BATTLENET TYPE CHECKS
// ======================================================================

/**
 * Tests for BattleNet API types
 */
function testBattleNetTypes() {
  // BattleNet Guild
  const bnetGuild: BattleNetGuild = {
    _links: { self: { href: '' } },
    id: 12345,
    name: 'Test Guild',
    faction: { type: 'ALLIANCE', name: 'Alliance' },
    achievement_points: 1000,
    member_count: 25,
    realm: {
      key: { href: '' },
      name: 'Test Realm',
      id: 1,
      slug: 'test-realm',
    },
    crest: {
      emblem: {
        id: 1,
        media: { key: { href: '' }, id: 1 },
        color: { id: 1, rgba: { r: 0, g: 0, b: 0, a: 0 } },
      },
      border: {
        id: 1,
        media: { key: { href: '' }, id: 1 },
        color: { id: 1, rgba: { r: 0, g: 0, b: 0, a: 0 } },
      },
      background: {
        color: { id: 1, rgba: { r: 0, g: 0, b: 0, a: 0 } },
      },
    },
    created_timestamp: 1620000000000,
    roster: { href: '' },
    achievements: { href: '' },
    activity: { href: '' },
  };
  
  // BattleNet Character
  const bnetCharacter: BattleNetCharacter = {
    _links: { self: { href: '' } },
    id: 12345,
    name: 'Test Character',
    gender: { type: 'MALE', name: 'Male' },
    faction: { type: 'ALLIANCE', name: 'Alliance' },
    race: {
      key: { href: '' },
      name: 'Human',
      id: 1,
    },
    character_class: {
      key: { href: '' },
      name: 'Paladin',
      id: 2,
    },
    active_spec: {
      key: { href: '' },
      name: 'Protection',
      id: 1,
    },
    realm: {
      key: { href: '' },
      name: 'Test Realm',
      id: 1,
      slug: 'test-realm',
    },
    level: 70,
    experience: 0,
    achievement_points: 1000,
    achievements: { href: '' },
    titles: { href: '' },
    pvp_summary: { href: '' },
    encounters: { href: '' },
    media: { href: '' },
    last_login_timestamp: 1620000000000,
    average_item_level: 400,
    equipped_item_level: 405,
    specializations: { href: '' },
    statistics: { href: '' },
    mythic_keystone_profile: { href: '' },
  };
  
  return {
    bnetGuild,
    bnetCharacter,
  };
}

// ======================================================================
// MODEL TYPE CHECKS
// ======================================================================

/**
 * Tests for application model types
 */
function testModelTypes() {
  // User model
  const user: User = {
    id: 1,
    battle_net_id: '12345',
    battletag: 'User#1234',
    region: 'eu',
    role: UserRole.USER,
  };
  
  // Guild model
  const guild: Guild = {
    id: 1,
    name: 'Test Guild',
    realm: 'Test Realm',
    region: 'eu',
    is_guild_master: false,
  };
  
  // Guild member model
  const guildMember: GuildMember = {
    guild_id: 1,
    character_name: 'Test Character',
    character_class: 'Paladin',
    character_role: 'Tank',
    rank: 0,
  };
  
  return {
    user,
    guild,
    guildMember,
  };
}

// ======================================================================
// ENUM TYPE CHECKS
// ======================================================================

/**
 * Tests for enum types
 */
function testEnumTypes() {
  // UserRole enum
  const roles: UserRole[] = [
    UserRole.USER,
    UserRole.GUILD_LEADER,
    UserRole.ADMIN,
  ];
  
  // BattleNetRegion type
  const regions: BattleNetRegion[] = [
    'eu',
    'us',
    'kr',
    'tw',
    'cn',
  ];
  
  // CharacterRole type
  const characterRoles: CharacterRole[] = [
    'Tank',
    'Healer',
    'DPS',
    'Support',
  ];
  
  return {
    roles,
    regions,
    characterRoles,
  };
}

// ======================================================================
// UTILITY TYPE CHECKS
// ======================================================================

/**
 * Tests for utility types
 */
function testUtilityTypes() {
  // DeepPartial type
  const partialGuild: DeepPartial<Guild> = {
    name: 'Partial Guild',
    guild_data_json: {
      name: 'Partial Guild JSON',
    },
  };
  
  // ErrorCode enum
  const errorCodes: ErrorCode[] = [
    ErrorCode.NOT_FOUND,
    ErrorCode.UNAUTHORIZED,
    ErrorCode.VALIDATION_ERROR,
  ];
  
  return {
    partialGuild,
    errorCodes,
  };
}

// Export test functions to prevent them from being removed as unused
export {
  testApiResponses,
  testRosterTypes,
  testDbQueryTypes,
  testDbModelTypes,
  testBattleNetTypes,
  testModelTypes,
  testEnumTypes,
  testUtilityTypes,
};