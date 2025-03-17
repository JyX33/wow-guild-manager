import axios from 'axios';
import config from '../config';
import { AppError } from '../utils/error-handler';
import { BattleNetUserProfile } from '../../../shared/types/user';

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

class BattleNetService {
  /**
   * Get WoW profile data for a user
   */
  async getWowProfile(region: string, accessToken: string): Promise<any> {
    try {
      const regionConfig = config.battlenet.regions[region] || config.battlenet.regions.eu;
      
      const response = await axios.get(`${regionConfig.apiBaseUrl}/profile/user/wow`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Battlenet-Namespace': `profile-${region}`
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

  /**
   * Get guild members from Battle.net API
   */
  async getGuildMembers(region: string, realm: string, guildName: string, accessToken: string) {
    try {
      const regionConfig = config.battlenet.regions[region] || config.battlenet.regions.eu;
      
      const response = await axios.get(
        `${regionConfig.apiBaseUrl}/data/wow/guild/${encodeURIComponent(realm.toLowerCase())}/${encodeURIComponent(guildName.toLowerCase())}/roster`,
        {
          params: {
            namespace: `profile-${region}`,
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

  /**
   * Validate an access token with Battle.net
   */
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
}

export default new BattleNetService();