// backend/src/services/battlenet-api.client.ts
import { AppError } from '../utils/error-handler.js';
import { BattleNetGuild, BattleNetGuildRoster, BattleNetCharacter, BattleNetCharacterEquipment, BattleNetMythicKeystoneProfile, BattleNetProfessions } from '../../../shared/types/guild.js'; // Added
import { TokenResponse } from '../../../shared/types/auth.js'; // Added
import { BattleNetUserProfile, BattleNetWoWProfile } from '../../../shared/types/user.js'; // Added
import config from '../config/index.js'; // Added
import { BattleNetRegion } from '../../../shared/types/user.js'; // Corrected import path
import Bottleneck from 'bottleneck';
import logger from '../utils/logger.js';
import axios from 'axios'; // Import axios for error checking


// --- Rate Limiter Configuration ---
// Read settings from environment variables with defaults
const BNET_MAX_CONCURRENT = parseInt(process.env.BNET_MAX_CONCURRENT || '20', 10);
const BNET_MIN_TIME_MS = parseInt(process.env.BNET_MIN_TIME_MS || '10', 10); // ~100 requests/sec (1000ms / 10ms)

logger.info(`[ApiClient] Initializing Bottleneck with maxConcurrent: ${BNET_MAX_CONCURRENT}, minTime: ${BNET_MIN_TIME_MS}ms`);

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
      logger.error({ err: error }, '[ApiClient Limiter Error]');
    });
    this.limiter.on('failed', (error, jobInfo) => {
      // Use jobInfo.options.id which should now be set
      logger.warn({ err: error, jobId: jobInfo.options.id }, `[ApiClient Limiter Failed] Job ${jobInfo.options.id} failed`);
      // Note: 'failed' indicates an error during job execution *after* it was scheduled.
    });
     this.limiter.on('debug', (message, data) => {
       // logger.debug({ data }, `[ApiClient Limiter Debug] ${message}`); // Enable for verbose logging
     });
    this.limiter.on('received', (jobInfo) => {
      // logger.debug({ jobId: jobInfo.options.id, queued: this.limiter.queued() }, `[ApiClient Limiter Received] Job ${jobInfo.options.id} received.`); // Optional: More verbose
    });
    this.limiter.on('queued', (jobInfo) => {
      // logger.debug({ jobId: jobInfo.options.id, queued: this.limiter.queued() }, `[ApiClient Limiter Queued] Job ${jobInfo.options.id} queued.`); // Optional: More verbose
    });
    this.limiter.on('executing', (jobInfo) => {
      logger.info({ jobId: jobInfo.options.id, running: this.limiter.running() }, `[ApiClient Limiter Executing] Job ${jobInfo.options.id} started.`);
    });
    this.limiter.on('done', (jobInfo) => {
      logger.info({ jobId: jobInfo.options.id, running: this.limiter.running() }, `[ApiClient Limiter Done] Job ${jobInfo.options.id} finished.`);
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
      logger.info('[ApiClient] Obtaining/Refreshing Client Credentials Token...');
      try {
        // Call the internal fetch method directly for token acquisition
        const validRegion = this._validateRegion('eu'); // Assuming default EU for client creds, adjust if needed
        const tokenResponse = await this._fetchClientCredentialsToken(validRegion);

        if (!tokenResponse || !tokenResponse.access_token || !tokenResponse.expires_in) {
           throw new Error('Invalid token response received from Battle.net service.');
        }

        this.apiClientToken = tokenResponse.access_token;
        // Calculate expiry time based on 'expires_in' (seconds)
        this.tokenExpiry = new Date(now.getTime() + tokenResponse.expires_in * 1000);
        logger.info(`[ApiClient] Client Credentials Token obtained/refreshed. Expires at: ${this.tokenExpiry.toISOString()}`);

      } catch (error) {
        this.apiClientToken = null;
        this.tokenExpiry = null;
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error({ err: error }, `[ApiClient] Failed to obtain/refresh Client Credentials Token: ${errorMessage}`);
        // Wrap the original error for better context
        throw new AppError(`Failed to get API token: ${errorMessage}`, 500, {
          code: 'BATTLE_NET_AUTH_ERROR'
        });
      }
    }

    // Throw if token is still null after attempting fetch/refresh
    if (!this.apiClientToken) {
      // Log the error before throwing
      logger.error('[ApiClient] API token is null after fetch attempt');
      throw new AppError('API token is null after fetch attempt', 500, { code: 'BATTLE_NET_AUTH_ERROR' });
    }

    return this.apiClientToken;
  }

  /**
   * Schedules a task using the limiter with retry logic for 429 errors.
   * @template T The expected return type of the task.
   * @param jobId A unique identifier for the job being scheduled.
   * @param taskFn A function that returns a Promise resolving to T. This function performs the actual API call.
   * @returns {Promise<T>} The result of the task function.
   * @throws The error from the task function if it fails after potential retry.
   * @private
   */
  private async scheduleWithRetry<T>(jobId: string, taskFn: () => Promise<T>, maxRetries: number = 3): Promise<T> {
    let attempts = 0;

    while (attempts <= maxRetries) {
      try {
        // Wrap the task function in the limiter's schedule method for each attempt
        const result = await this.limiter.schedule({ id: `${jobId}-attempt-${attempts}` }, taskFn);
        return result;
      } catch (error: any) {
        attempts++;
        const isAxios429 = axios.isAxiosError(error) && error.response?.status === 429;

        if (isAxios429 && attempts <= maxRetries) {
          // Default retryAfter to 1 second (1000ms) if header is missing or invalid
          let retryAfterMs = 1000;
          const retryAfterHeader = error.response?.headers?.['retry-after'];

          if (retryAfterHeader) {
            const retryAfterSeconds = parseInt(retryAfterHeader, 10);
            if (!isNaN(retryAfterSeconds) && retryAfterSeconds > 0) {
              retryAfterMs = retryAfterSeconds * 1000;
            } else {
              // Handle potential date format in retry-after (less common for Battle.net?)
              const retryDate = Date.parse(retryAfterHeader);
              if (!isNaN(retryDate)) {
                retryAfterMs = Math.max(0, retryDate - Date.now());
              }
            }
          }

          // Add a small buffer (e.g., 100ms) to the wait time
          const waitTime = retryAfterMs + 100;

          logger.warn(
            { jobId, attempt: attempts, maxRetries, waitTimeMs: waitTime, url: error.config?.url },
            `[ApiClient] Rate limit hit (429) for job ${jobId}. Attempt ${attempts}/${maxRetries}. Retrying after ${waitTime}ms...`
          );
          await new Promise(resolve => setTimeout(resolve, waitTime));
          // Continue to the next iteration of the while loop for retry

        } else {
          // If it's not a 429 error, or if retries are exhausted, throw the error
          const statusCode = error?.status || error?.response?.status || (error instanceof AppError ? error.status : undefined);
          logger.error(
            { err: error, jobId, attempt: attempts, maxRetries, statusCode, isAxios429 },
            `[ApiClient] Non-retryable error or retries exhausted for job ${jobId} on attempt ${attempts}.`
          );
          throw error; // Re-throw the caught error
        }
      }
    }
    // This part should theoretically not be reached due to the throw in the catch block,
    // but typescript needs a return path or throw here.
    throw new Error(`[ApiClient] Job ${jobId} failed after ${maxRetries} retries.`);
  }

  // --- Helper Methods ---

  /**
   * Validates the provided region string against the configuration.
   * @param region The region string to validate.
   * @returns The validated BattleNetRegion or the default 'eu'.
   * @private
   */
  private _validateRegion(region: string): BattleNetRegion {
    if (region in config.battlenet.regions) {
      return region as BattleNetRegion;
    }
    logger.warn({ providedRegion: region, fallbackRegion: 'eu' }, '[ApiClient] Invalid region provided, falling back to EU.');
    return 'eu';
  }

  // --- Private Axios Call Implementations ---

  /**
   * Performs the actual Axios GET request.
   * @param url The URL to request.
   * @param accessToken The bearer token.
   * @param params Optional query parameters.
   * @returns Promise<any>
   * @private
   */
  private async _doAxiosGet<T = any>(url: string, accessToken: string, params?: Record<string, any>): Promise<T> {
    try {
      const response = await axios.get<T>(url, {
        params,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Accept-Encoding': 'gzip,deflate,compress', // Request compression
        },
        timeout: 15000, // Add a reasonable timeout (15 seconds)
      });
      return response.data;
    } catch (error) {
      // Throw the original Axios error for the retry logic to inspect
      if (axios.isAxiosError(error)) {
        // Log details before throwing
        logger.error({
          err: {
            message: error.message,
            code: error.code,
            status: error.response?.status,
            url: error.config?.url,
            method: error.config?.method,
            // data: error.response?.data // Avoid logging potentially large/sensitive response data by default
          }
        }, `[ApiClient] Axios GET error`);
      }
      throw error;
    }
  }

  /**
   * Performs the actual Axios POST request.
   * @param url The URL to request.
   * @param data The POST data.
   * @param auth Optional basic auth credentials.
   * @param headers Optional headers.
   * @returns Promise<any>
   * @private
   */
  // Further adjusted auth type to allow potentially undefined password matching Axios types more closely
  private async _doAxiosPost<T = any>(url: string, data: any, auth?: { username: string; password?: string | undefined }, headers?: Record<string, any>): Promise<T> {
    try {
      // Remove explicit <T> and cast auth
      const response = await axios.post(url, data, {
        auth: auth as axios.AxiosBasicCredentials | undefined,
        headers,
        timeout: 15000, // Add a reasonable timeout (15 seconds)
      });
      return response.data;
    } catch (error) {
      // Throw the original Axios error for the retry logic to inspect
      if (axios.isAxiosError(error)) {
        // Log details before throwing
        logger.error({
          err: {
            message: error.message,
            code: error.code,
            status: error.response?.status,
            url: error.config?.url,
            method: error.config?.method,
            // data: error.response?.data // Avoid logging potentially large/sensitive response data by default
          }
        }, `[ApiClient] Axios POST error`);
      }
      throw error;
    }
  }

  // --- Specific Endpoint Implementations (Private) ---

  private async _fetchGuildData(realmSlug: string, guildNameSlug: string, region: BattleNetRegion, accessToken: string): Promise<BattleNetGuild> {
    const regionConfig = config.battlenet.regions[region];
    const url = `${regionConfig.apiBaseUrl}/data/wow/guild/${realmSlug}/${encodeURIComponent(guildNameSlug)}`;
    logger.debug({ region, realmSlug, guildNameSlug, url }, '[ApiClient] Fetching guild data.');
    return this._doAxiosGet<BattleNetGuild>(url, accessToken, {
      namespace: `profile-${region}`,
      locale: 'en_US'
    });
  }

  private async _fetchGuildRoster(region: BattleNetRegion, realmSlug: string, guildNameSlug: string, accessToken: string): Promise<BattleNetGuildRoster> {
    const regionConfig = config.battlenet.regions[region];
    const url = `${regionConfig.apiBaseUrl}/data/wow/guild/${realmSlug}/${encodeURIComponent(guildNameSlug)}/roster`;
    logger.debug({ region, realmSlug, guildNameSlug, url }, '[ApiClient] Fetching guild roster.');
    return this._doAxiosGet<BattleNetGuildRoster>(url, accessToken, {
      namespace: `profile-${region}`,
      locale: 'en_US'
    });
  }

  private async _fetchCharacterProfile(region: BattleNetRegion, realmSlug: string, characterNameLower: string, accessToken: string): Promise<BattleNetCharacter> {
    const regionConfig = config.battlenet.regions[region];
    const url = `${regionConfig.apiBaseUrl}/profile/wow/character/${encodeURIComponent(realmSlug)}/${encodeURIComponent(characterNameLower)}`;
    logger.debug({ url, subCall: 'profile' }, '[ApiClient] Fetching sub-data: profile');
    return this._doAxiosGet<BattleNetCharacter>(url, accessToken, {
      namespace: `profile-${region}`,
      locale: 'en_US'
    });
  }

  private async _fetchCharacterEquipment(region: BattleNetRegion, realmSlug: string, characterNameLower: string, accessToken: string): Promise<BattleNetCharacterEquipment> {
    const regionConfig = config.battlenet.regions[region];
    const url = `${regionConfig.apiBaseUrl}/profile/wow/character/${encodeURIComponent(realmSlug)}/${encodeURIComponent(characterNameLower)}/equipment`;
    logger.debug({ url, subCall: 'equipment' }, '[ApiClient] Fetching sub-data: equipment');
    return this._doAxiosGet<BattleNetCharacterEquipment>(url, accessToken, {
      namespace: `profile-${region}`,
      locale: 'en_US'
    });
  }

  private async _fetchCharacterMythicKeystone(region: BattleNetRegion, realmSlug: string, characterNameLower: string, accessToken: string): Promise<BattleNetMythicKeystoneProfile | null> {
    const regionConfig = config.battlenet.regions[region];
    const url = `${regionConfig.apiBaseUrl}/profile/wow/character/${encodeURIComponent(realmSlug)}/${encodeURIComponent(characterNameLower)}/mythic-keystone-profile`;
    logger.debug({ url, subCall: 'mythicKeystone' }, '[ApiClient] Fetching sub-data: mythicKeystone');
    try {
      return await this._doAxiosGet<BattleNetMythicKeystoneProfile>(url, accessToken, {
        namespace: `profile-${region}`,
        locale: 'en_US'
      });
    } catch (mythicError) {
      if (axios.isAxiosError(mythicError) && mythicError.response?.status === 404) {
        // Expected if character has no M+ data
        logger.debug({ characterNameLower, realmSlug, region }, '[ApiClient] Mythic keystone profile not found (404), returning null.');
        return null;
      } else if (axios.isAxiosError(mythicError)) {
         logger.warn({ err: mythicError, status: mythicError.response?.status, character: characterNameLower, realm: realmSlug }, '[ApiClient] Error fetching mythic keystone profile (non-404), returning null.');
      } else {
         logger.warn({ err: mythicError, character: characterNameLower, realm: realmSlug }, '[ApiClient] Non-Axios error fetching mythic keystone profile, returning null.');
      }
      return null; // Return null on other errors too for resilience
    }
  }

  private async _fetchCharacterProfessions(region: BattleNetRegion, realmSlug: string, characterNameLower: string, accessToken: string): Promise<BattleNetProfessions> {
    const regionConfig = config.battlenet.regions[region];
    const url = `${regionConfig.apiBaseUrl}/profile/wow/character/${encodeURIComponent(realmSlug)}/${encodeURIComponent(characterNameLower)}/professions`;
    logger.debug({ url, subCall: 'professions' }, '[ApiClient] Fetching sub-data: professions');
    try {
      return await this._doAxiosGet<BattleNetProfessions>(url, accessToken, {
        namespace: `profile-${region}`,
        locale: 'en_US'
      });
    } catch (profError) {
      if (axios.isAxiosError(profError) && profError.response?.status === 404) {
        // Expected if character has no professions?
        logger.debug({ characterNameLower, realmSlug, region }, '[ApiClient] Professions not found (404), returning empty structure.');
        // Return structure matching BattleNetProfessions with empty arrays
        return {
          _links: { self: { href: '' } },
          character: { key: { href: '' }, name: characterNameLower, id: 0, realm: { key: { href: '' }, name: realmSlug, id: 0, slug: realmSlug } }, // Add minimal character info
          primaries: [],
          secondaries: []
        };
      } else if (axios.isAxiosError(profError)) {
         logger.warn({ err: profError, status: profError.response?.status, character: characterNameLower, realm: realmSlug }, '[ApiClient] Error fetching professions (non-404), returning empty.');
      } else {
         logger.warn({ err: profError, character: characterNameLower, realm: realmSlug }, '[ApiClient] Non-Axios error fetching professions, returning empty structure.');
      }
      // Return structure matching BattleNetProfessions with empty arrays
      return {
        _links: { self: { href: '' } },
        character: { key: { href: '' }, name: characterNameLower, id: 0, realm: { key: { href: '' }, name: realmSlug, id: 0, slug: realmSlug } }, // Add minimal character info
        primaries: [],
        secondaries: []
      };
    }
  }

  private async _fetchWowProfile(region: BattleNetRegion, accessToken: string): Promise<BattleNetWoWProfile> {
    const regionConfig = config.battlenet.regions[region];
    const url = `${regionConfig.apiBaseUrl}/profile/user/wow`;
    logger.debug({ region, url }, '[ApiClient] Fetching WoW profile.');
    return this._doAxiosGet<BattleNetWoWProfile>(url, accessToken, {
      namespace: `profile-${region}`,
      locale: 'en_US'
    });
  }

  private async _fetchClientCredentialsToken(region: BattleNetRegion): Promise<TokenResponse> {
    const { clientId, clientSecret } = config.battlenet;
    if (!clientId || !clientSecret) {
      throw new AppError('Battle.net Client ID or Secret is not configured.', 500, { code: 'CONFIG_ERROR' });
    }
    const regionConfig = config.battlenet.regions[region];
    const url = `${regionConfig.authBaseUrl}/token`;
    logger.debug({ region }, '[ApiClient] Obtaining client credentials token.');
    const response = await this._doAxiosPost<TokenResponse>(
      url,
      new URLSearchParams({ grant_type: 'client_credentials' }),
      // Pass validated credentials
      { username: clientId, password: clientSecret },
      { 'Content-Type': 'application/x-www-form-urlencoded' }
    );
    // Basic validation
    if (!response || !response.access_token || !response.expires_in) {
      throw new Error('Invalid token response received from Battle.net POST.');
    }
    return response;
  }

  private async _fetchAccessToken(region: BattleNetRegion, code: string): Promise<TokenResponse> {
    const { clientId, clientSecret, redirectUri } = config.battlenet;
    if (!clientId || !clientSecret || !redirectUri) {
      throw new AppError('Battle.net Client ID, Secret, or Redirect URI is not configured.', 500, { code: 'CONFIG_ERROR' });
    }
    const regionConfig = config.battlenet.regions[region];
    const url = `${regionConfig.authBaseUrl}/token`;
    logger.debug({ region }, '[ApiClient] Exchanging authorization code for access token.');
    const response = await this._doAxiosPost<TokenResponse>(
      url,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri
      }),
      // Pass validated credentials
      { username: clientId, password: clientSecret },
      { 'Content-Type': 'application/x-www-form-urlencoded' }
    );
    if (!response || !response.access_token || !response.expires_in) {
      throw new Error('Invalid token response received from Battle.net POST.');
    }
    return response;
  }

  private async _fetchRefreshedAccessToken(region: BattleNetRegion, refreshToken: string): Promise<TokenResponse> {
    const { clientId, clientSecret } = config.battlenet;
     if (!clientId || !clientSecret) {
      throw new AppError('Battle.net Client ID or Secret is not configured.', 500, { code: 'CONFIG_ERROR' });
    }
    const regionConfig = config.battlenet.regions[region];
    const url = `${regionConfig.authBaseUrl}/token`;
    logger.debug({ region }, '[ApiClient] Refreshing access token.');
    const response = await this._doAxiosPost<TokenResponse>(
      url,
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      }),
       // Pass validated credentials
      { username: clientId, password: clientSecret },
      { 'Content-Type': 'application/x-www-form-urlencoded' }
    );
    if (!response || !response.access_token || !response.expires_in) {
      throw new Error('Invalid token response received from Battle.net POST.');
    }
    return response;
  }

  private async _fetchUserInfo(accessToken: string): Promise<BattleNetUserProfile> {
    const url = 'https://oauth.battle.net/userinfo';
    logger.debug('[ApiClient] Fetching user info.');
    return this._doAxiosGet<BattleNetUserProfile>(url, accessToken);
  }

  private async _checkTokenValidation(accessToken: string): Promise<void> {
    // This endpoint doesn't return data on success, just 200 OK
    const url = 'https://oauth.battle.net/oauth/check_token';
    logger.debug('[ApiClient] Validating token.');
    await this._doAxiosGet<void>(url, accessToken);
  }

  // --- Public API Methods ---

  /**
   * Fetches guild data from the Battle.net API, handling rate limiting and retries.
   * @param realmSlug The slug of the realm.
   * @param guildNameSlug The slugified name of the guild.
   * @param region The region of the guild.
   * @returns {Promise<BattleNetGuild>} The guild data.
   * @throws {AppError} If the API call fails after potential retries.
   */
  async getGuildData(realmSlug: string, guildNameSlug: string, region: BattleNetRegion): Promise<BattleNetGuild> {
    const validRegion = this._validateRegion(region); // Validate region first
    const token = await this.ensureClientToken();
    const jobId = `guild-${validRegion}-${realmSlug}-${guildNameSlug}`;
    // Define the task using the internal fetch method
    const task = () => this._fetchGuildData(realmSlug, guildNameSlug, validRegion, token);

    try {
      return await this.scheduleWithRetry<BattleNetGuild>(jobId, task);
    } catch (error: any) {
      const statusCode = error?.status || error?.response?.status || (error instanceof AppError ? error.status : 500);
      logger.error({ err: error, jobId, statusCode, realmSlug, guildNameSlug, region: validRegion }, `[ApiClient] Final error fetching guild data for job ${jobId}.`);
      throw new AppError(`Failed to fetch guild data: ${error.message || String(error)}`, statusCode, {
        code: 'BATTLE_NET_API_ERROR',
        details: { realmSlug, guildNameSlug, region: validRegion, jobId }
      });
    }
  }

  /**
   * Fetches guild roster from the Battle.net API, handling rate limiting and retries.
   * @param region The region of the guild.
   * @param realmSlug The slug of the realm.
   * @param guildNameSlug The slugified name of the guild.
   * @returns {Promise<BattleNetGuildRoster>} The guild roster data.
   * @throws {AppError} If the API call fails after potential retries.
   */
  async getGuildRoster(region: BattleNetRegion, realmSlug: string, guildNameSlug: string): Promise<BattleNetGuildRoster> {
    const validRegion = this._validateRegion(region); // Validate region first
    const token = await this.ensureClientToken();
    const jobId = `roster-${validRegion}-${realmSlug}-${guildNameSlug}`;
     // Define the task using the internal fetch method
    const task = () => this._fetchGuildRoster(validRegion, realmSlug, guildNameSlug, token);

    try {
      return await this.scheduleWithRetry<BattleNetGuildRoster>(jobId, task);
    } catch (error: any) {
      const statusCode = error?.status || error?.response?.status || (error instanceof AppError ? error.status : 500);
      logger.error({ err: error, jobId, statusCode, realmSlug, guildNameSlug, region: validRegion }, `[ApiClient] Final error fetching guild roster for job ${jobId}.`);
      throw new AppError(`Failed to fetch guild roster: ${error.message || String(error)}`, statusCode, {
        code: 'BATTLE_NET_API_ERROR',
        details: { realmSlug, guildNameSlug, region: validRegion, jobId }
      });
    }
  }

   /**
   * Fetches enhanced character data from the Battle.net API, handling rate limiting and retries.
   * @param realmSlug The slug of the realm.
   * @param characterNameLower The lowercase name of the character.
   * @param region The region of the character.
   * @returns {Promise<(BattleNetCharacter & { equipment: BattleNetCharacterEquipment; itemLevel: number; mythicKeystone: BattleNetMythicKeystoneProfile | null; professions: BattleNetProfessions['primaries']; }) | null>} The enhanced character data, or null if not found (e.g., 404).
   * @throws {AppError} If the API call fails for reasons other than not found, after potential retries.
   */
  // Adjusted return type to include full professions object
  async getEnhancedCharacterData(realmSlug: string, characterNameLower: string, region: BattleNetRegion): Promise<(BattleNetCharacter & {
    equipment: BattleNetCharacterEquipment;
    itemLevel: number; // Add derived itemLevel
    mythicKeystone: BattleNetMythicKeystoneProfile | null;
    professions: BattleNetProfessions; // Expect full object now
  }) | null> {
    const validRegion = this._validateRegion(region);
    const token = await this.ensureClientToken();
    const baseJobId = `char-${validRegion}-${realmSlug}-${characterNameLower}`;

    try {
      // Fetch components in parallel, wrapped in retry logic
      const [profile, equipment, mythicKeystone, professions] = await Promise.all([
        this.scheduleWithRetry(`${baseJobId}-profile`, () => this._fetchCharacterProfile(validRegion, realmSlug, characterNameLower, token)),
        this.scheduleWithRetry(`${baseJobId}-equipment`, () => this._fetchCharacterEquipment(validRegion, realmSlug, characterNameLower, token)),
        this.scheduleWithRetry(`${baseJobId}-mythic`, () => this._fetchCharacterMythicKeystone(validRegion, realmSlug, characterNameLower, token)),
        this.scheduleWithRetry(`${baseJobId}-professions`, () => this._fetchCharacterProfessions(validRegion, realmSlug, characterNameLower, token)),
      ]);

      // If profile fetch failed (likely 404), return null early
      // Note: _fetchCharacterProfile should throw on non-404 errors, handled by scheduleWithRetry/catch block below
      if (!profile) {
         logger.warn({ jobId: `${baseJobId}-profile`, realmSlug, characterNameLower, region: validRegion }, `[ApiClient] Base profile fetch failed for character, cannot return enhanced data.`);
         return null;
      }

      // Combine results
      return {
        ...profile,
        equipment,
        // Corrected: equipment object doesn't have equipped_item_level directly
        itemLevel: profile?.equipped_item_level || 0,
        mythicKeystone, // Already handles null case internally
        professions: professions, // Return the full professions object
      };

    } catch (error: any) {
      // Handle final error from any of the parallel fetches after retries
      const statusCode = error?.status || error?.response?.status || (error instanceof AppError ? error.status : 500);

      // Check if it's a 404 from the profile fetch (which should be the only critical one)
      if (axios.isAxiosError(error) && statusCode === 404 && error.config?.url?.includes(`/profile/wow/character/${realmSlug}/${characterNameLower}`)) {
         logger.info({ jobId: `${baseJobId}-profile`, statusCode, realmSlug, characterNameLower, region: validRegion }, `[ApiClient] Character profile not found (404) for job ${baseJobId}. Returning null.`);
         return null; // Return null specifically for profile 404
      }

      // Log other final errors
      logger.error({ err: error, baseJobId, statusCode, realmSlug, characterNameLower, region: validRegion }, `[ApiClient] Final error fetching enhanced character data for job ${baseJobId}.`);
      throw new AppError(`Failed to fetch enhanced character data: ${error.message || String(error)}`, statusCode, {
        code: 'BATTLE_NET_API_ERROR',
        details: { realmSlug, characterNameLower, region: validRegion, baseJobId }
      });
    }
  }

  /**
   * Fetches the character collections index from the Battle.net API.
   * @param realmSlug The slug of the realm.
   * @param characterNameLower The lowercase name of the character.
   * @param region The region of the character.
   * @returns {Promise<any>} The collections index data (structure may vary).
   */
  async getCharacterCollectionsIndex(realmSlug: string, characterNameLower: string, region: BattleNetRegion): Promise<any> {
    const validRegion = this._validateRegion(region);
    const token = await this.ensureClientToken();
    const jobId = `char-collections-index-${validRegion}-${realmSlug}-${characterNameLower}`;
    const regionConfig = config.battlenet.regions[validRegion];
    const url = `${regionConfig.apiBaseUrl}/profile/wow/character/${encodeURIComponent(realmSlug)}/${encodeURIComponent(characterNameLower)}/collections`;

    const task = () => this._doAxiosGet<any>(url, token, {
      namespace: `profile-${validRegion}`,
      locale: 'en_US'
    });

    try {
      logger.info({ jobId, url }, `[ApiClient] Scheduling collections index fetch for job ${jobId}.`);
      return await this.scheduleWithRetry<any>(jobId, task);
    } catch (error: any) {
      const statusCode = error?.status || error?.response?.status || (error instanceof AppError ? error.status : 500);
      logger.error({ err: error, jobId, statusCode, realmSlug, characterNameLower, region: validRegion, url }, `[ApiClient] Final error fetching collections index for job ${jobId}.`);
      // Allow 404s to pass through as null/undefined might be expected? Or throw specific error?
      // For now, rethrow generic error. Handle 404 specifically in the calling service if needed.
      throw new AppError(`Failed to fetch character collections index: ${error.message || String(error)}`, statusCode, {
        code: 'BATTLE_NET_API_ERROR',
        details: { realmSlug, characterNameLower, region: validRegion, jobId, url }
      });
    }
  }

  /**
   * Fetches data from an arbitrary Battle.net API URL (e.g., from href links).
   * Assumes the URL is within the Battle.net API domain and requires the standard token.
   * @template T The expected type of the response data.
   * @param url The full URL to fetch.
   * @param jobId A unique identifier for logging/tracking this specific fetch.
   * @returns {Promise<T>} The fetched data.
   */
  async getGenericBattleNetData<T = any>(url: string, jobId: string): Promise<T> {
    const token = await this.ensureClientToken(); // Ensure token is valid

    // Basic validation: Ensure it looks like a Battle.net API URL
    if (!url || !url.includes('api.blizzard.com')) {
        logger.error({ url, jobId }, `[ApiClient] Invalid URL provided to getGenericBattleNetData.`);
        throw new AppError('Invalid URL for generic Battle.net data fetch.', 400);
    }

    // Extract namespace and locale from URL parameters if present, otherwise use defaults
    let namespace = 'profile-eu'; // Default namespace
    let locale = 'en_US'; // Default locale
    try {
        const urlParams = new URL(url).searchParams;
        namespace = urlParams.get('namespace') || namespace;
        locale = urlParams.get('locale') || locale;
    } catch (e) {
        logger.warn({ url, jobId }, `[ApiClient] Could not parse URL to extract namespace/locale for generic fetch. Using defaults.`);
    }

    // Remove namespace/locale from URL before passing to _doAxiosGet if they exist,
    // as _doAxiosGet adds them back via params.
    let baseUrl = url;
    try {
        const parsedUrl = new URL(url);
        parsedUrl.searchParams.delete('namespace');
        parsedUrl.searchParams.delete('locale');
        baseUrl = parsedUrl.toString();
    } catch(e) {
         logger.warn({ url, jobId }, `[ApiClient] Could not parse URL to remove namespace/locale for generic fetch.`);
    }


    const task = () => this._doAxiosGet<T>(baseUrl, token, { namespace, locale });

    try {
      logger.info({ jobId, url: baseUrl, namespace, locale }, `[ApiClient] Scheduling generic fetch for job ${jobId}.`);
      return await this.scheduleWithRetry<T>(jobId, task);
    } catch (error: any) {
      const statusCode = error?.status || error?.response?.status || (error instanceof AppError ? error.status : 500);
      logger.error({ err: error, jobId, statusCode, url: baseUrl }, `[ApiClient] Final error fetching generic data for job ${jobId}.`);
      throw new AppError(`Failed to fetch generic Battle.net data: ${error.message || String(error)}`, statusCode, {
        code: 'BATTLE_NET_API_ERROR',
        details: { url: baseUrl, jobId }
      });
    }
  }


  async getWowProfile(region: BattleNetRegion, accessToken: string): Promise<BattleNetWoWProfile> {
    const validRegion = this._validateRegion(region);
    const jobId = `wowprofile-${validRegion}-${accessToken.substring(0, 6)}`; // Use partial token for job ID
    const task = () => this._fetchWowProfile(validRegion, accessToken);
    try {
      return await this.scheduleWithRetry<BattleNetWoWProfile>(jobId, task);
    } catch (error: any) {
       const statusCode = error?.status || error?.response?.status || (error instanceof AppError ? error.status : 500);
       logger.error({ err: error, jobId, statusCode, region: validRegion }, `[ApiClient] Final error fetching WoW profile for job ${jobId}.`);
       throw new AppError(`Failed to fetch WoW profile: ${error.message || String(error)}`, statusCode, { code: 'BATTLE_NET_API_ERROR', details: { region: validRegion, jobId } });
    }
  }

  async getAccessToken(region: BattleNetRegion, code: string): Promise<TokenResponse> {
     const validRegion = this._validateRegion(region);
     const jobId = `gettoken-${validRegion}-${code.substring(0, 6)}`;
     // Don't use ensureClientToken here, this uses the authorization code grant
     const task = () => this._fetchAccessToken(validRegion, code);
     try {
       // Typically, token exchange shouldn't need retries on 429, but wrap anyway for consistency? Or call directly?
       // Calling directly for now, as rate limits on token endpoint are usually different/higher.
       // return await this.scheduleWithRetry<TokenResponse>(jobId, task);
       return await task(); // Call directly
     } catch (error: any) {
        const statusCode = error?.status || error?.response?.status || (error instanceof AppError ? error.status : 500);
        logger.error({ err: error, jobId, statusCode, region: validRegion }, `[ApiClient] Final error getting access token for job ${jobId}.`);
        throw new AppError(`Failed to get access token: ${error.message || String(error)}`, statusCode, { code: 'BATTLE_NET_AUTH_ERROR', details: { region: validRegion, jobId } });
     }
  }

  async refreshAccessToken(region: BattleNetRegion, refreshToken: string): Promise<TokenResponse> {
     const validRegion = this._validateRegion(region);
     const jobId = `refreshtoken-${validRegion}-${refreshToken.substring(0, 6)}`;
     const task = () => this._fetchRefreshedAccessToken(validRegion, refreshToken);
     try {
       // Call directly, similar reasoning to getAccessToken
       return await task();
     } catch (error: any) {
        const statusCode = error?.status || error?.response?.status || (error instanceof AppError ? error.status : 500);
        logger.error({ err: error, jobId, statusCode, region: validRegion }, `[ApiClient] Final error refreshing access token for job ${jobId}.`);
        // If refresh fails (e.g., invalid refresh token), specific error handling might be needed upstream
        throw new AppError(`Failed to refresh access token: ${error.message || String(error)}`, statusCode, { code: 'BATTLE_NET_AUTH_ERROR', details: { region: validRegion, jobId } });
     }
  }

   async getUserInfo(accessToken: string): Promise<BattleNetUserProfile> {
     // Region is not needed for userinfo endpoint
     const jobId = `userinfo-${accessToken.substring(0, 6)}`;
     const task = () => this._fetchUserInfo(accessToken);
     try {
       return await this.scheduleWithRetry<BattleNetUserProfile>(jobId, task);
     } catch (error: any) {
        const statusCode = error?.status || error?.response?.status || (error instanceof AppError ? error.status : 500);
        logger.error({ err: error, jobId, statusCode }, `[ApiClient] Final error fetching user info for job ${jobId}.`);
        throw new AppError(`Failed to fetch user info: ${error.message || String(error)}`, statusCode, { code: 'BATTLE_NET_API_ERROR', details: { jobId } });
     }
   }

   async validateToken(accessToken: string): Promise<boolean> {
     const jobId = `validatetoken-${accessToken.substring(0, 6)}`;
     const task = async () => {
        await this._checkTokenValidation(accessToken);
        return true; // Return true on success (200 OK)
     };
     try {
       // Wrap validation check with retry logic? Maybe not necessary, depends on API behavior.
       // Calling directly for now.
       return await task();
     } catch (error: any) {
        // Any error (including 4xx/5xx from _checkTokenValidation) means invalid/expired token
        logger.warn({ err: error, jobId }, `[ApiClient] Token validation failed for job ${jobId}.`);
        return false;
     }
   }

   /**
    * Generate Battle.net OAuth authorization URL. No API call needed.
    */
   getAuthorizationUrl(region: string, state: string): string {
     const validRegion = this._validateRegion(region);
     const regionConfig = config.battlenet.regions[validRegion];
     logger.debug({ region: validRegion, state }, '[ApiClient] Generating authorization URL.');

     return `${regionConfig.authBaseUrl}/authorize?` +
       `client_id=${encodeURIComponent(config.battlenet.clientId)}` +
       `&scope=${encodeURIComponent('offline_access wow.profile')}` +
       `&state=${encodeURIComponent(state)}` +
       `&redirect_uri=${encodeURIComponent(config.battlenet.redirectUri)}` +
       `&response_type=code`;
   }

  /**
   * Disconnects the Bottleneck limiter to clean up resources.
   * Should be called when the application shuts down or during test teardown.
   */
  public async disconnect(): Promise<void> {
    await this.limiter.disconnect();
    logger.info('[ApiClient] Bottleneck limiter disconnected.');
  }
} // End of BattleNetApiClient class

// Export a singleton instance if desired, or handle instantiation elsewhere
// export const battleNetApiClient = new BattleNetApiClient();
