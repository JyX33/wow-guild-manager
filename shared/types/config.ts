// Config types for the backend
export interface DatabaseConfig {
  host: string;
  port: number;
  name: string;
  user: string;
  password: string;
}

export interface ServerConfig {
  port: number;
  nodeEnv: string;
  frontendUrl: string;
}

export interface AuthConfig {
  jwtSecret: string;
  jwtRefreshSecret: string;
  jwtExpiresIn: string;
  jwtRefreshExpiresIn: string;
  cookieMaxAge: number;
  refreshCookieMaxAge: number;
}

export interface BattleNetRegionConfig {
  authBaseUrl: string;
  apiBaseUrl: string;
  userInfoUrl: string;
}

export interface BattleNetConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  regions: {
    eu: BattleNetRegionConfig;
    us: BattleNetRegionConfig;
    kr: BattleNetRegionConfig;
    tw: BattleNetRegionConfig;
    cn: BattleNetRegionConfig; // Added cn region config
  };
}

export interface AppConfig {
  server: ServerConfig;
  database: DatabaseConfig;
  auth: AuthConfig;
  battlenet: BattleNetConfig;
}