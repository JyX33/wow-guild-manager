import * as battleNetService from './battlenet.service';
import { AppError } from '../utils/error-handler';
import { BattleNetRegion } from '../../../shared/types/user'; // Corrected import path

/**
 * Interface for the Battle.net client credentials token response.
 * TODO: Potentially move this to a shared types file if used elsewhere.
 */
interface ClientCredentialsTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  sub?: string; // Optional, depending on Battle.net response
}

/**
 * A client responsible for interacting with the Battle.net API,
 * handling authentication and data fetching.
 */
export class BattleNetApiClient {
  private apiClientToken: string | null = null;
  private tokenExpiry: Date | null = null;

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
          // Removed originalError as it's not a property of AppError options
          // The error message is included above, and stack trace is captured.
        });
      }
    }

    // Throw if token is still null after attempting fetch/refresh
    // This should theoretically not happen if getClientCredentialsToken throws on failure,
    // but it's a safeguard.
    if (!this.apiClientToken) {
      throw new AppError('API token is null after fetch attempt', 500, { code: 'BATTLE_NET_AUTH_ERROR' });
    }

    return this.apiClientToken;
  }

  // --- Methods for API data fetching will be added here ---

  /**
   * Fetches guild data from the Battle.net API.
   * @param realmSlug The slug of the realm.
   * @param guildNameSlug The slugified name of the guild.
   * @param region The region of the guild.
   * @returns {Promise<any>} The guild data. // TODO: Add specific type
   * @throws {AppError} If the API call fails.
   */
  async getGuildData(realmSlug: string, guildNameSlug: string, region: BattleNetRegion): Promise<any> {
    const token = await this.ensureClientToken();
    try {
      // Assuming battleNetService.getGuildData handles the actual API call structure
      const guildData = await battleNetService.getGuildData(realmSlug, guildNameSlug, token, region);
      return guildData;
    } catch (error) {
      console.error(`[ApiClient] Error fetching guild data for ${guildNameSlug}-${realmSlug} (${region}):`, error);
      throw new AppError(`Failed to fetch guild data: ${error instanceof Error ? error.message : String(error)}`, 500, {
        code: 'BATTLE_NET_API_ERROR',
        details: { realmSlug, guildNameSlug, region }
      });
    }
  }

  /**
   * Fetches guild roster from the Battle.net API.
   * @param region The region of the guild.
   * @param realmSlug The slug of the realm.
   * @param guildNameSlug The slugified name of the guild.
   * @returns {Promise<any>} The guild roster data. // TODO: Add specific type (BattleNetGuildRoster)
   * @throws {AppError} If the API call fails.
   */
  async getGuildRoster(region: BattleNetRegion, realmSlug: string, guildNameSlug: string): Promise<any> {
    const token = await this.ensureClientToken();
     try {
      const rosterData = await battleNetService.getGuildRoster(region, realmSlug, guildNameSlug, token);
      return rosterData;
    } catch (error) {
      console.error(`[ApiClient] Error fetching guild roster for ${guildNameSlug}-${realmSlug} (${region}):`, error);
      throw new AppError(`Failed to fetch guild roster: ${error instanceof Error ? error.message : String(error)}`, 500, {
        code: 'BATTLE_NET_API_ERROR',
        details: { realmSlug, guildNameSlug, region }
      });
    }
  }

   /**
   * Fetches enhanced character data (profile, equipment, etc.) from the Battle.net API.
   * @param realmSlug The slug of the realm.
   * @param characterNameLower The lowercase name of the character.
   * @param region The region of the character.
   * @returns {Promise<any | null>} The enhanced character data, or null if not found (e.g., 404). // TODO: Add specific type
   * @throws {AppError} If the API call fails for reasons other than not found.
   */
  async getEnhancedCharacterData(realmSlug: string, characterNameLower: string, region: BattleNetRegion): Promise<any | null> {
    const token = await this.ensureClientToken();
    try {
       // Assuming battleNetService.getEnhancedCharacterData handles the actual API call
       // and returns null specifically for 404 errors, throwing for others.
      const characterData = await battleNetService.getEnhancedCharacterData(realmSlug, characterNameLower, token, region);
      return characterData;
    } catch (error) {
       // We re-throw non-404 errors, assuming the service layer distinguishes them.
       // If the service layer doesn't return null on 404, this logic needs adjustment.
       console.error(`[ApiClient] Error fetching character data for ${characterNameLower}-${realmSlug} (${region}):`, error);
       throw new AppError(`Failed to fetch character data: ${error instanceof Error ? error.message : String(error)}`, 500, {
         code: 'BATTLE_NET_API_ERROR',
         details: { realmSlug, characterNameLower, region }
       });
    }
  }
}

// Export a singleton instance if desired, or handle instantiation elsewhere
// export const battleNetApiClient = new BattleNetApiClient();