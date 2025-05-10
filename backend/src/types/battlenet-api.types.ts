// backend/src/types/battlenet-api.types.ts
import { ErrorCode, ExternalApiErrorDetail } from "../../../shared/types/error.js";
import { BattleNetRegion } from "../../../shared/types/user.js";

/**
 * HTTP Client interface for abstracting HTTP operations
 */
export interface HttpClient {
  get<T>(url: string, params?: Record<string, any>, headers?: Record<string, string>): Promise<T>;
  post<T>(url: string, data: any, auth?: { username: string; password?: string | undefined }, headers?: Record<string, string>): Promise<T>;
}

/**
 * Base Battle.net API Response structure
 */
export interface BattleNetApiResponse {
  _links: {
    self: {
      href: string;
    };
  };
}

/**
 * Battle.net Guild API Response
 */
export interface BattleNetGuild extends BattleNetApiResponse {
  id: number;
  name: string;
  faction: {
    type: string;
    name: string;
  };
  achievement_points: number;
  member_count: number;
  realm: {
    id: number;
    name: string;
    slug: string;
  };
  created_timestamp: number;
  roster_url: string;
}

/**
 * Guild member in Battle.net API Response
 */
export interface BattleNetGuildMember {
  character: {
    id: number;
    name: string;
    level: number;
    playable_class: {
      id: number;
      name: string;
      slug: string;
    };
    playable_race: {
      id: number;
      name: string;
      slug: string;
    };
    realm: {
      id: number;
      slug: string;
      name: string;
    };
  };
  rank: number;
}

/**
 * Battle.net Guild Roster API Response
 */
export interface BattleNetGuildRoster extends BattleNetApiResponse {
  guild: {
    id: number;
    name: string;
    faction: {
      type: string;
      name: string;
    };
    realm: {
      id: number;
      slug: string;
      name: string;
    };
  };
  members: BattleNetGuildMember[];
}

/**
 * Battle.net Character API Response
 */
export interface BattleNetCharacter extends BattleNetApiResponse {
  id: number;
  name: string;
  gender: {
    type: string;
    name: string;
  };
  level: number;
  equipped_item_level: number;
  achievement_points: number;
  faction: {
    type: string;
    name: string;
  };
  race: {
    id: number;
    name: string;
    slug: string;
  };
  character_class: {
    id: number;
    name: string;
    slug: string;
  };
  active_spec: {
    id: number;
    name: string;
    slug: string;
  };
  realm: {
    id: number;
    name: string;
    slug: string;
  };
  guild?: {
    id: number;
    name: string;
    faction: {
      type: string;
      name: string;
    };
    realm: {
      id: number;
      name: string;
      slug: string;
    };
  };
  covenant_progress?: {
    chosen_covenant: {
      id: number;
      name: string;
    };
    renown_level: number;
  };
  last_login_timestamp: number;
}

/**
 * Battle.net Character Equipment API Response
 */
export interface BattleNetCharacterEquipment extends BattleNetApiResponse {
  character: {
    id: number;
    name: string;
    realm: {
      id: number;
      slug: string;
      name: string;
    };
  };
  equipped_items: Array<{
    slot: {
      type: string;
      name: string;
    };
    item: {
      id: number;
      name: string;
    };
    quality: {
      type: string;
      name: string;
    };
    level: {
      value: number;
    };
  }>;
  equipped_item_sets?: Array<{
    item_set: {
      id: number;
      name: string;
    };
    items: Array<{
      item: {
        id: number;
        name: string;
      };
    }>;
    effects: Array<{
      display_string: string;
      required_count: number;
    }>;
  }>;
}

/**
 * Battle.net Mythic Keystone Profile API Response
 */
