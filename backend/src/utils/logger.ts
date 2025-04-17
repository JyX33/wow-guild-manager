// backend/src/utils/logger.ts
import pino from 'pino'; // Import pino directly

// Configure Pino options
const pinoOptions: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL || 'debug', // Default to 'debug', can be overridden by env var
  timestamp: pino.stdTimeFunctions.isoTime, // Use ISO 8601 format timestamps
};

// Create and export the logger instance (without transport)
const logger = pino(pinoOptions);
logger.info(`Logger initialized with level: ${logger.level}`);

export default logger;