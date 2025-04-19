// backend/src/services/battlenet-api.client.ts
import { AppError } from '../utils/error-handler.js';
import { BattleNetGuild, BattleNetGuildRoster, BattleNetCharacter, BattleNetCharacterEquipment, BattleNetMythicKeystoneProfile, BattleNetProfessions } from '../../../shared/types/guild.js';
import { TokenResponse } from '../../../shared/types/auth.js';
import config from '../config/index.js';
import { BattleNetRegion, BattleNetUserProfile, BattleNetWoWProfile } from '../../../shared/types/user.js';
import Bottleneck from 'bottleneck';
import logger from '../utils/logger.js';
import axios, { AxiosBasicCredentials } from 'axios';

// --- Rate Limiter Configuration ---
const BNET_MAX_CONCURRENT = parseInt(process.env.BNET_MAX_CONCURRENT || '20', 10);
const BNET_MIN_TIME_MS = parseInt(process.env.BNET_MIN_TIME_MS || '10', 10);

logger.info(`[ApiClient] Initializing Bottleneck with maxConcurrent: ${BNET_MAX_CONCURRENT}, minTime: ${BNET_MIN_TIME_MS}ms`);

export class BattleNetApiClient {
  private apiClientToken: string | null = null;
  private tokenExpiry: Date | null = null;

  // Initialize the rate limiter instance
  private limiter = new Bottleneck({
    reservoir: 36000,
    reservoirRefreshAmount: 36000,
    reservoirRefreshInterval: 3600 * 1000,
    maxConcurrent: BNET_MAX_CONCURRENT,
    minTime: BNET_MIN_TIME_MS,
  });

  constructor() {
    this.limiter.on('error', (error) => {
      logger.error({ err: error }, '[ApiClient Limiter Error]');
    });
    this.limiter.on('failed', (error, jobInfo) => {
      logger.warn({ err: error, jobId: jobInfo.options.id }, `[ApiClient Limiter Failed] Job ${jobInfo.options.id} failed`);
    });
    this.limiter.on('executing', (jobInfo) => {
      logger.info({ jobId: jobInfo.options.id, running: this.limiter.running() }, `[ApiClient Limiter Executing] Job ${jobInfo.options.id} started.`);
    });
    this.limiter.on('done', (jobInfo) => {
      logger.info({ jobId: jobInfo.options.id, running: this.limiter.running() }, `[ApiClient Limiter Done] Job ${jobInfo.options.id} finished.`);
    });
  }

  /**
   * Validates the provided region string against the configuration.
   */
  private _validateRegion(region: string): BattleNetRegion {
    if (region in config.battlenet.regions) {
      return region as BattleNetRegion;
    }
    logger.warn({ providedRegion: region, fallbackRegion: 'eu' }, '[ApiClient] Invalid region provided, falling back to EU.');
    return 'eu';
  }

