// backend/src/services/battlenet-api.client.ts
import { AppError } from "../utils/error-handler.js";
import { ErrorCode } from "../../../shared/types/error.js";
import {
  BattleNetCharacter as ApiBattleNetCharacter,
  BattleNetCharacterEquipment as ApiBattleNetCharacterEquipment,
  BattleNetGuild as ApiBattleNetGuild,
  BattleNetGuildRoster as ApiBattleNetGuildRoster,
  BattleNetMythicKeystoneProfile as ApiBattleNetMythicKeystoneProfile,
  BattleNetProfessions as ApiBattleNetProfessions,
  BattleNetApiErrorContext,
  HttpClient,
  createBattleNetErrorDetail,
  isBattleNetCharacter,
  isBattleNetCharacterEquipment,
  isBattleNetGuild,
  isBattleNetGuildRoster,
  isBattleNetMythicKeystoneProfile,
  isBattleNetProfessions,
  mapHttpStatusToErrorCode,
} from "../types/battlenet-api.types.js";

// Import shared types
import {
  BattleNetGuild,
  BattleNetGuildRoster,
} from "../../../shared/types/guild.js";

// Import type adapters
import {
  adaptGuild,
  adaptRoster,
  adaptEnhancedCharacter
} from "../types/battlenet-api-compat.js";

// Import EnhancedCharacterData type
import { EnhancedCharacterData } from "../types/enhanced-character.js";
import { TokenResponse } from "../../../shared/types/auth.js";
import config from "../config/index.js";
import {
  BattleNetRegion,
  BattleNetUserProfile,
  BattleNetWoWProfile,
} from "../../../shared/types/user.js";
import Bottleneck from "bottleneck";
import logger from "../utils/logger.js";
import axios from "axios";
import process from "node:process";
import { AxiosHttpClient } from "./http-client.js";

// --- Rate Limiter Configuration ---
const BNET_MAX_CONCURRENT = parseInt(
  process.env.BNET_MAX_CONCURRENT || "20",
  10,
);
const BNET_MIN_TIME_MS = parseInt(process.env.BNET_MIN_TIME_MS || "10", 10);

logger.info(
  `[ApiClient] Initializing Bottleneck with maxConcurrent: ${BNET_MAX_CONCURRENT}, minTime: ${BNET_MIN_TIME_MS}ms`,
);

export class BattleNetApiClient {
  private apiClientToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private httpClient: HttpClient;

  // Initialize the rate limiter instance
  private limiter = new Bottleneck({
    reservoir: 36000,
    reservoirRefreshAmount: 36000,
    reservoirRefreshInterval: 3600 * 1000,
    maxConcurrent: BNET_MAX_CONCURRENT,
    minTime: BNET_MIN_TIME_MS,
  });

  constructor(httpClient?: HttpClient) {
    this.httpClient = httpClient || new AxiosHttpClient();

    this.limiter.on("error", (error) => {
      logger.error({ err: error }, "[ApiClient Limiter Error]");
    });
    this.limiter.on("failed", (error, jobInfo) => {
      logger.warn(
        { err: error, jobId: jobInfo.options.id },
        `[ApiClient Limiter Failed] Job ${jobInfo.options.id} failed`,
      );
    });
    this.limiter.on("executing", (jobInfo) => {
      logger.info({
        jobId: jobInfo.options.id,
        running: this.limiter.running(),
      }, `[ApiClient Limiter Executing] Job ${jobInfo.options.id} started.`);
    });
    this.limiter.on("done", (jobInfo) => {
      logger.info({
        jobId: jobInfo.options.id,
        running: this.limiter.running(),
      }, `[ApiClient Limiter Done] Job ${jobInfo.options.id} finished.`);
    });
  }

  /**
   * Validates the provided region string against the configuration.
   */
  private _validateRegion(region: string): BattleNetRegion {
    if (region in config.battlenet.regions) {
      return region as BattleNetRegion;
    }
    logger.warn(
      { providedRegion: region, fallbackRegion: "eu" },
      "[ApiClient] Invalid region provided, falling back to EU.",
    );
    return "eu";
  }

