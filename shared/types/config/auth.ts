/**
 * Authentication configuration types
 */

/**
 * Authentication configuration
 */
export interface AuthConfig {
  jwtSecret: string;
  jwtRefreshSecret: string;
  jwtExpiresIn: string;
  jwtRefreshExpiresIn: string;
  cookieMaxAge: number;
  refreshCookieMaxAge: number;
}