  /**
   * Performs the actual Axios GET request.
   */
  private async _doAxiosGet<T = any>(url: string, accessToken: string, params?: Record<string, any>): Promise<T> {
    const response = await axios.get<T>(url, {
      params,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Accept-Encoding': 'gzip,deflate,compress',
      },
      timeout: 15000,
    });
    return response.data;
  }

  /**
   * Performs the actual Axios POST request.
   */
  private async _doAxiosPost<T = any>(url: string, data: any, auth?: { username: string; password?: string | undefined }, headers?: Record<string, any>): Promise<T> {
    const response = await axios.post(url, data, {
      auth: auth as AxiosBasicCredentials | undefined,
      headers,
      timeout: 15000,
    });
    return response.data;
  }

  /**
   * Schedules a task using the limiter with retry logic for 429 errors.
   */
  private async scheduleWithRetry<T>(jobId: string, taskFn: () => Promise<T>, maxRetries: number = 3): Promise<T> {
    let attempts = 0;

    while (attempts <= maxRetries) {
      try {
        const result = await this.limiter.schedule({ id: `${jobId}-attempt-${attempts}` }, taskFn);
        return result;
      } catch (error: any) {
        attempts++;
        const isAxiosError = axios.isAxiosError(error);
        const statusCode = isAxiosError ? error.response?.status : undefined;
        const url = isAxiosError ? error.config?.url : undefined;

        if (isAxiosError && statusCode === 429 && attempts <= maxRetries) {
          let retryAfterMs = 1000;
          const retryAfterHeader = error.response?.headers?.['retry-after'];
          
          if (retryAfterHeader) {
            const retryAfterSeconds = parseInt(retryAfterHeader, 10);
            if (!isNaN(retryAfterSeconds) && retryAfterSeconds > 0) {
              retryAfterMs = retryAfterSeconds * 1000;
            } else {
              const retryDate = Date.parse(retryAfterHeader);
              if (!isNaN(retryDate)) {
                retryAfterMs = Math.max(0, retryDate - Date.now());
              }
            }
          }

          const waitTime = retryAfterMs + 100;
          logger.warn(
            { jobId, attempt: attempts, maxRetries, waitTimeMs: waitTime, url },
            `[ApiClient] Rate limit hit (429) for job ${jobId}. Attempt ${attempts}/${maxRetries}. Retrying after ${waitTime}ms...`
          );
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;

        } else if (isAxiosError && statusCode === 404) {
          logger.warn(
            { jobId, attempt: attempts, url, status: 404 },
            `[ApiClient] Not Found (404) encountered for job ${jobId} on attempt ${attempts}. Throwing for upstream handling.`
          );
          throw error;

        } else {
          const logReason = attempts > maxRetries ? 'Retries exhausted' : 'Non-retryable error';
          logger.error(
            {
              err: {
                message: error.message,
                code: error.code,
                status: statusCode,
                url: url,
                method: isAxiosError ? error.config?.method : undefined,
              },
              jobId,
              attempt: attempts,
              maxRetries
            },
            `[ApiClient] ${logReason} for job ${jobId} on attempt ${attempts}. Throwing.`
          );
          throw error;
        }
      }
    }
    throw new Error(`[ApiClient] Job ${jobId} failed after ${maxRetries} retries.`);
  }

  /**
   * Ensures a valid client credentials token is available and returns it.
   */
  public async ensureClientToken(): Promise<string> {
    const now = new Date();
    if (!this.apiClientToken || !this.tokenExpiry || this.tokenExpiry <= new Date(now.getTime() + 60 * 1000)) {
      try {
        const validRegion = this._validateRegion('eu');
        const tokenResponse = await this._fetchClientCredentialsToken(validRegion);

        if (!tokenResponse?.access_token || !tokenResponse?.expires_in) {
          throw new Error('Invalid token response received from Battle.net service.');
        }

        this.apiClientToken = tokenResponse.access_token;
        this.tokenExpiry = new Date(now.getTime() + tokenResponse.expires_in * 1000);
        
        logger.info(`[ApiClient] Client Credentials Token refreshed. Expires at: ${this.tokenExpiry.toISOString()}`);
      } catch (error) {
        this.apiClientToken = null;
        this.tokenExpiry = null;
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error({ err: error }, `[ApiClient] Failed to obtain/refresh token: ${errorMessage}`);
        throw new AppError(`Failed to get API token: ${errorMessage}`, 500, {
          code: 'BATTLE_NET_AUTH_ERROR'
        });
      }
    }

    if (!this.apiClientToken) {
      throw new AppError('API token is null after fetch attempt', 500, { code: 'BATTLE_NET_AUTH_ERROR' });
    }

    return this.apiClientToken;
  }

  // API Methods

  private async _fetchClientCredentialsToken(region: BattleNetRegion): Promise<TokenResponse> {
    const { clientId, clientSecret } = config.battlenet;
    if (!clientId || !clientSecret) {
      throw new AppError('Battle.net Client ID or Secret is not configured.', 500, { code: 'CONFIG_ERROR' });
    }

    const regionConfig = config.battlenet.regions[region];
    const url = `${regionConfig.authBaseUrl}/token`;
    
    return this._doAxiosPost<TokenResponse>(
      url,
      new URLSearchParams({ grant_type: 'client_credentials' }),
      { username: clientId, password: clientSecret },
      { 'Content-Type': 'application/x-www-form-urlencoded' }
    );
  }

  private async _fetchCharacterProfile(region: BattleNetRegion, realmSlug: string, characterNameLower: string, accessToken: string): Promise<BattleNetCharacter> {
    const regionConfig = config.battlenet.regions[region];
    const url = `${regionConfig.apiBaseUrl}/profile/wow/character/${encodeURIComponent(realmSlug)}/${encodeURIComponent(characterNameLower)}`;
    return this._doAxiosGet<BattleNetCharacter>(url, accessToken, {
      namespace: `profile-${region}`,
      locale: 'en_US'
    });
  }

  private async _fetchCharacterEquipment(region: BattleNetRegion, realmSlug: string, characterNameLower: string, accessToken: string): Promise<BattleNetCharacterEquipment> {
    const regionConfig = config.battlenet.regions[region];
    const url = `${regionConfig.apiBaseUrl}/profile/wow/character/${encodeURIComponent(realmSlug)}/${encodeURIComponent(characterNameLower)}/equipment`;
    return this._doAxiosGet<BattleNetCharacterEquipment>(url, accessToken, {
      namespace: `profile-${region}`,
      locale: 'en_US'
    });
  }

  private async _fetchCharacterMythicKeystone(region: BattleNetRegion, realmSlug: string, characterNameLower: string, accessToken: string): Promise<BattleNetMythicKeystoneProfile | null> {
    const regionConfig = config.battlenet.regions[region];
    const url = `${regionConfig.apiBaseUrl}/profile/wow/character/${encodeURIComponent(realmSlug)}/${encodeURIComponent(characterNameLower)}/mythic-keystone-profile`;
    return this._doAxiosGet<BattleNetMythicKeystoneProfile>(url, accessToken, {
      namespace: `profile-${region}`,
      locale: 'en_US'
    });
  }

  private async _fetchCharacterProfessions(region: BattleNetRegion, realmSlug: string, characterNameLower: string, accessToken: string): Promise<BattleNetProfessions> {
    const regionConfig = config.battlenet.regions[region];
    const url = `${regionConfig.apiBaseUrl}/profile/wow/character/${encodeURIComponent(realmSlug)}/${encodeURIComponent(characterNameLower)}/professions`;
    return this._doAxiosGet<BattleNetProfessions>(url, accessToken, {
      namespace: `profile-${region}`,
      locale: 'en_US'
    });
  }

  // Public API Methods

  async getGuildData(realmSlug: string, guildNameSlug: string, region: BattleNetRegion): Promise<BattleNetGuild> {
    const validRegion = this._validateRegion(region);
    const token = await this.ensureClientToken();
    const jobId = `guild-${validRegion}-${realmSlug}-${guildNameSlug}`;
    
    try {
      return await this.scheduleWithRetry(jobId, () => {
        const regionConfig = config.battlenet.regions[validRegion];
        const url = `${regionConfig.apiBaseUrl}/data/wow/guild/${realmSlug}/${encodeURIComponent(guildNameSlug)}`;
        return this._doAxiosGet<BattleNetGuild>(url, token, {
          namespace: `profile-${validRegion}`,
          locale: 'en_US'
        });
      });
    } catch (error: any) {
      const statusCode = error?.status || error?.response?.status || (error instanceof AppError ? error.status : 500);
      throw new AppError(`Failed to fetch guild data: ${error.message || String(error)}`, statusCode, {
        code: 'BATTLE_NET_API_ERROR',
        details: { realmSlug, guildNameSlug, region: validRegion, jobId }
      });
    }
  }

  async getGuildRoster(region: BattleNetRegion, realmSlug: string, guildNameSlug: string): Promise<BattleNetGuildRoster> {
    const validRegion = this._validateRegion(region);
    const token = await this.ensureClientToken();
    const jobId = `roster-${validRegion}-${realmSlug}-${guildNameSlug}`;
    
    try {
      return await this.scheduleWithRetry(jobId, () => {
        const regionConfig = config.battlenet.regions[validRegion];
        const url = `${regionConfig.apiBaseUrl}/data/wow/guild/${realmSlug}/${encodeURIComponent(guildNameSlug)}/roster`;
        return this._doAxiosGet<BattleNetGuildRoster>(url, token, {
          namespace: `profile-${validRegion}`,
          locale: 'en_US'
        });
      });
    } catch (error: any) {
      const statusCode = error?.status || error?.response?.status || (error instanceof AppError ? error.status : 500);
      throw new AppError(`Failed to fetch guild roster: ${error.message || String(error)}`, statusCode, {
        code: 'BATTLE_NET_API_ERROR',
        details: { realmSlug, guildNameSlug, region: validRegion, jobId }
      });
    }
  }

  async getEnhancedCharacterData(realmSlug: string, characterNameLower: string, region: BattleNetRegion): Promise<(BattleNetCharacter & {
    equipment: BattleNetCharacterEquipment;
    itemLevel: number;
    mythicKeystone: BattleNetMythicKeystoneProfile | null;
    professions: BattleNetProfessions;
  }) | null> {
    const validRegion = this._validateRegion(region);
    const token = await this.ensureClientToken();
    const baseJobId = `char-${validRegion}-${realmSlug}-${characterNameLower}`;

    // Define default empty professions structure for 404 case
    const defaultProfessions: BattleNetProfessions = {
      _links: { self: { href: '' } },
      character: { key: { href: '' }, name: characterNameLower, id: 0, realm: { key: { href: '' }, name: realmSlug, id: 0, slug: realmSlug } },
      primaries: [],
      secondaries: []
    };

    try {
      const results = await Promise.allSettled([
        this.scheduleWithRetry(`${baseJobId}-profile`, () => this._fetchCharacterProfile(validRegion, realmSlug, characterNameLower, token)),
        this.scheduleWithRetry(`${baseJobId}-equipment`, () => this._fetchCharacterEquipment(validRegion, realmSlug, characterNameLower, token)),
        this.scheduleWithRetry(`${baseJobId}-mythic`, () => this._fetchCharacterMythicKeystone(validRegion, realmSlug, characterNameLower, token)),
        this.scheduleWithRetry(`${baseJobId}-professions`, () => this._fetchCharacterProfessions(validRegion, realmSlug, characterNameLower, token)),
      ]);

      const [profileResult, equipmentResult, mythicKeystoneResult, professionsResult] = results;

      if (profileResult.status === 'rejected') {
        if (axios.isAxiosError(profileResult.reason) && profileResult.reason.response?.status === 404) {
          return null;
        }
        throw profileResult.reason;
      }

      if (equipmentResult.status === 'rejected') {
        throw equipmentResult.reason;
      }

      const profile = profileResult.value;
      const equipment = equipmentResult.value;
      
      let mythicKeystone: BattleNetMythicKeystoneProfile | null = null;
      if (mythicKeystoneResult.status === 'fulfilled') {
        mythicKeystone = mythicKeystoneResult.value;
      } else if (!(axios.isAxiosError(mythicKeystoneResult.reason) && mythicKeystoneResult.reason.response?.status === 404)) {
        throw mythicKeystoneResult.reason;
      }

      let professions = defaultProfessions;
      if (professionsResult.status === 'fulfilled') {
        professions = professionsResult.value;
      } else if (!(axios.isAxiosError(professionsResult.reason) && professionsResult.reason.response?.status === 404)) {
        throw professionsResult.reason;
      }

      return {
        ...profile,
        equipment,
        itemLevel: profile?.equipped_item_level || 0,
        mythicKeystone,
        professions,
      };

    } catch (error: any) {
      const statusCode = error?.status || error?.response?.status || (error instanceof AppError ? error.status : 500);
      throw new AppError(`Failed to fetch enhanced character data: ${error.message || String(error)}`, statusCode, {
        code: 'BATTLE_NET_API_ERROR',
        details: { realmSlug, characterNameLower, region: validRegion, baseJobId }
      });
    }
  }

  async getCharacterCollectionsIndex(realmSlug: string, characterNameLower: string, region: BattleNetRegion): Promise<any> {
    const validRegion = this._validateRegion(region);
    const token = await this.ensureClientToken();
    const jobId = `char-collections-${validRegion}-${realmSlug}-${characterNameLower}`;
    
    try {
      const regionConfig = config.battlenet.regions[validRegion];
      const url = `${regionConfig.apiBaseUrl}/profile/wow/character/${encodeURIComponent(realmSlug)}/${encodeURIComponent(characterNameLower)}/collections`;
      return await this.scheduleWithRetry(jobId, () => this._doAxiosGet(url, token, {
        namespace: `profile-${validRegion}`,
        locale: 'en_US'
      }));
    } catch (error: any) {
      const statusCode = error?.status || error?.response?.status || (error instanceof AppError ? error.status : 500);
      throw new AppError(`Failed to fetch collections index: ${error.message || String(error)}`, statusCode, {
        code: 'BATTLE_NET_API_ERROR',
        details: { realmSlug, characterNameLower, region: validRegion, jobId }
      });
    }
  }

  async getGenericBattleNetData<T = any>(url: string, jobId: string): Promise<T> {
    const token = await this.ensureClientToken();
    
    try {
      return await this.scheduleWithRetry(jobId, () => this._doAxiosGet(url, token));
    } catch (error: any) {
      const statusCode = error?.status || error?.response?.status || (error instanceof AppError ? error.status : 500);
      throw new AppError(`Failed to fetch generic data: ${error.message || String(error)}`, statusCode, {
        code: 'BATTLE_NET_API_ERROR',
        details: { url, jobId }
      });
    }
  }

  /**
   * Constructs the Battle.net OAuth2 authorization URL.
   */
  public getAuthorizationUrl(region: BattleNetRegion, state: string, redirectUri?: string): string {
    const validRegion = this._validateRegion(region);
    const regionConfig = config.battlenet.regions[validRegion];

    if (!regionConfig || !regionConfig.authBaseUrl) {
      throw new AppError(`Configuration for region ${region} is incomplete or missing authBaseUrl.`, 500, { code: 'CONFIG_ERROR' });
    }

    if (!config.battlenet.clientId || !config.battlenet.redirectUri || !config.battlenet.scopes) {
       throw new AppError('Battle.net client configuration (clientId, redirectUri, or scopes) is incomplete.', 500, { code: 'CONFIG_ERROR' });
    }

    const authUrl = new URL(`${regionConfig.authBaseUrl}/authorize`);
    authUrl.searchParams.append('client_id', config.battlenet.clientId);
    authUrl.searchParams.append('redirect_uri', redirectUri || config.battlenet.redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', config.battlenet.scopes.join(' '));
    authUrl.searchParams.append('state', state);

    return authUrl.toString();
  }

  /**
   * Exchanges an authorization code for an access token.
   */
  public async getAccessToken(region: BattleNetRegion, code: string): Promise<TokenResponse> {
    const validRegion = this._validateRegion(region);
    const regionConfig = config.battlenet.regions[validRegion];

    if (!regionConfig || !regionConfig.authBaseUrl) {
      throw new AppError(`Configuration for region ${region} is incomplete or missing authBaseUrl.`, 500, { code: 'CONFIG_ERROR' });
    }

    if (!config.battlenet.clientId || !config.battlenet.clientSecret || !config.battlenet.redirectUri) {
       throw new AppError('Battle.net client configuration (clientId, clientSecret, or redirectUri) is incomplete.', 500, { code: 'CONFIG_ERROR' });
    }

    const url = `${regionConfig.authBaseUrl}/token`;
    try {
      return await this._doAxiosPost<TokenResponse>(
        url,
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: config.battlenet.redirectUri,
        }),
        { username: config.battlenet.clientId, password: config.battlenet.clientSecret },
        { 'Content-Type': 'application/x-www-form-urlencoded' }
      );
    } catch (error: any) {
       const statusCode = error?.response?.status || 500;
       const errorMessage = error?.response?.data?.error_description || error.message || String(error);
       logger.error({ err: error, region, code }, `[ApiClient] Failed to get access token: ${errorMessage}`);
       throw new AppError(`Failed to get access token: ${errorMessage}`, statusCode, { code: 'BATTLE_NET_AUTH_ERROR' });
    }
  }

  /**
   * Retrieves the Battle.net user profile information.
   */
  public async getUserInfo(region: BattleNetRegion, accessToken: string): Promise<BattleNetUserProfile> {
    const validRegion = this._validateRegion(region);
    const regionConfig = config.battlenet.regions[validRegion];

    if (!regionConfig || !regionConfig.userInfoUrl) {
      throw new AppError(`Configuration for region ${region} is incomplete or missing userInfoUrl.`, 500, { code: 'CONFIG_ERROR' });
    }

    const url = regionConfig.userInfoUrl;

    try {
      return await this._doAxiosGet<BattleNetUserProfile>(url, accessToken);
    } catch (error: any) {
      const statusCode = error?.response?.status || 500;
      const errorMessage = error?.response?.data?.error_description || error.message || String(error);
      logger.error({ err: error, region }, `[ApiClient] Failed to get user info: ${errorMessage}`);
      throw new AppError(`Failed to get user info: ${errorMessage}`, statusCode, { code: 'BATTLE_NET_API_ERROR' });
    }

  }

  /**
   * Retrieves the Battle.net WoW profile information for a user.
   */
  public async getWowProfile(region: BattleNetRegion, accessToken: string): Promise<BattleNetWoWProfile> {
    const validRegion = this._validateRegion(region);
    const regionConfig = config.battlenet.regions[validRegion];

    if (!regionConfig || !regionConfig.apiBaseUrl) {
      throw new AppError(`Configuration for region ${region} is incomplete or missing apiBaseUrl.`, 500, { code: 'CONFIG_ERROR' });
    }

    const url = `${regionConfig.apiBaseUrl}/profile/user/wow`;
    const params = { namespace: `profile-${validRegion}`, locale: 'en_US' };

    try {
      return await this._doAxiosGet<BattleNetWoWProfile>(url, accessToken, params);
    } catch (error: any) {
      const statusCode = error?.response?.status || 500;
      const errorMessage = error?.response?.data?.error_description || error.message || String(error);
      logger.error({ err: error, region }, `[ApiClient] Failed to fetch WoW profile: ${errorMessage}`);
      throw new AppError(`Failed to fetch WoW profile: ${errorMessage}`, statusCode, { code: 'BATTLE_NET_API_ERROR', details: { region: validRegion } });
    }
  }

}