export interface BattleNetMythicKeystoneProfile extends BattleNetApiResponse {
  current_period: {
    period: {
      id: number;
    };
    best_runs: Array<{
      completed_timestamp: number;
      duration: number;
      keystone_level: number;
      members: Array<{
        character: {
          id: number;
          name: string;
          realm: {
            id: number;
            slug: string;
            name: string;
          };
        };
        specialization: {
          id: number;
          name: string;
        };
        race: {
          id: number;
          name: string;
        };
        equipped_item_level: number;
      }>;
      dungeon: {
        id: number;
        name: string;
      };
      is_completed_within_time: boolean;
    }>;
  };
  best_season?: {
    season: {
      id: number;
    };
    best_runs: Array<{
      completed_timestamp: number;
      duration: number;
      keystone_level: number;
      dungeon: {
        id: number;
        name: string;
      };
      is_completed_within_time: boolean;
    }>;
  };
  character: {
    id: number;
    name: string;
    realm: {
      id: number;
      slug: string;
      name: string;
    };
  };
}

/**
 * Battle.net Character Professions API Response
 */
export interface BattleNetProfessions extends BattleNetApiResponse {
  character: {
    id: number;
    name: string;
    realm: {
      id: number;
      slug: string;
      name: string;
    };
    key?: {
      href: string;
    };
  };
  primaries: Array<{
    profession: {
      id: number;
      name: string;
      slug: string;
    };
    tiers: Array<{
      tier: {
        id: number;
        name: string;
      };
      skill_points: number;
      max_skill_points: number;
      known_recipes?: Array<{
        id: number;
        name: string;
        recipe?: {
          id: number;
          name: string;
          crafted_item?: {
            id: number;
            name: string;
          };
        };
      }>;
    }>;
  }>;
  secondaries: Array<{
    profession: {
      id: number;
      name: string;
      slug: string;
    };
    tiers: Array<{
      tier: {
        id: number;
        name: string;
      };
      skill_points: number;
      max_skill_points: number;
    }>;
  }>;
}

/**
 * Error context for Battle.net API errors
 */
export interface BattleNetApiErrorContext {
  operation: 'fetch' | 'update' | 'create' | 'delete';
  resourceType: string;
  resourceId: string;
  region?: BattleNetRegion;
  jobId?: string;
}

/**
 * Creates a standardized external API error detail object for Battle.net
 */
export function createBattleNetErrorDetail(
  context: BattleNetApiErrorContext,
  statusCode?: number,
  errorMessage?: string,
): ExternalApiErrorDetail {
  return {
    type: 'external_api',
    provider: 'battle.net',
    statusCode,
    originalMessage: errorMessage,
    endpoint: context.resourceType,
    requestId: context.jobId,
  };
}

/**
 * Maps HTTP status codes to application error codes
 */
export function mapHttpStatusToErrorCode(status?: number): ErrorCode {
  if (!status) return ErrorCode.EXTERNAL_API_ERROR;
  
  switch (status) {
    case 400:
      return ErrorCode.BAD_REQUEST;
    case 401:
      return ErrorCode.UNAUTHORIZED;
    case 403:
      return ErrorCode.FORBIDDEN;
    case 404:
      return ErrorCode.NOT_FOUND;
    case 429:
      return ErrorCode.RATE_LIMITED;
    default:
      return status >= 500
        ? ErrorCode.EXTERNAL_API_ERROR
        : ErrorCode.BAD_REQUEST;
  }
}

// Type Guards

export function isBattleNetApiResponse(data: unknown): data is BattleNetApiResponse {
  if (!data || typeof data !== 'object') return false;
  
  const response = data as Partial<BattleNetApiResponse>;
  return typeof response._links?.self?.href === 'string';
}

export function isBattleNetGuild(data: unknown): data is BattleNetGuild {
  if (!isBattleNetApiResponse(data)) return false;
  
  const guild = data as Partial<BattleNetGuild>;
  
  return (
    typeof guild.id === 'number' &&
    typeof guild.name === 'string' &&
    typeof guild.faction?.type === 'string' &&
    typeof guild.faction?.name === 'string' &&
    typeof guild.achievement_points === 'number' &&
    typeof guild.member_count === 'number' &&
    typeof guild.realm?.id === 'number' &&
    typeof guild.realm?.name === 'string' &&
    typeof guild.realm?.slug === 'string' &&
    typeof guild.created_timestamp === 'number' &&
    typeof guild.roster_url === 'string'
  );
}

