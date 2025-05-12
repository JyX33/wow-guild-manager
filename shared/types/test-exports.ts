/**
 * This file is a test to verify that all types are correctly exported
 * It doesn't do anything functional, just exists for verification purposes
 */

// Use the import * as syntax to avoid TypeScript complaining about unused imports
import * as API from './api';
import * as DB from './db';
import * as BattleNet from './battlenet';
import * as Models from './models';
import * as Enums from './enums';
import * as Config from './config';
import * as Utils from './utils';

/**
 * This namespace exports type aliases to verify all our type exports work.
 * This is only for type checking and testing, not functional code.
 */
export namespace ExportedTypes {
  // API types
  export type ApiResponseType = API.ApiResponse<string>;
  export type HttpMethodType = API.HttpMethod;
  
  // DB types
  export type QueryParamsType = DB.DbQueryParams<any>;
  
  // BattleNet types
  export type BNetGuildType = BattleNet.BattleNetGuild;
  export type TokenResponseType = BattleNet.TokenResponse;
  
  // Model types
  export type UserType = Models.User;
  export type GuildType = Models.Guild;
  
  // Enum types
  export type UserRoleType = Enums.UserRole;
  export type EventTypeType = Enums.EventType;
  
  // Config types
  export type AppConfigType = Config.AppConfig;
  
  // Utils types
  export type ErrorCodeType = Utils.ErrorCode;
  export type DeepPartialType = Utils.DeepPartial<{}>;
}