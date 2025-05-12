// backend/src/services/battlenet-api-client-enhanced.ts
/**
 * Enhanced Battle.net API Client
 * 
 * This client uses the validator and adapter functions to ensure API responses
 * are properly validated and processed. It provides a more robust interface
 * for interacting with the Battle.net API, with better error handling and
 * validation.
 */

import { AppError } from "../utils/error-handler.js";
import { ErrorCode } from "../../../shared/types/utils/errors.js";
import {
  BattleNetApiErrorContext,
  HttpClient,
  createBattleNetErrorDetail,
  mapHttpStatusToErrorCode,
} from "../types/battlenet-api.types.js";

// Import reference types
import * as RefTypes from '../types/battlenet-api-reference.js';

// Import validators
import {
  validators
} from '../types/battlenet-api-validator.js';

// Import adapters
import * as Adapter from '../types/battlenet-api-adapter.js';

// Import enhanced character data type
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
import { process } from "../utils/import-fixes.js";
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

export class BattleNetApiClientEnhanced {
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
   * Generic API call wrapper with enhanced validation
   */
  private async callApi<T>(
    jobId: string,
    apiCall: () => Promise<unknown>,
    validatorType: keyof typeof validators,
    context: BattleNetApiErrorContext
  ): Promise<T> {
    try {
      // Schedule with retry and rate limiting
      const result = await this.scheduleWithRetry(jobId, apiCall);
      
      // Get the appropriate validator
      const validator = validators[validatorType];
      
      // Validate response structure
      const validationResult = validator(result);
      
      // Log validation details
      if (!validationResult.isValid) {
        const criticalFailures = validationResult.failures.filter(f => f.isCritical);
        
        logger.warn({
          jobId,
          validationType: validatorType,
          isValid: validationResult.isValid,
          hasCriticalFields: validationResult.hasCriticalFields,
          failureCount: validationResult.failures.length,
          criticalFailureCount: criticalFailures.length,
          failures: validationResult.failures.map(f => `${f.path}: expected ${f.expected}, got ${f.received}`)
        }, `[ApiClient] Validation ${validationResult.hasCriticalFields ? 'partially' : 'completely'} failed for ${validatorType}`);
        
        // If we don't have critical fields, throw an error
        if (!validationResult.hasCriticalFields) {
          throw new Error(`Invalid API response structure for ${validatorType}`);
        }
      }
      
      // If we reach here, either validation passed or we have critical fields
      return result as T;
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
  ) {
    const validRegion = this._validateRegion(region);
    const token = await this.ensureClientToken();
    const jobId = `guild-${validRegion}-${realmSlug}-${guildNameSlug}`;

    const regionConfig = config.battlenet.regions[validRegion];
    const url = `${regionConfig.apiBaseUrl}/data/wow/guild/${realmSlug}/${
      encodeURIComponent(guildNameSlug)
    }`;

    const apiGuild = await this.callApi<RefTypes.BattleNetGuildRef>(
      jobId,
      () => this.httpClient.get(
        url,
        {
          namespace: `profile-${validRegion}`,
          locale: "en_US",
        },
        { Authorization: `Bearer ${token}` }
      ),
      'guild',
      {
        operation: 'fetch',
        resourceType: 'guild',
        resourceId: `${realmSlug}/${guildNameSlug}`,
        region: validRegion
      }
    );

    // Convert API guild to shared guild format
    return Adapter.adaptReferenceGuild(apiGuild);
  }

  async getGuildRoster(
    region: BattleNetRegion,
    realmSlug: string,
    guildNameSlug: string,
  ) {
    const validRegion = this._validateRegion(region);
    const token = await this.ensureClientToken();
    const jobId = `roster-${validRegion}-${realmSlug}-${guildNameSlug}`;

    const regionConfig = config.battlenet.regions[validRegion];
    const url = `${regionConfig.apiBaseUrl}/data/wow/guild/${realmSlug}/${
      encodeURIComponent(guildNameSlug)
    }/roster`;

    const apiRoster = await this.callApi<RefTypes.BattleNetGuildRosterRef>(
      jobId,
      () => this.httpClient.get(
        url,
        {
          namespace: `profile-${validRegion}`,
          locale: "en_US",
        },
        { Authorization: `Bearer ${token}` }
      ),
      'guildRoster',
      {
        operation: 'fetch',
        resourceType: 'guild_roster',
        resourceId: `${realmSlug}/${guildNameSlug}`,
        region: validRegion
      }
    );

    // Convert API roster to shared roster format
    return Adapter.adaptReferenceGuildRoster(apiRoster);
  }

  async getCharacter(
    realmSlug: string,
    characterNameLower: string,
    region: BattleNetRegion
  ) {
    const validRegion = this._validateRegion(region);
    const token = await this.ensureClientToken();
    const jobId = `char-profile-${validRegion}-${realmSlug}-${characterNameLower}`;

    const regionConfig = config.battlenet.regions[validRegion];
    const url = `${regionConfig.apiBaseUrl}/profile/wow/character/${
      encodeURIComponent(realmSlug)
    }/${encodeURIComponent(characterNameLower)}`;

    const character = await this.callApi<RefTypes.BattleNetCharacterRef>(
      jobId,
      () => this.httpClient.get(
        url,
        {
          namespace: `profile-${validRegion}`,
          locale: "en_US",
        },
        { Authorization: `Bearer ${token}` }
      ),
      'character',
      {
        operation: 'fetch',
        resourceType: 'character',
        resourceId: `${realmSlug}/${characterNameLower}`,
        region: validRegion
      }
    );

    return Adapter.adaptReferenceCharacter(character);
  }

  async getEnhancedCharacterData(
    realmSlug: string,
    characterNameLower: string,
    region: BattleNetRegion,
  ): Promise<EnhancedCharacterData | null> {
    const validRegion = this._validateRegion(region);
    const token = await this.ensureClientToken();
    const baseJobId = `char-${validRegion}-${realmSlug}-${characterNameLower}`;

    try {
      // Prepare the API calls
      const profileCall = () => this.callApi<RefTypes.BattleNetCharacterRef>(
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
        'character',
        {
          operation: 'fetch',
          resourceType: 'character',
          resourceId: `${realmSlug}/${characterNameLower}`,
          region: validRegion
        }
      );

      const equipmentCall = () => this.callApi<RefTypes.BattleNetCharacterEquipmentRef>(
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
        'characterEquipment',
        {
          operation: 'fetch',
          resourceType: 'character_equipment',
          resourceId: `${realmSlug}/${characterNameLower}`,
          region: validRegion
        }
      );

      const mythicKeystoneCall = () => this.callApi<RefTypes.BattleNetMythicKeystoneProfileRef>(
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
        'mythicKeystone',
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

      const professionsCall = () => this.callApi<RefTypes.BattleNetProfessionsRef>(
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
        'professions',
        {
          operation: 'fetch',
          resourceType: 'character_professions',
          resourceId: `${realmSlug}/${characterNameLower}`,
          region: validRegion
        }
      ).catch(error => {
        // Allow 404 for professions - some characters don't have them
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          // Create a minimal valid professions object
          return {
            _links: { self: { href: "" } },
            character: {
              key: { href: "" },
              name: characterNameLower,
              id: 0,
              realm: { 
                key: { href: "" },
                name: { en_US: realmSlug } as any, 
                id: 0, 
                slug: realmSlug 
              },
            },
            primaries: [],
            secondaries: [],
          } as RefTypes.BattleNetProfessionsRef;
        }
        throw error;
      });

      // Execute all API calls in parallel for efficiency
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

      // Handle character profile result
      if (profileResult.status === "rejected") {
        if (
          axios.isAxiosError(profileResult.reason) &&
          profileResult.reason.response?.status === 404
        ) {
          // Character not found
          return null;
        }
        throw profileResult.reason;
      }

      // Character equipment is required
      if (equipmentResult.status === "rejected") {
        throw equipmentResult.reason;
      }

      const profile = profileResult.value;
      const equipment = equipmentResult.value;

      // Mythic keystone data is optional
      let mythicKeystone: RefTypes.BattleNetMythicKeystoneProfileRef | null = null;
      if (mythicKeystoneResult.status === "fulfilled") {
        mythicKeystone = mythicKeystoneResult.value;
      } else if (
        !(axios.isAxiosError(mythicKeystoneResult.reason) &&
          mythicKeystoneResult.reason.response?.status === 404)
      ) {
        // If it's not a 404, it's an unexpected error
        throw mythicKeystoneResult.reason;
      }

      // Professions data is required (we provide a fallback if missing)
      let professions: RefTypes.BattleNetProfessionsRef;
      if (professionsResult.status === "fulfilled") {
        professions = professionsResult.value;
      } else {
        throw professionsResult.reason;
      }

      try {
        // Use the adapter to convert reference types to EnhancedCharacterData
        return Adapter.adaptReferenceEnhancedCharacter(
          profile,
          equipment,
          mythicKeystone,
          professions
        );
      } catch (adapterError) {
        // If adapter fails, log the error and create a minimal valid structure
        logger.error({
          error: adapterError,
          characterId: profile.id,
          characterName: profile.name,
          realm: profile.realm.slug
        }, '[EnhancedClient] Error in adapter, returning minimal structure');

        // Return minimal valid structure
        return {
          _links: profile._links,
          id: profile.id,
          name: profile.name,
          gender: { type: profile.gender.type, name: typeof profile.gender.name === 'string' ? profile.gender.name : 'Unknown' },
          faction: { type: profile.faction.type, name: typeof profile.faction.name === 'string' ? profile.faction.name : 'Unknown' },
          race: { key: profile.race.key, id: profile.race.id, name: typeof profile.race.name === 'string' ? profile.race.name : 'Unknown' },
          character_class: { key: profile.character_class.key, id: profile.character_class.id, name: typeof profile.character_class.name === 'string' ? profile.character_class.name : 'Unknown' },
          active_spec: { key: profile.active_spec.key, id: profile.active_spec.id, name: typeof profile.active_spec.name === 'string' ? profile.active_spec.name : 'Unknown' },
          realm: { key: profile.realm.key, id: profile.realm.id, slug: profile.realm.slug, name: typeof profile.realm.name === 'string' ? profile.realm.name : profile.realm.slug },
          level: profile.level,
          equipment: {
            _links: equipment._links,
            character: {
              id: equipment.character.id,
              name: equipment.character.name,
              realm: {
                id: equipment.character.realm.id,
                slug: equipment.character.realm.slug,
                name: typeof equipment.character.realm.name === 'string' ? equipment.character.realm.name : ''
              }
            },
            equipped_items: equipment.equipped_items.map(item => ({
              slot: {
                type: item.slot.type,
                name: typeof item.slot.name === 'string' ? item.slot.name : ''
              },
              item: {
                id: item.item.id,
                name: typeof item.name === 'string' ? item.name : ''
              },
              quality: {
                type: item.quality.type,
                name: typeof item.quality.name === 'string' ? item.quality.name : ''
              },
              level: {
                value: item.level?.value || 0
              }
            }))
          },
          itemLevel: profile.equipped_item_level || 0,
          mythicKeystone: null,
          professions: {
            _links: { self: { href: '' } },
            character: {
              id: profile.id,
              name: profile.name,
              realm: {
                id: profile.realm.id,
                slug: profile.realm.slug,
                name: typeof profile.realm.name === 'string' ? profile.realm.name : profile.realm.slug
              }
            },
            primaries: [],
            secondaries: []
          },
          experience: profile.experience || 0,
          achievement_points: profile.achievement_points || 0,
          equipped_item_level: profile.equipped_item_level || 0,
          average_item_level: profile.average_item_level || 0,
          achievements: { total_points: profile.achievement_points || 0, achievements: [] },
          titles: { active_title: null, titles: [] },
          pvp_summary: { honor_level: 0, pvp_map_statistics: [] },
          encounters: { dungeons: [], raids: [] },
          media: { avatar_url: '', inset_url: '', main_url: '' },
          last_login_timestamp: profile.last_login_timestamp || 0,
          last_login_timestamp_ms: profile.last_login_timestamp || 0,
          specializations: [{ talent_loadouts: [], glyphs: [], pvp_talent_slots: [] }]
        };
      }
    } catch (error) {
      // If it's a 404, return null to indicate character not found
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      
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
  ): Promise<RefTypes.BattleNetCollectionsIndexRef> {
    const validRegion = this._validateRegion(region);
    const token = await this.ensureClientToken();
    const jobId = `char-collections-${validRegion}-${realmSlug}-${characterNameLower}`;

    const regionConfig = config.battlenet.regions[validRegion];
    const url = `${regionConfig.apiBaseUrl}/profile/wow/character/${
      encodeURIComponent(realmSlug)
    }/${encodeURIComponent(characterNameLower)}/collections`;
    
    return this.callApi<RefTypes.BattleNetCollectionsIndexRef>(
      jobId,
      () => this.httpClient.get(
        url,
        {
          namespace: `profile-${validRegion}`,
          locale: "en_US",
        },
        { Authorization: `Bearer ${token}` }
      ),
      'collections',
      {
        operation: 'fetch',
        resourceType: 'character_collections',
        resourceId: `${realmSlug}/${characterNameLower}`,
        region: validRegion
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
    
    try {
      // Using httpClient directly here as tokens don't need validation
      return await this.httpClient.post<TokenResponse>(
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
      );
    } catch (error) {
      this.handleApiError(error, {
        operation: 'fetch',
        resourceType: 'auth_token',
        resourceId: 'access_token', 
        region: validRegion 
      });
    }
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
    
    try {
      // Using httpClient directly for user profile as it has a specific format
      return await this.httpClient.get<BattleNetUserProfile>(
        url,
        {},
        { Authorization: `Bearer ${accessToken}` }
      );
    } catch (error) {
      this.handleApiError(error, {
        operation: 'fetch',
        resourceType: 'user_profile',
        resourceId: 'current_user',
        region: validRegion
      });
    }
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
    
    try {
      // Using httpClient directly for WoW profile as it has a specific format
      return await this.httpClient.get<BattleNetWoWProfile>(
        url,
        { 
          namespace: `profile-${validRegion}`, 
          locale: "en_US" 
        },
        { Authorization: `Bearer ${accessToken}` }
      );
    } catch (error) {
      this.handleApiError(error, {
        operation: 'fetch',
        resourceType: 'wow_profile',
        resourceId: 'current_user',
        region: validRegion
      });
    }
  }

  /**
   * Generic method to fetch Battle.net data from any API endpoint using the URL directly.
   * @param url The full URL to fetch data from
   * @param jobId A unique identifier for this job (for logging and rate limiting)
   * @returns The API response data
   */
  public async getGenericBattleNetData<T = any>(
    url: string,
    jobId: string,
  ): Promise<T> {
    try {
      const token = await this.ensureClientToken();

      return this.callApi<T>(
        jobId,
        () => this.httpClient.get(url, {}, { Authorization: `Bearer ${token}` }),
        'genericData',
        {
          operation: 'fetch',
          resourceType: 'generic_data',
          resourceId: url,
          jobId
        }
      );
    } catch (error) {
      this.handleApiError(error, {
        operation: 'fetch',
        resourceType: 'generic_data',
        resourceId: url,
        jobId
      });
    }
  }
}