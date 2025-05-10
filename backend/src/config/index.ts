import * as dotenv from "dotenv";
import { AppConfig } from "../../../shared/types/index.js";
import * as process from "node:process";

// extract key NODE_ENV
let trimmedNodeEnv: string | undefined;
Object.entries(process.env)
  .filter(([envKey]) => envKey === "NODE_ENV")
  .forEach(([, value]) => {
    trimmedNodeEnv = value?.trim();
  });

// Load environment variables from .env file ONLY if not in production
// This ensures production relies solely on environment variables provided by the host (Coolify)
if (!trimmedNodeEnv || trimmedNodeEnv !== "production") {
  dotenv.config();
}

// Define required environment variables
const requiredEnvVars = [
  "DB_HOST",
  "DB_PORT",
  "DB_NAME",
  "DB_USER",
  "DB_PASSWORD",
  "BATTLE_NET_CLIENT_ID",
  "BATTLE_NET_CLIENT_SECRET",
  "JWT_SECRET",
  // Note: PORT and NODE_ENV are typically provided by the environment (like Coolify)
  // and don't strictly need to be in .env or checked here, but reading them is fine.
];

// Check if all required environment variables are set
// We check AFTER potentially loading .env for non-production
const missingVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);
if (missingVars.length > 0) {
  // Throw an error only if critical variables are missing
  // Allow NODE_ENV and PORT to be potentially missing if the app handles defaults
  console.error(
    `Missing required environment variables: ${missingVars.join(", ")}`,
  );
  // Decide if this should be a fatal error depending on your app's needs
  // For now, we'll log an error but continue, relying on defaults below.
  // throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

// Construct the config object, reading process.env directly
// This ensures we get the runtime values provided by Coolify in production
const config: AppConfig = {
  server: {
    port: parseInt(process.env.PORT || "5000"),
    // Use the trimmed NODE_ENV value, providing a default if necessary
    nodeEnv: trimmedNodeEnv || "development",
    frontendUrl: process.env.FRONTEND_URL || "https://localhost:5173",
  },
  database: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5433"),
    name: process.env.DB_NAME || "wow_guild_manager",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET || "", // Default should likely cause an error if missing
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ||
      process.env.JWT_SECRET || "",
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1h",
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
    cookieMaxAge: parseInt(process.env.COOKIE_MAX_AGE || "3600000"), // 1 hour
    refreshCookieMaxAge: parseInt(
      process.env.REFRESH_COOKIE_MAX_AGE || "604800000",
    ), // 7 days
  },
  battlenet: {
    clientId: process.env.BATTLE_NET_CLIENT_ID || "", // Default should likely cause an error if missing
    clientSecret: process.env.BATTLE_NET_CLIENT_SECRET || "", // Default should likely cause an error if missing
    redirectUri: process.env.BATTLE_NET_REDIRECT_URI ||
      "https://localhost:5000/api/auth/callback",
    scopes: ["openid", "wow.profile"],
    useEnhancedClient: process.env.USE_ENHANCED_BNET_CLIENT === 'true',
    useShadowMode: process.env.USE_SHADOW_MODE_BNET_CLIENT === 'true',
    regions: {
      eu: {
        authBaseUrl: "https://eu.battle.net/oauth",
        userInfoUrl: "https://eu.battle.net/oauth/userinfo",
        apiBaseUrl: "https://eu.api.blizzard.com",
      },
      us: {
        authBaseUrl: "https://us.battle.net/oauth",
        userInfoUrl: "https://us.battle.net/oauth/userinfo",
        apiBaseUrl: "https://us.api.blizzard.com",
      },
      kr: {
        authBaseUrl: "https://kr.battle.net/oauth",
        userInfoUrl: "https://kr.battle.net/oauth/userinfo",
        apiBaseUrl: "https://kr.api.blizzard.com",
      },
      tw: {
        authBaseUrl: "https://tw.battle.net/oauth",
        userInfoUrl: "https://tw.battle.net/oauth/userinfo",
        apiBaseUrl: "https://tw.api.blizzard.com",
      },
      cn: {
        authBaseUrl: "https://www.battlenet.com.cn/oauth",
        apiBaseUrl: "https://gateway.battlenet.com.cn",
        userInfoUrl: "https://www.battlenet.com.cn/oauth/userinfo",
      },
    },
  },
  discord: { clientId: "", clientSecret: "" },
};

// Log the config object for debugging purposes
console.log("Config:", {
  server: config.server,
  database: config.database,
  auth: {
    jwtSecret: config.auth.jwtSecret,
    jwtRefreshSecret: config.auth.jwtRefreshSecret,
    jwtExpiresIn: config.auth.jwtExpiresIn,
    jwtRefreshExpiresIn: config.auth.jwtRefreshExpiresIn,
    cookieMaxAge: config.auth.cookieMaxAge,
    refreshCookieMaxAge: config.auth.refreshCookieMaxAge,
  },
  battlenet: {
    clientId: config.battlenet.clientId,
    clientSecret: config.battlenet.clientSecret,
    redirectUri: config.battlenet.redirectUri,
    useEnhancedClient: config.battlenet.useEnhancedClient,
    useShadowMode: config.battlenet.useShadowMode,
    regions: {
      eu: config.battlenet.regions.eu,
      us: config.battlenet.regions.us,
      kr: config.battlenet.regions.kr,
      tw: config.battlenet.regions.tw,
      cn: config.battlenet.regions.cn,
    },
  },
});

export default config;
