import connectPgSimple from "connect-pg-simple"; // Import connect-pg-simple
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import session from "express-session";
import fs from "fs";
import http from "http"; // Import http module
import https from "https";
import schedule from "node-schedule";
import path from "path";
import pg from "pg"; // Import pg
import config from "./config/index.js";
import { runSync, SyncDependencies } from "./jobs/battlenet-sync/index.js";
import characterModelInstance from "./models/character.model.js";
import guildModelInstance from "./models/guild.model.js";
import guildMemberModelInstance from "./models/guild_member.model.js";
import rankModelInstance from "./models/rank.model.js";
import userModelInstance from "./models/user.model.js";
import { createBattleNetApiClient } from "./services/battlenet-api-client-factory.js";
import { BattleNetApiClient } from "./services/battlenet-api.client.js";
import logger from "./utils/logger.js"; // Import the logger

import {
  client as discordClient,
  initializeDiscordClient,
} from "./modules/discord/discordClient.js";
import {
  attachCommandListener,
  registerCommands,
} from "./modules/discord/commandHandler.js";
// logger is already imported
import { scheduleReminderJob } from "./modules/discord/reminderService.js";
import { scheduleThreadCleanupJob } from "./modules/discord/threadCleanupService.js";

import { registerValidatedRoutes } from "./routes/validated/index.js";
import {
  errorHandlerMiddleware,
  notFoundHandler,
} from "./utils/error-handler.js";
import process from "node:process";

const app = express();

// Enable trust proxy before session middleware
app.set("trust proxy", 1); // Trust the first hop (e.g., Nginx)

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: [
    config.server.frontendUrl,
    "https://127.0.0.1:5000",
  ],
  credentials: true,
}));

// PostgreSQL session store setup
const PgStore = connectPgSimple(session); // Let TypeScript handle the proper inference
const connectionString =
  `postgresql://${config.database.user}:${config.database.password}@${config.database.host}:${config.database.port}/${config.database.name}`;
const pgPool = new pg.Pool({ connectionString });

const sessionStore = new PgStore({
  pool: pgPool,
  tableName: "user_sessions", // Name of the session table
  createTableIfMissing: true, // Automatically create the table
});

const NODE_ENV = config.server.nodeEnv; // Use the corrected value from config
// Session middleware
// Cast properly with generics instead of 'any'
app.use(session({
  store: sessionStore, // Use the PostgreSQL store
  secret: config.auth.jwtSecret,
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: NODE_ENV === "production", // Required for sameSite: 'none' in production
    httpOnly: true,
    maxAge: config.auth.cookieMaxAge,
    sameSite: "none", // <-- Changed to 'none'
    path: "/", // Ensure path is root
  },
}));

// API Health check routes
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
  });
});

app.get("/api/healthcheck", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// Register all validated routes
registerValidatedRoutes(app);

// Error handling
app.use(notFoundHandler);
app.use(errorHandlerMiddleware);

// Start server based on environment
const PORT = config.server.port;

// Start server based on environment

// Check process.env directly for server start logic
// Check the corrected config value for server start logic
if (NODE_ENV === "production") {
  // In production (behind Coolify's proxy), run HTTP server
  http.createServer(app).listen(PORT, "0.0.0.0", () => {
    logger.info(
      `HTTP Server running on port ${PORT} (${NODE_ENV} mode, behind reverse proxy)`,
    ); // Log the corrected NODE_ENV
    logger.info(`Frontend URL: ${config.server.frontendUrl}`);
  });
} else {
  // In development or other environments, run HTTPS server with self-signed certs
  try {
    const certPath = path.resolve(__dirname, "../../certs/cert.pem");
    const keyPath = path.resolve(__dirname, "../../certs/key.pem");

    if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
      logger.error(
        `Certificate files not found at ${certPath} or ${keyPath}. Cannot start HTTPS server.`,
      );
      process.exit(1); // Exit if certs are missing in non-production
    }

    const httpsOptions = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };

    https.createServer(httpsOptions, app).listen(PORT, "0.0.0.0", () => {
      logger.info(
        `HTTPS Server running on port ${PORT} (${NODE_ENV} mode, accessible from all interfaces)`,
      ); // Log the corrected NODE_ENV
      logger.info(`Frontend URL: ${config.server.frontendUrl}`);
    });
  } catch (error) {
    logger.error(
      { err: error },
      `Failed to start HTTPS server in ${NODE_ENV} mode.`,
    ); // Log the corrected NODE_ENV
    process.exit(1);
  }
}

async function startDiscordBot() {
  logger.info("Attempting to initialize Discord Bot...");
  const token = process.env.DISCORD_BOT_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!token || !clientId || !guildId) {
    logger.error(
      "Missing required Discord environment variables (DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID). Bot initialization skipped.",
    );
    return;
  }

  try {
    await initializeDiscordClient(); // Logs in and sets up 'ready' listener
    // Wait briefly for client to potentially be ready before registering commands
    // A more robust solution might involve waiting for the 'ready' event explicitly here
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Simple 2-second delay

    await registerCommands(clientId, guildId, token);
    attachCommandListener(discordClient);
    logger.info("Discord Bot Initialized and Listener Attached.");
  } catch (error) {
    logger.error({ err: error }, "Failed to initialize Discord Bot");
  }
}
startDiscordBot();

// Schedule background sync job (e.g., run every hour at the start of the hour)
// Define the default cron schedule
const defaultSyncSchedule = "0 * * * *"; // Run every hour at minute 0
// Read schedule from environment variable or use default
const syncSchedule = process.env.SYNC_JOB_CRON_SCHEDULE || defaultSyncSchedule;
logger.info(
  `[Scheduler] Using sync schedule: "${syncSchedule}" (Default: "${defaultSyncSchedule}")`,
);

// Instantiate dependencies for the sync job
const dependencies: SyncDependencies = {
  apiClient: createBattleNetApiClient() as BattleNetApiClient,
  guildModel: guildModelInstance,
  userModel: userModelInstance,
  guildMemberModel: guildMemberModelInstance,
  rankModel: rankModelInstance,
  characterModel: characterModelInstance,
};

const syncJob = schedule.scheduleJob(syncSchedule, async () => {
  logger.info(
    `[Scheduler] Running scheduled Battle.net sync job at ${
      new Date().toISOString()
    }`,
  );
  try {
    await runSync(dependencies);
  } catch (error) {
    logger.error(
      { err: error },
      "[Scheduler] Error during scheduled sync job:",
    );
  }
});
scheduleThreadCleanupJob();
scheduleReminderJob();
logger.info(
  `[Scheduler] Next sync job scheduled for: ${syncJob.nextInvocation()}`,
);

// Optional: Run sync once on startup after a short delay
setTimeout(() => {
  logger.info("[Startup] Triggering initial Battle.net sync...");
  runSync(dependencies).catch((error: unknown) => {
    logger.error({ err: error }, "[Startup] Error during initial sync:");
  });
}, 10000); // Delay 10 seconds
