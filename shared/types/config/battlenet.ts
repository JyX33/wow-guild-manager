/**
 * Battle.net API configuration types
 */

/**
 * Battle.net region-specific configuration
 */
export interface BattleNetRegionConfig {
  authBaseUrl: string;
  apiBaseUrl: string;
  userInfoUrl: string;
}

/**
 * Battle.net API configuration
 */
export interface BattleNetConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  useEnhancedClient?: boolean; // Flag to enable the enhanced Battle.net API client
  useShadowMode?: boolean; // Flag to enable shadow mode testing
  regions: {
    eu: BattleNetRegionConfig;
    us: BattleNetRegionConfig;
    kr: BattleNetRegionConfig;
    tw: BattleNetRegionConfig;
    cn: BattleNetRegionConfig; // Added cn region config
  };
}