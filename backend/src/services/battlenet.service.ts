import axios from 'axios';
import PQueue from 'p-queue';
import { BattleNetUserProfile, BattleNetRegion, BattleNetWoWProfile } from '../../../shared/types/user';
import {
  BattleNetGuild,
  BattleNetGuildRoster,
  BattleNetCharacter,
  BattleNetCharacterEquipment,
  BattleNetMythicKeystoneProfile,
  BattleNetProfessions
} from '../../../shared/types/guild';
import { TokenResponse } from '../../../shared/types/auth'; // Added import
import config from '../config';
import { AppError } from '../utils/error-handler';
import logger from '../utils/logger'; // Import the logger

class RateLimitRetryError extends Error {
  constructor() {
    super('RATE_LIMIT_RETRY');
    this.name = 'RateLimitRetryError';
  }
}

interface APIMetrics {
  lastRequest: Date;
  requestsLastMinute: number;
  errorCount: number;
  queueSize: number;
}

// TokenResponse interface moved to shared/types/auth.ts

// BattleNetRegion is now imported from shared types

class BattleNetService {
  private rateLimiter: PQueue;
  private metrics: APIMetrics;

  constructor() {
    // Initialize rate limiter with 98 req/sec (buffer of 2 for safety)
    this.rateLimiter = new PQueue({
      interval: 1000,
      intervalCap: 98,
      carryoverConcurrencyCount: true
    });

    this.metrics = {
      lastRequest: new Date(),
      requestsLastMinute: 0,
      errorCount: 0,
      queueSize: 0
    };

    // Monitor queue metrics
    this.rateLimiter.on('active', () => {
      this.metrics.queueSize = this.rateLimiter.pending;
      this.metrics.lastRequest = new Date();
      this.metrics.requestsLastMinute++;

      // Reset requests counter every minute
      setTimeout(() => {
        this.metrics.requestsLastMinute--;
      }, 60000);
    });

    this.rateLimiter.on('error', (error) => { // Added error parameter
      this.metrics.errorCount++;
      // Check if the error is an Axios error and specifically a 404
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        // Log 404s caught by the queue handler at DEBUG level, as they are expected to be handled by the calling function.
        logger.debug({ err: error }, '[BattleNetService] Axios 404 caught by queue handler (handled by caller).');
      } else {
        // Log all other errors caught by the queue handler as ERROR, as they might be unexpected.
        logger.error({ err: error }, '[BattleNetService] Unhandled rate limiter/queue error event.');
      }
    });
  }

  // Helper method to wrap API calls with rate limiting
  private async rateLimit<T>(operation: () => Promise<T>): Promise<T> {
    const executeOperation = async (): Promise<T> => {
      try {
        return await operation();
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 429) {
          const retryAfter = parseInt(error.response.headers['retry-after'] || '1000', 10);
          logger.warn({ retryAfter, url: error.config?.url }, `[BattleNetService] Rate limit hit (429). Retrying after ${retryAfter}ms.`);
          await new Promise(resolve => setTimeout(resolve, retryAfter));
          throw new RateLimitRetryError();
        }
        throw error;
      }
    };

    try {
      return await this.rateLimiter.add(executeOperation) as Promise<T>;
    } catch (error) {
      if (error instanceof RateLimitRetryError) {
        // This path should ideally not be hit frequently if retry logic above works,
        // but log it if it does occur.
        logger.warn('[BattleNetService] Retrying operation after RateLimitRetryError.');
        return this.rateLimit(operation);
      }
      throw error;
    }
  }

  private validateRegion(region: string): BattleNetRegion {
    if (region in config.battlenet.regions) {
      return region as BattleNetRegion;
    }
    logger.warn({ providedRegion: region, fallbackRegion: 'eu' }, '[BattleNetService] Invalid region provided, falling back to EU.');
    return 'eu';
  }

  async getWowCharacter(region: string, realm: string, character: string, accessToken: string): Promise<BattleNetCharacter> {
    try {
      const validRegion = this.validateRegion(region);
      const regionConfig = config.battlenet.regions[validRegion];
      const realmSlug = realm.toLowerCase();
      const normalizedCharacter = character.toLowerCase();
      const url = `${regionConfig.apiBaseUrl}/profile/wow/character/${realmSlug}/${encodeURIComponent(normalizedCharacter)}`;
      logger.debug({ region: validRegion, realmSlug, character: normalizedCharacter, url }, '[BattleNetService] Fetching character data.');
      const response = await axios.get(url, {
        params: {
          namespace: `profile-${validRegion}`,
          locale: 'en_US'
        },
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error({ err: error, status: error.response?.status, data: error.response?.data, character, realm, region }, `[BattleNetService] WoW character profile error`);
        throw new AppError(
          `Battle.net WoW profile error: ${error.response?.data?.detail || error.message}`,
          error.response?.status || 500
        );
      }
      logger.error({ err: error, character, realm, region }, `[BattleNetService] WoW character profile error (non-Axios)`);
      throw new AppError(`Battle.net WoW profile error: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }

  async getWowProfile(region: string, accessToken: string): Promise<BattleNetWoWProfile> {
    try {
      const validRegion = this.validateRegion(region);
      const regionConfig = config.battlenet.regions[validRegion];
      const url = `${regionConfig.apiBaseUrl}/profile/user/wow`;
      logger.debug({ region: validRegion, url }, '[BattleNetService] Fetching WoW profile.');

      const response = await axios.get(url, {
        params: {
          namespace: `profile-${validRegion}`,
          locale: 'en_US'
        },
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error({ err: error, status: error.response?.status, data: error.response?.data, region }, `[BattleNetService] WoW profile error`);
        throw new AppError(
          `Battle.net WoW profile error: ${error.response?.data?.detail || error.message}`,
          error.response?.status || 500
        );
      }
      logger.error({ err: error, region }, `[BattleNetService] WoW profile error (non-Axios)`);
      throw new AppError(`Battle.net WoW profile error: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }

  async getGuildRoster(region: string, realm: string, guildName: string, accessToken: string): Promise<BattleNetGuildRoster> {
    try {
      const validRegion = this.validateRegion(region);
      const regionConfig = config.battlenet.regions[validRegion];

      // Get connected realm ID first
      const realmSlug = realm.toLowerCase();
      const normalizedGuildName = guildName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const url = `${regionConfig.apiBaseUrl}/data/wow/guild/${realmSlug}/${encodeURIComponent(normalizedGuildName)}/roster`;
      logger.debug({ region: validRegion, realmSlug, guildName: normalizedGuildName, url }, '[BattleNetService] Fetching guild roster.');

      const response = await axios.get(
        url,
        {
          params: {
            namespace: `profile-${validRegion}`,
            locale: 'en_US'
          },
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error({ err: error, status: error.response?.status, data: error.response?.data, guildName, realm, region }, `[BattleNetService] Guild roster error`);
        throw new AppError(
          `Battle.net guild roster error: ${error.response?.data?.detail || error.message}`,
          error.response?.status || 500
        );
      }
      logger.error({ err: error, guildName, realm, region }, `[BattleNetService] Guild roster error (non-Axios)`);
      throw new AppError(`Battle.net guild roster error: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }

  // Keeping this method for backward compatibility
  async getGuildMembers(region: string, realm: string, guildName: string, accessToken: string) {
    logger.warn({ region, realm, guildName }, '[BattleNetService] getGuildMembers called (deprecated, use getGuildRoster)');
    return this.getGuildRoster(region, realm, guildName, accessToken);
  }

  async getGuildData(realm: string, guildName: string, accessToken: string, region: string = 'eu'): Promise<BattleNetGuild> {
    try {
      const validRegion = this.validateRegion(region);
      const regionConfig = config.battlenet.regions[validRegion];

      const normalizedGuildName = guildName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const url = `${regionConfig.apiBaseUrl}/data/wow/guild/${realm.toLowerCase()}/${encodeURIComponent(normalizedGuildName)}`;
      logger.debug({ region: validRegion, realm: realm.toLowerCase(), guildName: normalizedGuildName, url }, '[BattleNetService] Fetching guild data.');
      const response = await axios.get(
        url,
        {
          params: {
            namespace: `profile-${validRegion}`,
            locale: 'en_US'
          },
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error({ err: error, status: error.response?.status, data: error.response?.data, guildName, realm, region }, `[BattleNetService] Guild data error`);
        throw new AppError(
          `Failed to fetch guild data: ${error.response?.data?.detail || error.message}`,
          error.response?.status || 500
        );
      }
      logger.error({ err: error, guildName, realm, region }, `[BattleNetService] Guild data error (non-Axios)`);
      throw new AppError(
        `Failed to fetch guild data: ${error instanceof Error ? error.message : String(error)}`,
        500,
        {
          code: 'API_ERROR',
          details: error instanceof Error ? error.stack : undefined
        }
      );
    }
  }

  async getEnhancedCharacterData(realm: string, characterName: string, accessToken: string, region: string = 'eu'): Promise<BattleNetCharacter & {
    equipment: BattleNetCharacterEquipment;
    itemLevel: number;
    mythicKeystone: BattleNetMythicKeystoneProfile | null;
    professions: BattleNetProfessions['primaries'];
  } | null> { // Allow returning null if character fetch fails (e.g., 404)
    try {
      const validRegion = this.validateRegion(region);
      const regionConfig = config.battlenet.regions[validRegion];
      const normalizedRealm = realm.toLowerCase();
      const normalizedCharacter = characterName.toLowerCase();
      logger.debug({ region: validRegion, realm: normalizedRealm, character: normalizedCharacter }, '[BattleNetService] Fetching enhanced character data.');

      const [profile, equipment, mythicKeystone, professions] = await Promise.all([
        // Get character profile
        this.rateLimit(async () => {
          const url = `${regionConfig.apiBaseUrl}/profile/wow/character/${encodeURIComponent(normalizedRealm)}/${encodeURIComponent(normalizedCharacter)}`;
          logger.debug({ url, subCall: 'profile' }, '[BattleNetService] Fetching sub-data: profile');
          const response = await axios.get(
            url,
            {
              params: {
                namespace: `profile-${validRegion}`,
                locale: 'en_US'
              },
              headers: {
                Authorization: `Bearer ${accessToken}`
              }
            }
          );
          return response.data;
        }),

        // Get equipment data
        this.rateLimit(async () => {
          const url = `${regionConfig.apiBaseUrl}/profile/wow/character/${encodeURIComponent(normalizedRealm)}/${encodeURIComponent(normalizedCharacter)}/equipment`;
          logger.debug({ url, subCall: 'equipment' }, '[BattleNetService] Fetching sub-data: equipment');
          const response = await axios.get(
            url,
            {
              params: {
                namespace: `profile-${validRegion}`,
                locale: 'en_US'
              },
              headers: {
                Authorization: `Bearer ${accessToken}`
              }
            }
          );
          return response.data;
        }),

        // Get mythic keystone profile
        this.rateLimit(async () => {
          const url = `${regionConfig.apiBaseUrl}/profile/wow/character/${encodeURIComponent(normalizedRealm)}/${encodeURIComponent(normalizedCharacter)}/mythic-keystone-profile`;
          logger.debug({ url, subCall: 'mythicKeystone' }, '[BattleNetService] Fetching sub-data: mythicKeystone');
          try {
            const response = await axios.get(
              url,
              {
                params: {
                  namespace: `profile-${validRegion}`,
                  locale: 'en_US'
                },
                headers: {
                  Authorization: `Bearer ${accessToken}`
                }
              }
            );
            return response.data;
          } catch (mythicError) {
            // Log M+ profile fetch errors specifically if needed, but return null
            if (axios.isAxiosError(mythicError) && mythicError.response?.status !== 404) {
               logger.warn({ err: mythicError, status: mythicError.response?.status, character: normalizedCharacter, realm: normalizedRealm }, '[BattleNetService] Error fetching mythic keystone profile (non-404), returning null.');
            } else if (!axios.isAxiosError(mythicError)) {
               logger.warn({ err: mythicError, character: normalizedCharacter, realm: normalizedRealm }, '[BattleNetService] Non-Axios error fetching mythic keystone profile, returning null.');
            }
            return null;
          }
        }),

        // Get character professions
        this.rateLimit(async () => {
          const url = `${regionConfig.apiBaseUrl}/profile/wow/character/${encodeURIComponent(normalizedRealm)}/${encodeURIComponent(normalizedCharacter)}/professions`;
          logger.debug({ url, subCall: 'professions' }, '[BattleNetService] Fetching sub-data: professions');
          try {
            const response = await axios.get(
              url,
              {
                params: {
                  namespace: `profile-${validRegion}`,
                  locale: 'en_US'
                },
                headers: {
                  Authorization: `Bearer ${accessToken}`
                }
              }
            );
            return response.data;
          } catch (profError) {
             // Log profession fetch errors specifically if needed, but return empty
             if (axios.isAxiosError(profError) && profError.response?.status !== 404) {
               logger.warn({ err: profError, status: profError.response?.status, character: normalizedCharacter, realm: normalizedRealm }, '[BattleNetService] Error fetching professions (non-404), returning empty.');
            } else if (!axios.isAxiosError(profError)) {
               logger.warn({ err: profError, character: normalizedCharacter, realm: normalizedRealm }, '[BattleNetService] Non-Axios error fetching professions, returning empty.');
            }
            return { primaries: [] };
          }
        })
      ]);

      // Return combined enhanced data
      return {
        ...profile,
        equipment,
        itemLevel: profile.equipped_item_level,
        mythicKeystone,
        professions: professions.primaries || []
      };
    } catch (error) {
      // Check if it's a 404 error specifically (likely from the main profile call)
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        // Log a warning instead of throwing an error for 404s (character likely inactive/not found)
        logger.warn({ characterName, realm, region, status: 404 }, `[BattleNetService] Character ${characterName} on ${realm} not found (404). Skipping enhanced data fetch.`);
        // Return null to indicate failure without stopping the whole sync
        return null;
      }

      // Handle other Axios errors
      if (axios.isAxiosError(error)) {
        logger.error({ err: error, status: error.response?.status, data: error.response?.data, characterName, realm, region }, `[BattleNetService] Enhanced character data error`);
        throw new AppError(
          `Failed to fetch enhanced character data for ${characterName} on ${realm}: ${error.response?.data?.detail || error.message}`,
          error.response?.status || 500
        );
      }

      // Handle non-Axios errors
      logger.error({ err: error, characterName, realm, region }, `[BattleNetService] Enhanced character data error (non-Axios)`);
      throw new AppError(
        `Failed to fetch enhanced character data for ${characterName} on ${realm}: ${error instanceof Error ? error.message : String(error)}`,
        500,
        {
          code: 'API_ERROR',
          details: error instanceof Error ? error.stack : undefined
        }
      );
    }
  }

  async validateToken(accessToken: string): Promise<boolean> {
    try {
      logger.debug('[BattleNetService] Validating token.');
      await axios.get('https://oauth.battle.net/oauth/check_token', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      logger.info('[BattleNetService] Token validation successful.');
      return true;
    } catch (error) {
      logger.warn({ err: error }, '[BattleNetService] Token validation failed.');
      return false;
    }
  }

  /**
   * Generate Battle.net OAuth authorization URL
   */
  async getAuthorizationUrl(region: string, state: string): Promise<string> {
    const validRegion = this.validateRegion(region);
    const regionConfig = config.battlenet.regions[validRegion];
    logger.debug({ region: validRegion, state }, '[BattleNetService] Generating authorization URL.');

    // Generate URL with OAuth parameters
    return `${regionConfig.authBaseUrl}/authorize?` +
      `client_id=${encodeURIComponent(config.battlenet.clientId)}` +
      `&scope=${encodeURIComponent('offline_access wow.profile')}` +
      `&state=${encodeURIComponent(state)}` +
      `&redirect_uri=${encodeURIComponent(config.battlenet.redirectUri)}` +
      `&response_type=code`;
  }

  /**
   * Exchange authorization code for access token
   */
  async getAccessToken(region: string, code: string): Promise<TokenResponse> {
    try {
      const validRegion = this.validateRegion(region);
      const regionConfig = config.battlenet.regions[validRegion];
      logger.debug({ region: validRegion }, '[BattleNetService] Exchanging authorization code for access token.');

      const response = await axios.post<TokenResponse>(
        `${regionConfig.authBaseUrl}/token`,
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: config.battlenet.redirectUri
        }),
        {
          auth: {
            username: config.battlenet.clientId,
            password: config.battlenet.clientSecret
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      logger.info({ region: validRegion }, '[BattleNetService] Access token obtained successfully.');
      logger.debug({ tokenResponse: response.data }, '[BattleNetService] Raw token response received.');
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error({ err: error, status: error.response?.status, data: error.response?.data, region }, `[BattleNetService] Access token exchange error`);
        throw new AppError(
          `Battle.net token error: ${error.response?.data?.error_description || error.message}`,
          error.response?.status || 500
        );
      }
      logger.error({ err: error, region }, `[BattleNetService] Access token exchange error (non-Axios)`);
      throw new AppError(`Battle.net token error: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }

  /**
   * Refresh an expired access token using a refresh token
   */
  async refreshAccessToken(region: string, refreshToken: string): Promise<TokenResponse> {
    try {
      const validRegion = this.validateRegion(region);
      const regionConfig = config.battlenet.regions[validRegion];
      logger.debug({ region: validRegion }, '[BattleNetService] Refreshing access token.');

      const response = await axios.post<TokenResponse>(
        `${regionConfig.authBaseUrl}/token`,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        }),
        {
          auth: {
            username: config.battlenet.clientId,
            password: config.battlenet.clientSecret
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      logger.info({ region: validRegion }, '[BattleNetService] Access token refreshed successfully.');
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error({ err: error, status: error.response?.status, data: error.response?.data, region }, `[BattleNetService] Token refresh error`);
        throw new AppError(
          `Battle.net token refresh error: ${error.response?.data?.error_description || error.message}`,
          error.response?.status || 500
        );
      }
      logger.error({ err: error, region }, `[BattleNetService] Token refresh error (non-Axios)`);
      throw new AppError(`Battle.net token refresh error: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }

  /**
   * Get user information from Battle.net
   */
  async getUserInfo(_region: string, accessToken: string): Promise<BattleNetUserProfile> {
    // Region is not needed for userinfo endpoint
    try {
      logger.debug('[BattleNetService] Fetching user info.');
      const response = await axios.get<BattleNetUserProfile>('https://oauth.battle.net/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      logger.info({ battletag: response.data.battletag, userId: response.data.id }, '[BattleNetService] User info fetched successfully.');
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error({ err: error, status: error.response?.status, data: error.response?.data }, `[BattleNetService] User info error`);
        throw new AppError(
          `Battle.net user info error: ${error.response?.data?.error_description || error.message}`,
          error.response?.status || 500
        );
      }
      logger.error({ err: error }, `[BattleNetService] User info error (non-Axios)`);
      throw new AppError(`Battle.net user info error: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }


  /**
   * Get an access token using the client credentials grant type.
   * Assumes a default region if none is provided.
   */
  async getClientCredentialsToken(region: string = 'eu'): Promise<TokenResponse> {
    try {
      const validRegion = this.validateRegion(region);
      const regionConfig = config.battlenet.regions[validRegion];
      logger.debug({ region: validRegion }, '[BattleNetService] Obtaining client credentials token.');

      const response = await axios.post<TokenResponse>(
        `${regionConfig.authBaseUrl}/token`,
        new URLSearchParams({
          grant_type: 'client_credentials'
        }),
        {
          auth: {
            username: config.battlenet.clientId,
            password: config.battlenet.clientSecret
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      logger.info({ region: validRegion }, '[BattleNetService] Client credentials token obtained successfully.');
      // Client credentials tokens typically don't include refresh tokens
      // Adjust TokenResponse if needed or handle potential missing fields
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error({ err: error, status: error.response?.status, data: error.response?.data, region }, `[BattleNetService] Client credentials token error`);
        throw new AppError(
          `Battle.net client credentials token error: ${error.response?.data?.error_description || error.message}`,
          error.response?.status || 500
        );
      }
      logger.error({ err: error, region }, `[BattleNetService] Client credentials token error (non-Axios)`);
      throw new AppError(`Battle.net client credentials token error: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }


}

const battleNetService = new BattleNetService();

export const getWowCharacter = battleNetService.getWowCharacter.bind(battleNetService);
export const getWowProfile = battleNetService.getWowProfile.bind(battleNetService);
export const getGuildRoster = battleNetService.getGuildRoster.bind(battleNetService);
export const getGuildMembers = battleNetService.getGuildMembers.bind(battleNetService);
export const getGuildData = battleNetService.getGuildData.bind(battleNetService);
export const getEnhancedCharacterData = battleNetService.getEnhancedCharacterData.bind(battleNetService);
export const validateToken = battleNetService.validateToken.bind(battleNetService);
export const getAuthorizationUrl = battleNetService.getAuthorizationUrl.bind(battleNetService);
export const getAccessToken = battleNetService.getAccessToken.bind(battleNetService);
export const refreshAccessToken = battleNetService.refreshAccessToken.bind(battleNetService);
export const getUserInfo = battleNetService.getUserInfo.bind(battleNetService);

export const getClientCredentialsToken = battleNetService.getClientCredentialsToken.bind(battleNetService);
export default battleNetService;
