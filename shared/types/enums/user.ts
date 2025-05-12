/**
 * User-related enumerations
 */

/**
 * Enum for user roles in the system
 */
export enum UserRole {
  USER = 'user',
  GUILD_LEADER = 'guild_leader',
  ADMIN = 'admin'
}

/**
 * Battle.net region identifiers
 */
export type BattleNetRegion = 'eu' | 'us' | 'kr' | 'tw' | 'cn';