export function isBattleNetGuildRoster(data: unknown): data is BattleNetGuildRoster {
  if (!isBattleNetApiResponse(data)) return false;
  
  const roster = data as Partial<BattleNetGuildRoster>;
  
  if (!roster.guild || typeof roster.guild !== 'object') return false;
  if (!Array.isArray(roster.members)) return false;
  
  return (
    typeof roster.guild.id === 'number' &&
    typeof roster.guild.name === 'string' &&
    typeof roster.guild.faction?.type === 'string' &&
    typeof roster.guild.faction?.name === 'string' &&
    typeof roster.guild.realm?.id === 'number' &&
    typeof roster.guild.realm?.slug === 'string' &&
    typeof roster.guild.realm?.name === 'string'
  );
}

export function isBattleNetCharacter(data: unknown): data is BattleNetCharacter {
  if (!isBattleNetApiResponse(data)) return false;
  
  const character = data as Partial<BattleNetCharacter>;
  
  return (
    typeof character.id === 'number' &&
    typeof character.name === 'string' &&
    typeof character.gender?.type === 'string' &&
    typeof character.gender?.name === 'string' &&
    typeof character.level === 'number' &&
    typeof character.equipped_item_level === 'number' &&
    typeof character.achievement_points === 'number' &&
    typeof character.faction?.type === 'string' &&
    typeof character.faction?.name === 'string' &&
    typeof character.race?.id === 'number' &&
    typeof character.race?.name === 'string' &&
    typeof character.race?.slug === 'string' &&
    typeof character.character_class?.id === 'number' &&
    typeof character.character_class?.name === 'string' &&
    typeof character.character_class?.slug === 'string' &&
    typeof character.active_spec?.id === 'number' &&
    typeof character.active_spec?.name === 'string' &&
    typeof character.active_spec?.slug === 'string' &&
    typeof character.realm?.id === 'number' &&
    typeof character.realm?.name === 'string' &&
    typeof character.realm?.slug === 'string' &&
    typeof character.last_login_timestamp === 'number'
  );
}

export function isBattleNetCharacterEquipment(data: unknown): data is BattleNetCharacterEquipment {
  if (!isBattleNetApiResponse(data)) return false;
  
  const equipment = data as Partial<BattleNetCharacterEquipment>;
  
  if (!equipment.character || typeof equipment.character !== 'object') return false;
  if (!Array.isArray(equipment.equipped_items)) return false;
  
  return (
    typeof equipment.character.id === 'number' &&
    typeof equipment.character.name === 'string' &&
    typeof equipment.character.realm?.id === 'number' &&
    typeof equipment.character.realm?.slug === 'string' &&
    typeof equipment.character.realm?.name === 'string'
  );
}

export function isBattleNetMythicKeystoneProfile(data: unknown): data is BattleNetMythicKeystoneProfile {
  if (!isBattleNetApiResponse(data)) return false;
  
  const profile = data as Partial<BattleNetMythicKeystoneProfile>;
  
  if (!profile.character || typeof profile.character !== 'object') return false;
  if (!profile.current_period || typeof profile.current_period !== 'object') return false;
  
  return (
    typeof profile.character.id === 'number' &&
    typeof profile.character.name === 'string' &&
    typeof profile.character.realm?.id === 'number' &&
    typeof profile.character.realm?.slug === 'string' &&
    typeof profile.character.realm?.name === 'string' &&
    typeof profile.current_period.period?.id === 'number' &&
    Array.isArray(profile.current_period.best_runs)
  );
}

export function isBattleNetProfessions(data: unknown): data is BattleNetProfessions {
  if (!isBattleNetApiResponse(data)) return false;
  
  const professions = data as Partial<BattleNetProfessions>;
  
  if (!professions.character || typeof professions.character !== 'object') return false;
  if (!Array.isArray(professions.primaries)) return false;
  if (!Array.isArray(professions.secondaries)) return false;
  
  return (
    typeof professions.character.id === 'number' &&
    typeof professions.character.name === 'string' &&
    typeof professions.character.realm?.id === 'number' &&
    typeof professions.character.realm?.slug === 'string' &&
    typeof professions.character.realm?.name === 'string'
  );
}