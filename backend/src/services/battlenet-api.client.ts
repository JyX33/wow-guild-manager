import * as battleNetService from './battlenet.service';
import { AppError } from '../utils/error-handler';
import { BattleNetRegion } from '../../../shared/types/user'; // Corrected import path
import Bottleneck from 'bottleneck'; // Added import

/**
 * Interface for the Battle.net client credentials token response.
 */
interface ClientCredentialsTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  sub?: string; // Optional, depending on Battle.net response
}

// --- Rate Limiter Configuration ---
// Read settings from environment variables with defaults
const BNET_MAX_CONCURRENT = parseInt(process.env.BNET_MAX_CONCURRENT || '20', 10);
const BNET_MIN_TIME_MS = parseInt(process.env.BNET_MIN_TIME_MS || '10', 10); // ~100 requests/sec (1000ms / 10ms)

console.log(`[ApiClient] Initializing Bottleneck with maxConcurrent: ${BNET_MAX_CONCURRENT}, minTime: ${BNET_MIN_TIME_MS}ms`);

/**
 * A client responsible for interacting with the Battle.net API,
 * handling authentication, rate limiting, and data fetching.
 */
export class BattleNetApiClient {
  private apiClientToken: string | null = null;
  private tokenExpiry: Date | null = null;

  // Initialize the rate limiter instance
  private limiter = new Bottleneck({
    reservoir: 36000, // Hourly limit
    reservoirRefreshAmount: 36000,
    reservoirRefreshInterval: 3600 * 1000, // 1 hour
    maxConcurrent: BNET_MAX_CONCURRENT,
    minTime: BNET_MIN_TIME_MS,
  });

  constructor() {
    // Optional: Add listeners for monitoring limiter events
    this.limiter.on('error', (error) => {
      console.error('[ApiClient Limiter Error]', error);
    });
    this.limiter.on('failed', (error, jobInfo) => {
      console.warn(`[ApiClient Limiter Failed] Job ${jobInfo.options.id} failed:`, error);
      // Note: 'failed' indicates an error during job execution *after* it was scheduled.
    });
     this.limiter.on('debug', (message, data) => {
       // console.log(`[ApiClient Limiter Debug] ${message}`, data); // Enable for verbose logging
     });
  }

  /**
   * Ensures a valid client credentials token is available and returns it.
   * Refreshes the token if it's missing, expired, or nearing expiry.
   * @returns {Promise<string>} A valid access token.
   * @throws {AppError} If fetching or refreshing the token fails.
   */
  public async ensureClientToken(): Promise<string> {
    const now = new Date();
    // Refresh token if it's missing or expiring within the next minute (60 * 1000 ms)
    if (!this.apiClientToken || !this.tokenExpiry || this.tokenExpiry <= new Date(now.getTime() + 60 * 1000)) {
      console.log('[ApiClient] Obtaining/Refreshing Client Credentials Token...');
      try {
        // Assuming battleNetService has a method for client_credentials grant
        const tokenResponse: ClientCredentialsTokenResponse = await battleNetService.getClientCredentialsToken();

        if (!tokenResponse || !tokenResponse.access_token || !tokenResponse.expires_in) {
           throw new Error('Invalid token response received from Battle.net service.');
        }

        this.apiClientToken = tokenResponse.access_token;
        // Calculate expiry time based on 'expires_in' (seconds)
        this.tokenExpiry = new Date(now.getTime() + tokenResponse.expires_in * 1000);
        console.log(`[ApiClient] Client Credentials Token obtained/refreshed. Expires at: ${this.tokenExpiry.toISOString()}`);

      } catch (error) {
        this.apiClientToken = null;
        this.tokenExpiry = null;
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[ApiClient] Failed to obtain/refresh Client Credentials Token:', errorMessage);
        // Wrap the original error for better context
        throw new AppError(`Failed to get API token: ${errorMessage}`, 500, {
          code: 'BATTLE_NET_AUTH_ERROR'
        });
      }
    }

    // Throw if token is still null after attempting fetch/refresh
    if (!this.apiClientToken) {
      throw new AppError('API token is null after fetch attempt', 500, { code: 'BATTLE_NET_AUTH_ERROR' });
    }

    return this.apiClientToken;
  }

  /**
   * Schedules a task using the limiter with retry logic for 429 errors.
   * @template T The expected return type of the task.
   * @param taskFn A function that returns a Promise resolving to T. This function performs the actual API call.
   * @returns {Promise<T>} The result of the task function.
   * @throws The error from the task function if it fails after potential retry.
   * @private
   */
  private async scheduleWithRetry<T>(taskFn: () => Promise<T>): Promise<T> {
    // Wrap the task function in the limiter's schedule method
    return this.limiter.schedule(async () => {
      try {
        // Execute the provided task function (e.g., the call to battleNetService)
        return await taskFn();
      } catch (error: any) {
        // Check if the error is a 429 Rate Limit error
        // Adjust the condition based on how battleNetService surfaces HTTP status codes
        const statusCode = error?.status || error?.response?.status || (error instanceof AppError ? error.status : undefined); // Use error.status for AppError
        const isRateLimitError = statusCode === 429;

        if (isRateLimitError) {
          console.warn('[ApiClient] Rate limit hit (429). Retrying once after delay...');
          // Calculate time remaining in the current second + buffer
          const waitTime = (1000 - (Date.now() % 1000)) + 50; // Wait remainder of second + 50ms buffer
          await new Promise(resolve => setTimeout(resolve, waitTime));

          try {
             // Retry the original task function *once*
             console.log('[ApiClient] Attempting retry after rate limit...');
             return await taskFn();
          } catch (retryError: any) {
             // Log the retry error and throw it
             const retryStatusCode = retryError?.status || retryError?.response?.status || (retryError instanceof AppError ? retryError.status : undefined); // Use retryError.status for AppError
             console.error(`[ApiClient] Retry failed after rate limit. Status: ${retryStatusCode || 'N/A'}`, retryError);
             throw retryError; // Throw the error from the retry attempt
          }
        }

        // If it wasn't a rate limit error, or if the retry failed (handled above), throw the original error
        throw error;
      }
    });
  }


