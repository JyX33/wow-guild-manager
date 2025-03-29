// backend/src/utils/logger.ts
import pino from 'pino';

// Determine if running in development mode for pretty printing
const isDevelopment = process.env.NODE_ENV !== 'production';

// Configure Pino options
const pinoOptions: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL || 'info', // Default to 'info', can be overridden by env var
  timestamp: pino.stdTimeFunctions.isoTime, // Use ISO 8601 format timestamps
};

// Add pretty printing transport only in development
const transport = isDevelopment
  ? pino.transport({
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l', // Human-readable time format for dev
        ignore: 'pid,hostname', // Don't show pid and hostname in dev logs
      },
    })
  : undefined; // No special transport in production (default JSON)

// Create and export the logger instance
const logger = pino(pinoOptions, transport);

export default logger;