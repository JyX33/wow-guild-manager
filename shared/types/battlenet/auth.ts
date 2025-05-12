/**
 * Authentication-related Battle.net API types
 */

/**
 * Response from Battle.net token endpoints
 */
export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string; // Optional for client_credentials
  scope: string;
}

/**
 * Response from the backend's /auth/refresh endpoint
 */
export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}