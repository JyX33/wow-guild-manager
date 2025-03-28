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

    this.rateLimiter.on('error', () => {
      this.metrics.errorCount++;
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
        return this.rateLimit(operation);
      }
      throw error;
    }
  }

  private validateRegion(region: string): BattleNetRegion {
    if (region in config.battlenet.regions) {
      return region as BattleNetRegion;
    }
    return 'eu';
  }  

  async getWowCharacter(region: string, realm: string, character: string, accessToken: string): Promise<BattleNetCharacter> {
    try {
      const validRegion = this.validateRegion(region);
      const regionConfig = config.battlenet.regions[validRegion];
      const realmSlug = realm.toLowerCase();
      const normalizedCharacter = character.toLowerCase();
      console.log('Fetching character data for:', { region, realm, character, accessToken, realmSlug, normalizedCharacter });
      const response = await axios.get(`${regionConfig.apiBaseUrl}/profile/wow/character/${realmSlug}/${encodeURIComponent(normalizedCharacter)}`, {
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
        throw new AppError(
          `Battle.net WoW profile error: ${error.response?.data?.detail || error.message}`,
          error.response?.status || 500
        );
      }
      throw new AppError(`Battle.net WoW profile error: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }

  async getWowProfile(region: string, accessToken: string): Promise<BattleNetWoWProfile> {
    try {
      const validRegion = this.validateRegion(region);
      const regionConfig = config.battlenet.regions[validRegion];
      
      const response = await axios.get(`${regionConfig.apiBaseUrl}/profile/user/wow`, {
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
        throw new AppError(
          `Battle.net WoW profile error: ${error.response?.data?.detail || error.message}`,
          error.response?.status || 500
        );
      }
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
      
      const response = await axios.get(
        `${regionConfig.apiBaseUrl}/data/wow/guild/${realmSlug}/${encodeURIComponent(normalizedGuildName)}/roster`,
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
        throw new AppError(
          `Battle.net guild roster error: ${error.response?.data?.detail || error.message}`,
          error.response?.status || 500
        );
      }
      throw new AppError(`Battle.net guild roster error: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
  
  // Keeping this method for backward compatibility
  async getGuildMembers(region: string, realm: string, guildName: string, accessToken: string) {
    return this.getGuildRoster(region, realm, guildName, accessToken);
  }

  async getGuildData(realm: string, guildName: string, accessToken: string, region: string = 'eu'): Promise<BattleNetGuild> {
    try {
      const validRegion = this.validateRegion(region);
      const regionConfig = config.battlenet.regions[validRegion];      
    
      const normalizedGuildName = guildName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      console.log('Fetching guild data for:', { region, realm, guildName, accessToken, normalizedGuildName });
      const response = await axios.get(
        `${regionConfig.apiBaseUrl}/data/wow/guild/${realm.toLowerCase()}/${encodeURIComponent(normalizedGuildName)}`,
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
        throw new AppError(
          `Failed to fetch guild data: ${error.response?.data?.detail || error.message}`,
          error.response?.status || 500
        );
      }
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

      const [profile, equipment, mythicKeystone, professions] = await Promise.all([
        // Get character profile
        this.rateLimit(async () => {
          const response = await axios.get(
            `${regionConfig.apiBaseUrl}/profile/wow/character/${encodeURIComponent(normalizedRealm)}/${encodeURIComponent(normalizedCharacter)}`,
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
          const response = await axios.get(
            `${regionConfig.apiBaseUrl}/profile/wow/character/${encodeURIComponent(normalizedRealm)}/${encodeURIComponent(normalizedCharacter)}/equipment`,
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
          try {
            const response = await axios.get(
              `${regionConfig.apiBaseUrl}/profile/wow/character/${encodeURIComponent(normalizedRealm)}/${encodeURIComponent(normalizedCharacter)}/mythic-keystone-profile`,
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
          } catch {
            return null;
          }
        }),

        // Get character professions
        this.rateLimit(async () => {
          try {
            const response = await axios.get(
              `${regionConfig.apiBaseUrl}/profile/wow/character/${encodeURIComponent(normalizedRealm)}/${encodeURIComponent(normalizedCharacter)}/professions`,
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
          } catch {
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
      // Check if it's a 404 error specifically
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        // Log a warning instead of throwing an error for 404s (character likely inactive/not found)
        // Use function parameters characterName and realm here
        console.warn(`[BattleNetService] Character ${characterName} on ${realm} not found (404). Skipping enhanced data fetch.`);
        // Return null to indicate failure without stopping the whole sync
        return null;
      }

      // Handle other Axios errors
      if (axios.isAxiosError(error)) {
        throw new AppError(
          `Failed to fetch enhanced character data for ${characterName} on ${realm}: ${error.response?.data?.detail || error.message}`,
          error.response?.status || 500
        );
      }

      // Handle non-Axios errors
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
      await axios.get('https://oauth.battle.net/oauth/check_token', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate Battle.net OAuth authorization URL
   */
  async getAuthorizationUrl(region: string, state: string): Promise<string> {
    const validRegion = this.validateRegion(region);
    const regionConfig = config.battlenet.regions[validRegion];
    
    // Generate URL with OAuth parameters
    return `${regionConfig.authBaseUrl}/authorize?` + 
      `client_id=${encodeURIComponent(config.battlenet.clientId)}` +
      `&scope=${encodeURIComponent('wow.profile')}` +
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
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new AppError(
          `Battle.net token error: ${error.response?.data?.error_description || error.message}`,
          error.response?.status || 500
        );
      }
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
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new AppError(
          `Battle.net token refresh error: ${error.response?.data?.error_description || error.message}`,
          error.response?.status || 500
        );
      }
      throw new AppError(`Battle.net token refresh error: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }

  /**
   * Get user information from Battle.net
   */
  async getUserInfo(_region: string, accessToken: string): Promise<BattleNetUserProfile> {
    try {
      const response = await axios.get<BattleNetUserProfile>('https://oauth.battle.net/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new AppError(
          `Battle.net user info error: ${error.response?.data?.error_description || error.message}`,
          error.response?.status || 500
        );
      }
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

      // Client credentials tokens typically don't include refresh tokens
      // Adjust TokenResponse if needed or handle potential missing fields
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new AppError(
          `Battle.net client credentials token error: ${error.response?.data?.error_description || error.message}`,
          error.response?.status || 500
        );
      }
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
