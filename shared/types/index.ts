/**
 * Main entry point for shared types
 * This file exports all types in a structured manner
 */

// Import new modular types
import * as API from './api';
import * as DB from './db';
import * as BattleNet from './battlenet';
import * as Models from './models';
import * as Config from './config';
import * as Enums from './enums';
import * as Utils from './utils';

// Re-export the modules
export { API, DB, BattleNet, Models, Config, Enums, Utils };

// Legacy exports for backward compatibility with more specific control
// Instead of exporting everything from these files, we'll explicitly re-export
// to avoid naming conflicts
// Legacy Guild types
export type {
  Guild, GuildMember, EnhancedGuildMember,
  GuildRank, ClassifiedMember, GuildMemberActivity
} from './guild';

// Legacy Event types
export * from './event';

// Legacy API types
export * from './api';

// Legacy Config types
export * from './config';

// Legacy Auth types
export * from './auth';

// Legacy DB types (not conflicting with Battle.net types)
export * from './db';
export * from './db-enhanced';

// Legacy Error types
export * from './error';

// Legacy User types
export * from './user';

// Common convenience exports
// API types
export type { ApiResponse, ApiError } from './api/responses';
export type { HttpMethod } from './api/http';

// Database types
export type { DbQueryParams, DbPaginatedResult } from './db/query';

// BattleNet types
export type { BattleNetRegion } from './enums/user';
export { CharacterRole } from './enums/guild'; // Export as value to avoid conflict
export type { EventType } from './enums/event';

// Error utilities
export type { ErrorCode } from './utils/errors';