  /**
   * Schedules a task using the limiter with retry logic for 429 errors.
   */
  private async scheduleWithRetry<T>(
    jobId: string,
    taskFn: () => Promise<T>,
    maxRetries: number = 3,
  ): Promise<T> {
    let attempts = 0;

    while (attempts <= maxRetries) {
      try {
        const result = await this.limiter.schedule({
          id: `${jobId}-attempt-${attempts}`,
        }, taskFn);
        return result;
      } catch (error: any) {
        attempts++;
        const isAxiosError = axios.isAxiosError(error);
        const statusCode = isAxiosError ? error.response?.status : undefined;
        const url = isAxiosError ? error.config?.url : undefined;

        if (isAxiosError && statusCode === 429 && attempts <= maxRetries) {
          let retryAfterMs = 1000;
          const retryAfterHeader = error.response?.headers?.["retry-after"];

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
            `[ApiClient] Rate limit hit (429) for job ${jobId}. Attempt ${attempts}/${maxRetries}. Retrying after ${waitTime}ms...`,
          );
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        } else if (isAxiosError && statusCode === 404) {
          logger.warn(
            { jobId, attempt: attempts, url, status: 404 },
            `[ApiClient] Not Found (404) encountered for job ${jobId} on attempt ${attempts}. Throwing for upstream handling.`,
          );
          throw error;
        } else {
          const logReason = attempts > maxRetries
            ? "Retries exhausted"
            : "Non-retryable error";
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
              maxRetries,
            },
            `[ApiClient] ${logReason} for job ${jobId} on attempt ${attempts}. Throwing.`,
          );
          throw error;
        }
      }
    }
    throw new Error(
      `[ApiClient] Job ${jobId} failed after ${maxRetries} retries.`,
    );
  }

  /**
   * Centralizes error handling for API calls
   */
  private handleApiError(error: unknown, context: BattleNetApiErrorContext): never {
    let statusCode = 500;
    let errorMessage = 'Unknown error';
    
    // Extract error details
    if (axios.isAxiosError(error)) {
      statusCode = error.response?.status || 500;
      errorMessage = error.response?.data?.error_description || 
                    error.message || 
                    `${error.code || 'Unknown'} error`;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    
    const errorCode = mapHttpStatusToErrorCode(statusCode);
    const errorDetail = createBattleNetErrorDetail(context, statusCode, errorMessage);
    
    throw new AppError(
      `Failed to ${context.operation} ${context.resourceType} (${context.resourceId}): ${errorMessage}`,
      statusCode,
      {
        code: errorCode,
        details: errorDetail,
      }
    );
  }

  /**
   * Generic API call wrapper with error handling
   */
  private async callApi<T>(
    jobId: string,
    apiCall: () => Promise<unknown>,
    validator: (data: unknown) => data is T,
    context: BattleNetApiErrorContext
  ): Promise<T> {
    try {
      // Schedule with retry and rate limiting
      const result = await this.scheduleWithRetry(jobId, apiCall);
      
      // Validate response structure
      if (!validator(result)) {
        throw new Error('Invalid API response structure');
      }
      
      return result;
    } catch (error) {
      this.handleApiError(error, { ...context, jobId });
    }
  }

  /**
   * Ensures a valid client credentials token is available and returns it.
   */
  public async ensureClientToken(): Promise<string> {
    const now = new Date();
    if (
      !this.apiClientToken || !this.tokenExpiry ||
      this.tokenExpiry <= new Date(now.getTime() + 60 * 1000)
    ) {
      try {
        const validRegion = this._validateRegion("eu");
        const tokenResponse = await this._fetchClientCredentialsToken(
          validRegion,
        );

        if (!tokenResponse?.access_token || !tokenResponse?.expires_in) {
          throw new Error(
            "Invalid token response received from Battle.net service.",
          );
        }

        this.apiClientToken = tokenResponse.access_token;
        this.tokenExpiry = new Date(
          now.getTime() + tokenResponse.expires_in * 1000,
        );

        logger.info(
          `[ApiClient] Client Credentials Token refreshed. Expires at: ${this.tokenExpiry.toISOString()}`,
        );
      } catch (error) {
        this.apiClientToken = null;
        this.tokenExpiry = null;
        const errorMessage = error instanceof Error
          ? error.message
          : String(error);
        logger.error(
          { err: error },
          `[ApiClient] Failed to obtain/refresh token: ${errorMessage}`,
        );
        throw new AppError(`Failed to get API token: ${errorMessage}`, 500, {
          code: ErrorCode.EXTERNAL_API_ERROR,
        });
      }
    }

    if (!this.apiClientToken) {
      throw new AppError("API token is null after fetch attempt", 500, {
        code: ErrorCode.EXTERNAL_API_ERROR,
      });
    }

    return this.apiClientToken;
  }

  // API Methods

  private async _fetchClientCredentialsToken(
    region: BattleNetRegion,
  ): Promise<TokenResponse> {
    const { clientId, clientSecret } = config.battlenet;
    if (!clientId || !clientSecret) {
      throw new AppError(
        "Battle.net Client ID or Secret is not configured.",
        500,
        { code: ErrorCode.NOT_IMPLEMENTED },
      );
    }

    const regionConfig = config.battlenet.regions[region];
    const url = `${regionConfig.authBaseUrl}/token`;

    try {
      return await this.httpClient.post<TokenResponse>(
        url,
        new URLSearchParams({ grant_type: "client_credentials" }),
        { username: clientId, password: clientSecret },
        { "Content-Type": "application/x-www-form-urlencoded" }
      );
    } catch (error) {
      this.handleApiError(error, {
        operation: 'fetch',
        resourceType: 'auth_token',
        resourceId: 'client_credentials', 
        region
      });
    }
  }

  // Public API Methods

  async getGuildData(
    realmSlug: string,
    guildNameSlug: string,
    region: BattleNetRegion,
  ): Promise<BattleNetGuild> {
    const validRegion = this._validateRegion(region);
    const token = await this.ensureClientToken();
    const jobId = `guild-${validRegion}-${realmSlug}-${guildNameSlug}`;

    const regionConfig = config.battlenet.regions[validRegion];
    const url = `${regionConfig.apiBaseUrl}/data/wow/guild/${realmSlug}/${
      encodeURIComponent(guildNameSlug)
    }`;

    const apiGuild = await this.callApi<ApiBattleNetGuild>(
      jobId,
      () => this.httpClient.get(
        url,
        {
          namespace: `profile-${validRegion}`,
          locale: "en_US",
        },
        { Authorization: `Bearer ${token}` }
      ),
      isBattleNetGuild,
      {
        operation: 'fetch',
        resourceType: 'guild',
        resourceId: `${realmSlug}/${guildNameSlug}`,
        region: validRegion
      }
    );

    // Convert API guild to shared guild format
    return adaptGuild(apiGuild);
  }

  async getGuildRoster(
    region: BattleNetRegion,
    realmSlug: string,
    guildNameSlug: string,
  ): Promise<BattleNetGuildRoster> {
    const validRegion = this._validateRegion(region);
    const token = await this.ensureClientToken();
    const jobId = `roster-${validRegion}-${realmSlug}-${guildNameSlug}`;

    const regionConfig = config.battlenet.regions[validRegion];
    const url = `${regionConfig.apiBaseUrl}/data/wow/guild/${realmSlug}/${
      encodeURIComponent(guildNameSlug)
    }/roster`;

    const apiRoster = await this.callApi<ApiBattleNetGuildRoster>(
      jobId,
      () => this.httpClient.get(
        url,
        {
          namespace: `profile-${validRegion}`,
          locale: "en_US",
        },
        { Authorization: `Bearer ${token}` }
      ),
      isBattleNetGuildRoster,
      {
        operation: 'fetch',
        resourceType: 'guild_roster',
        resourceId: `${realmSlug}/${guildNameSlug}`,
        region: validRegion
      }
    );

    // Convert API roster to shared roster format
    return adaptRoster(apiRoster);
  }

  async getEnhancedCharacterData(
    realmSlug: string,
    characterNameLower: string,
    region: BattleNetRegion,
  ): Promise<EnhancedCharacterData | null> {
    const validRegion = this._validateRegion(region);
    const token = await this.ensureClientToken();
    const baseJobId = `char-${validRegion}-${realmSlug}-${characterNameLower}`;

    // Define default empty professions structure for 404 case
    const defaultProfessions: ApiBattleNetProfessions = {
      _links: { self: { href: "" } },
      character: {
        key: { href: "" },
        name: characterNameLower,
        id: 0,
        realm: { name: realmSlug, id: 0, slug: realmSlug },
      },
      primaries: [],
      secondaries: [],
    };

    try {
      // Prepare the API calls
      const profileCall = () => this.callApi<ApiBattleNetCharacter>(
        `${baseJobId}-profile`,
        () => this.httpClient.get(
          `${config.battlenet.regions[validRegion].apiBaseUrl}/profile/wow/character/${
            encodeURIComponent(realmSlug)
          }/${encodeURIComponent(characterNameLower)}`,
          {
            namespace: `profile-${validRegion}`,
            locale: "en_US",
          },
          { Authorization: `Bearer ${token}` }
        ),
        isBattleNetCharacter,
        {
          operation: 'fetch',
          resourceType: 'character',
          resourceId: `${realmSlug}/${characterNameLower}`,
          region: validRegion
        }
      );

      const equipmentCall = () => this.callApi<ApiBattleNetCharacterEquipment>(
        `${baseJobId}-equipment`,
        () => this.httpClient.get(
          `${config.battlenet.regions[validRegion].apiBaseUrl}/profile/wow/character/${
            encodeURIComponent(realmSlug)
          }/${encodeURIComponent(characterNameLower)}/equipment`,
          {
            namespace: `profile-${validRegion}`,
            locale: "en_US",
          },
          { Authorization: `Bearer ${token}` }
        ),
        isBattleNetCharacterEquipment,
        {
          operation: 'fetch',
          resourceType: 'character_equipment',
          resourceId: `${realmSlug}/${characterNameLower}`,
          region: validRegion
        }
      );

      const mythicKeystoneCall = () => this.callApi<ApiBattleNetMythicKeystoneProfile>(
        `${baseJobId}-mythic`,
        () => this.httpClient.get(
          `${config.battlenet.regions[validRegion].apiBaseUrl}/profile/wow/character/${
            encodeURIComponent(realmSlug)
          }/${encodeURIComponent(characterNameLower)}/mythic-keystone-profile`,
          {
            namespace: `profile-${validRegion}`,
            locale: "en_US",
          },
          { Authorization: `Bearer ${token}` }
        ),
        isBattleNetMythicKeystoneProfile,
        {
          operation: 'fetch',
          resourceType: 'character_mythic_keystone',
          resourceId: `${realmSlug}/${characterNameLower}`,
          region: validRegion
        }
      ).catch(error => {
        // Allow 404 for mythic keystones - some characters don't have them
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          return null;
        }
        throw error;
      });

      const professionsCall = () => this.callApi<ApiBattleNetProfessions>(
        `${baseJobId}-professions`,
        () => this.httpClient.get(
          `${config.battlenet.regions[validRegion].apiBaseUrl}/profile/wow/character/${
            encodeURIComponent(realmSlug)
          }/${encodeURIComponent(characterNameLower)}/professions`,
          {
            namespace: `profile-${validRegion}`,
            locale: "en_US",
          },
          { Authorization: `Bearer ${token}` }
        ),
        isBattleNetProfessions,
        {
          operation: 'fetch',
          resourceType: 'character_professions',
          resourceId: `${realmSlug}/${characterNameLower}`,
          region: validRegion
        }
      ).catch(error => {
        // Allow 404 for professions - some characters don't have them
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          return defaultProfessions;
        }
        throw error;
      });

      const results = await Promise.allSettled([
        profileCall(),
        equipmentCall(),
        mythicKeystoneCall(),
        professionsCall(),
      ]);

      const [
        profileResult,
        equipmentResult,
        mythicKeystoneResult,
        professionsResult,
      ] = results;

      if (profileResult.status === "rejected") {
        if (
          axios.isAxiosError(profileResult.reason) &&
          profileResult.reason.response?.status === 404
        ) {
          return null;
        }
        throw profileResult.reason;
      }

      if (equipmentResult.status === "rejected") {
        throw equipmentResult.reason;
      }

      const profile = profileResult.value;
      const equipment = equipmentResult.value;

      let mythicKeystone: ApiBattleNetMythicKeystoneProfile | null = null;
      if (mythicKeystoneResult.status === "fulfilled") {
        mythicKeystone = mythicKeystoneResult.value;
      } else if (
        !(axios.isAxiosError(mythicKeystoneResult.reason) &&
          mythicKeystoneResult.reason.response?.status === 404)
      ) {
        throw mythicKeystoneResult.reason;
      }

      let professions = defaultProfessions;
      if (professionsResult.status === "fulfilled") {
        professions = professionsResult.value;
      } else if (
        !(axios.isAxiosError(professionsResult.reason) &&
          professionsResult.reason.response?.status === 404)
      ) {
        throw professionsResult.reason;
      }

      // Convert API data to shared EnhancedCharacterData format
      return adaptEnhancedCharacter(profile, equipment, mythicKeystone, professions);
    } catch (error) {
      this.handleApiError(error, {
        operation: 'fetch',
        resourceType: 'enhanced_character',
        resourceId: `${realmSlug}/${characterNameLower}`,
        region: validRegion,
        jobId: baseJobId
      });
    }
  }

  async getCharacterCollectionsIndex(
    realmSlug: string,
    characterNameLower: string,
    region: BattleNetRegion,
  ): Promise<any> {
    const validRegion = this._validateRegion(region);
    const token = await this.ensureClientToken();
    const jobId = `char-collections-${validRegion}-${realmSlug}-${characterNameLower}`;

    const regionConfig = config.battlenet.regions[validRegion];
    const url = `${regionConfig.apiBaseUrl}/profile/wow/character/${
      encodeURIComponent(realmSlug)
    }/${encodeURIComponent(characterNameLower)}/collections`;
    
    return this.callApi<any>(
      jobId,
      () => this.httpClient.get(
        url,
        {
          namespace: `profile-${validRegion}`,
          locale: "en_US",
        },
        { Authorization: `Bearer ${token}` }
      ),
      // Use a simple identity function since we don't have a specific type to validate against
      (data): data is any => !!data && typeof data === 'object',
      {
        operation: 'fetch',
        resourceType: 'character_collections',
        resourceId: `${realmSlug}/${characterNameLower}`,
        region: validRegion
      }
    );
  }

  async getGenericBattleNetData<T = any>(
    url: string,
    jobId: string,
  ): Promise<T> {
    const token = await this.ensureClientToken();
    
    return this.callApi<T>(
      jobId,
      () => this.httpClient.get(url, {}, { Authorization: `Bearer ${token}` }),
      // Use a simple identity function since we don't have a specific type to validate against
      (data): data is T => !!data,
      {
        operation: 'fetch',
        resourceType: 'generic_data',
        resourceId: url,
        jobId
      }
    );
  }

  /**
   * Constructs the Battle.net OAuth2 authorization URL.
   */
  public getAuthorizationUrl(
    region: BattleNetRegion,
    state: string,
    redirectUri?: string,
  ): string {
    const validRegion = this._validateRegion(region);
    const regionConfig = config.battlenet.regions[validRegion];

    if (!regionConfig || !regionConfig.authBaseUrl) {
      throw new AppError(
        `Configuration for region ${region} is incomplete or missing authBaseUrl.`,
        500,
        { code: ErrorCode.NOT_IMPLEMENTED },
      );
    }

    if (
      !config.battlenet.clientId || !config.battlenet.redirectUri ||
      !config.battlenet.scopes
    ) {
      throw new AppError(
        "Battle.net client configuration (clientId, redirectUri, or scopes) is incomplete.",
        500,
        { code: ErrorCode.NOT_IMPLEMENTED },
      );
    }

    const authUrl = new URL(`${regionConfig.authBaseUrl}/authorize`);
    authUrl.searchParams.append("client_id", config.battlenet.clientId);
    authUrl.searchParams.append(
      "redirect_uri",
      redirectUri || config.battlenet.redirectUri,
    );
    authUrl.searchParams.append("response_type", "code");
    authUrl.searchParams.append("scope", config.battlenet.scopes.join(" "));
    authUrl.searchParams.append("state", state);

    return authUrl.toString();
  }

  /**
   * Exchanges an authorization code for an access token.
   */
  public async getAccessToken(
    region: BattleNetRegion,
    code: string,
    redirectUri: string,
  ): Promise<TokenResponse> {
    const validRegion = this._validateRegion(region);
    const regionConfig = config.battlenet.regions[validRegion];

    if (!regionConfig || !regionConfig.authBaseUrl) {
      throw new AppError(
        `Configuration for region ${region} is incomplete or missing authBaseUrl.`,
        500,
        { code: ErrorCode.NOT_IMPLEMENTED },
      );
    }

    if (!config.battlenet.clientId || !config.battlenet.clientSecret) {
      throw new AppError(
        "Battle.net client configuration (clientId or clientSecret) is incomplete.",
        500,
        { code: ErrorCode.NOT_IMPLEMENTED },
      );
    }

    const url = `${regionConfig.authBaseUrl}/token`;
    
    return this.callApi<TokenResponse>(
      `token-${validRegion}-${Date.now()}`,
      () => this.httpClient.post(
        url,
        new URLSearchParams({
          grant_type: "authorization_code",
          code: code,
          redirect_uri: redirectUri,
        }),
        {
          username: config.battlenet.clientId,
          password: config.battlenet.clientSecret,
        },
        { "Content-Type": "application/x-www-form-urlencoded" }
      ),
      // Simple validation for token response
      (data): data is TokenResponse => {
        return !!data && 
               typeof data === 'object' && 
               typeof (data as TokenResponse).access_token === 'string' &&
               typeof (data as TokenResponse).expires_in === 'number';
      },
      {
        operation: 'fetch',
        resourceType: 'auth_token',
        resourceId: 'access_token',
        region: validRegion
      }
    );
  }

  /**
   * Retrieves the Battle.net user profile information.
   */
  public async getUserInfo(
    region: BattleNetRegion,
    accessToken: string,
  ): Promise<BattleNetUserProfile> {
    const validRegion = this._validateRegion(region);
    const regionConfig = config.battlenet.regions[validRegion];

    if (!regionConfig || !regionConfig.userInfoUrl) {
      throw new AppError(
        `Configuration for region ${region} is incomplete or missing userInfoUrl.`,
        500,
        { code: ErrorCode.NOT_IMPLEMENTED },
      );
    }

    const url = regionConfig.userInfoUrl;
    
    return this.callApi<BattleNetUserProfile>(
      `user-info-${validRegion}-${Date.now()}`,
      () => this.httpClient.get(
        url,
        {},
        { Authorization: `Bearer ${accessToken}` }
      ),
      // Validate basic user profile structure
      (data): data is BattleNetUserProfile => {
        return !!data && 
               typeof data === 'object' && 
               typeof (data as BattleNetUserProfile).sub === 'string' &&
               typeof (data as BattleNetUserProfile).id === 'number';
      },
      {
        operation: 'fetch',
        resourceType: 'user_profile',
        resourceId: 'current_user',
        region: validRegion
      }
    );
  }

  /**
   * Retrieves the Battle.net WoW profile information for a user.
   */
  public async getWowProfile(
    region: BattleNetRegion,
    accessToken: string,
  ): Promise<BattleNetWoWProfile> {
    const validRegion = this._validateRegion(region);
    const regionConfig = config.battlenet.regions[validRegion];

    if (!regionConfig || !regionConfig.apiBaseUrl) {
      throw new AppError(
        `Configuration for region ${region} is incomplete or missing apiBaseUrl.`,
        500,
        { code: ErrorCode.NOT_IMPLEMENTED },
      );
    }

    const url = `${regionConfig.apiBaseUrl}/profile/user/wow`;
    
    return this.callApi<BattleNetWoWProfile>(
      `wow-profile-${validRegion}-${Date.now()}`,
      () => this.httpClient.get(
        url,
        { 
          namespace: `profile-${validRegion}`, 
          locale: "en_US" 
        },
        { Authorization: `Bearer ${accessToken}` }
      ),
      // Validate basic WoW profile structure
      (data): data is BattleNetWoWProfile => {
        return !!data && 
               typeof data === 'object' && 
               Array.isArray((data as BattleNetWoWProfile).wow_accounts);
      },
      {
        operation: 'fetch',
        resourceType: 'wow_profile',
        resourceId: 'current_user',
        region: validRegion
      }
    );
  }
}