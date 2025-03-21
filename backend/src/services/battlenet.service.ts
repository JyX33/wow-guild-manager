import axios from 'axios';
import { BattleNetUserProfile } from '../../../shared/types/user';
import config from '../config';
import { AppError } from '../utils/error-handler';

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

type BattleNetRegion = 'eu' | 'us' | 'kr' | 'tw';

class BattleNetService {
  private validateRegion(region: string): BattleNetRegion {
    if (region in config.battlenet.regions) {
      return region as BattleNetRegion;
    }
    return 'eu';
  }

  /**
   * Get connected realm ID from realm slug
   */
  private async getConnectedRealmId(region: string, realmSlug: string, accessToken: string): Promise<number> {
    const validRegion = this.validateRegion(region);
    const regionConfig = config.battlenet.regions[validRegion] || config.battlenet.regions.eu;
    
    try {
      const response = await axios.get(
        `${regionConfig.apiBaseUrl}/data/wow/search/connected-realm`,
        {
          params: {
            namespace: `dynamic-${validRegion}`,
            'realms.slug': realmSlug,
            locale: 'en_US'
          },
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );
      if (response.data.results && response.data.results.length > 0) {
        // Extract the ID from the href
        const href = response.data.results[0].data.id;
        return parseInt(href);
      }

      throw new AppError(`Connected realm not found for slug: ${realmSlug}`, 404);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new AppError(
          `Failed to get connected realm ID: ${error.response?.data?.detail || error.message}`,
          error.response?.status || 500
        );
      }
      throw error;
    }
  }

  async getWowProfile(region: string, accessToken: string): Promise<any> {
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

  async getGuildMembers(region: string, realm: string, guildName: string, accessToken: string) {
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
          `Battle.net guild members error: ${error.response?.data?.detail || error.message}`,
          error.response?.status || 500
        );
      }
      throw new AppError(`Battle.net guild members error: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }

  async getGuildData(realm: string, guildName: string, accessToken: string, region: string = 'eu') {
    try {
      const validRegion = this.validateRegion(region);
      const regionConfig = config.battlenet.regions[validRegion];
      
      // Get connected realm ID first
      const connectedRealmId = await this.getConnectedRealmId(region, realm.toLowerCase(), accessToken);
      const normalizedGuildName = guildName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      
      const response = await axios.get(
        `${regionConfig.apiBaseUrl}/data/wow/guild/${connectedRealmId}/${encodeURIComponent(normalizedGuildName)}`,
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
      throw error;
    }
  }

  async getEnhancedCharacterData(realm: string, characterName: string, accessToken: string, region: string = 'eu') {
    try {
      const validRegion = this.validateRegion(region);
      const regionConfig = config.battlenet.regions[validRegion];
      const normalizedRealm = realm.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const normalizedCharacter = characterName.toLowerCase();

      // Get character profile
      const profileResponse = await axios.get(
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

      // Get equipment data for item level
      const equipmentResponse = await axios.get(
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

      // Get mythic keystone profile (catch error as not all characters have M+ data)
      const mythicResponse = await axios.get(
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
      ).catch(() => ({ data: null }));

      // Get character professions (catch error as not all characters have professions)
      const professionsResponse = await axios.get(
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
      ).catch(() => ({ data: { primaries: [] } }));

      // Return combined enhanced data
      return {
        ...profileResponse.data,
        equipment: equipmentResponse.data,
        itemLevel: profileResponse.data.equipped_item_level,
        mythicKeystone: mythicResponse?.data,
        professions: professionsResponse.data.primaries || []
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new AppError(
          `Failed to fetch enhanced character data: ${error.response?.data?.detail || error.message}`,
          error.response?.status || 500
        );
      }
      throw error;
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
    const regionConfig = config.battlenet.regions[region] || config.battlenet.regions.eu;
    
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
      const regionConfig = config.battlenet.regions[region] || config.battlenet.regions.eu;
      
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
      const regionConfig = config.battlenet.regions[region] || config.battlenet.regions.eu;
      
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
  async getUserInfo(region: string, accessToken: string): Promise<BattleNetUserProfile> {
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

 
}

export default new BattleNetService();
