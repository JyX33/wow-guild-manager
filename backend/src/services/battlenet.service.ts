import axios from 'axios';
import config from '../../config/default';

class BattleNetService {
  async getAuthorizationUrl(region: string, state: string) {
    const regionConfig = config.battlenet.regions[region] || config.battlenet.regions.eu;
    
    // Make sure all parameters are properly separated with &
    return `${regionConfig.authBaseUrl}/authorize?` + 
    `client_id=${encodeURIComponent(config.battlenet.clientId)}` +
    `&scope=${encodeURIComponent('wow.profile')}` +
    `&state=${encodeURIComponent(state)}` +
    `&redirect_uri=${encodeURIComponent(config.battlenet.redirectUri)}` +
    `&response_type=code`;
}

  async getAccessToken(region: string, code: string) {
    const regionConfig = config.battlenet.regions[region] || config.battlenet.regions.eu;
    
    const response = await axios.post(
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
  }

  async getUserInfo(region: string, accessToken: string) {
    const response = await axios.get('https://oauth.battle.net/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    
    return response.data;
  }

  async getGuildMembers(region: string, realm: string, guildName: string, accessToken: string) {
    const regionConfig = config.battlenet.regions[region] || config.battlenet.regions.eu;
    
    const response = await axios.get(
      `${regionConfig.apiBaseUrl}/data/wow/guild/${realm}/${guildName}/roster`,
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
  }
}

export default new BattleNetService();