  /**
   * Fetches guild data from the Battle.net API, handling rate limiting and retries.
   * @param realmSlug The slug of the realm.
   * @param guildNameSlug The slugified name of the guild.
   * @param region The region of the guild.
   * @returns {Promise<any>} The guild data. // TODO: Add specific type
   * @throws {AppError} If the API call fails after potential retries.
   */
  async getGuildData(realmSlug: string, guildNameSlug: string, region: BattleNetRegion): Promise<any> {
    const token = await this.ensureClientToken();
    // Define the task function to be scheduled
    const task = () => battleNetService.getGuildData(realmSlug, guildNameSlug, token, region);

    try {
      // Schedule the task using the retry helper
      return await this.scheduleWithRetry(task);
    } catch (error: any) {
      // Handle final error after scheduling and potential retry
      const statusCode = error?.status || error?.response?.status || (error instanceof AppError ? error.status : 500); // Use error.status for AppError
      console.error(`[ApiClient] Final error fetching guild data for ${guildNameSlug}-${realmSlug} (${region}) (Status: ${statusCode}):`, error);
      throw new AppError(`Failed to fetch guild data: ${error.message || String(error)}`, statusCode, {
        code: 'BATTLE_NET_API_ERROR',
        details: { realmSlug, guildNameSlug, region }
      });
    }
  }

  /**
   * Fetches guild roster from the Battle.net API, handling rate limiting and retries.
   * @param region The region of the guild.
   * @param realmSlug The slug of the realm.
   * @param guildNameSlug The slugified name of the guild.
   * @returns {Promise<any>} The guild roster data. // TODO: Add specific type (BattleNetGuildRoster)
   * @throws {AppError} If the API call fails after potential retries.
   */
  async getGuildRoster(region: BattleNetRegion, realmSlug: string, guildNameSlug: string): Promise<any> {
    const token = await this.ensureClientToken();
    // Define the task function
    const task = () => battleNetService.getGuildRoster(region, realmSlug, guildNameSlug, token);

    try {
      // Schedule the task
      return await this.scheduleWithRetry(task);
    } catch (error: any) {
      // Handle final error
      const statusCode = error?.status || error?.response?.status || (error instanceof AppError ? error.status : 500); // Use error.status for AppError
      console.error(`[ApiClient] Final error fetching guild roster for ${guildNameSlug}-${realmSlug} (${region}) (Status: ${statusCode}):`, error);
      throw new AppError(`Failed to fetch guild roster: ${error.message || String(error)}`, statusCode, {
        code: 'BATTLE_NET_API_ERROR',
        details: { realmSlug, guildNameSlug, region }
      });
    }
  }

   /**
   * Fetches enhanced character data from the Battle.net API, handling rate limiting and retries.
   * Assumes 404s are handled by battleNetService returning null, not throwing an error that needs retry.
   * @param realmSlug The slug of the realm.
   * @param characterNameLower The lowercase name of the character.
   * @param region The region of the character.
   * @returns {Promise<any | null>} The enhanced character data, or null if not found (e.g., 404). // TODO: Add specific type
   * @throws {AppError} If the API call fails for reasons other than not found, after potential retries.
   */
  async getEnhancedCharacterData(realmSlug: string, characterNameLower: string, region: BattleNetRegion): Promise<any | null> {
    const token = await this.ensureClientToken();
    // Define the task function
    const task = () => battleNetService.getEnhancedCharacterData(realmSlug, characterNameLower, token, region);

    try {
      // Schedule the task
      // Note: If battleNetService throws on 404, the retry logic might need adjustment
      // to specifically ignore retrying 404s within scheduleWithRetry.
      // Currently assumes 404 results in `null` return from battleNetService, which won't trigger the catch here.
      const result = await this.scheduleWithRetry(task);
      return result; // Could be data or null (if 404 handled by service)
    } catch (error: any) {
      // Handle final error (non-404, or retry failure)
      const statusCode = error?.status || error?.response?.status || (error instanceof AppError ? error.status : 500); // Use error.status for AppError

      // Avoid throwing an error if the service layer correctly identified a 404 and threw it (adjust if needed)
      // This check might be redundant if battleNetService returns null for 404s as intended.
      if (statusCode === 404) {
         console.log(`[ApiClient] Character not found (404) for ${characterNameLower}-${realmSlug} (${region}). Returning null.`);
         return null;
      }

      console.error(`[ApiClient] Final error fetching character data for ${characterNameLower}-${realmSlug} (${region}) (Status: ${statusCode}):`, error);
      throw new AppError(`Failed to fetch character data: ${error.message || String(error)}`, statusCode, {
        code: 'BATTLE_NET_API_ERROR',
        details: { realmSlug, characterNameLower, region }
      });
    }
  }
}

// Export a singleton instance if desired, or handle instantiation elsewhere
// export const battleNetApiClient = new BattleNetApiClient();