// backend/src/utils/validation-monitor.ts
/**
 * Monitoring utility for Battle.net API validation failures.
 * 
 * This module provides functionality to track and report on validation failures
 * from the Battle.net API. It aggregates failures by type and frequency,
 * helping to identify patterns and potential issues with the API integration.
 */

import logger from './logger.js';
import { ValidationResult, FieldValidationResult } from '../types/battlenet-api-validator.js';

/**
 * Interface for validation failure statistics
 */
interface ValidationStats {
  /**
   * Total number of validations performed
   */
  totalValidations: number;
  
  /**
   * Number of validations that failed completely (no critical fields)
   */
  completeFailures: number;
  
  /**
   * Number of validations that failed partially (has critical fields)
   */
  partialFailures: number;
  
  /**
   * Map of field paths to failure counts
   */
  fieldFailures: Map<string, number>;
  
  /**
   * Last validation time
   */
  lastValidationTime: Date;
  
  /**
   * Failure ratio (failures / total)
   */
  failureRatio: number;
}

// Store validation statistics by endpoint type
const validationStatsByType = new Map<string, ValidationStats>();

// Initial stats for a new endpoint type
const createInitialStats = (): ValidationStats => ({
  totalValidations: 0,
  completeFailures: 0,
  partialFailures: 0,
  fieldFailures: new Map<string, number>(),
  lastValidationTime: new Date(),
  failureRatio: 0,
});

/**
 * Track a validation result for monitoring purposes
 */
export function trackValidationResult(
  type: string,
  result: ValidationResult
): void {
  // Get or create stats for this type
  let stats = validationStatsByType.get(type);
  if (!stats) {
    stats = createInitialStats();
    validationStatsByType.set(type, stats);
  }
  
  // Update validation stats
  stats.totalValidations++;
  stats.lastValidationTime = new Date();
  
  // Track failures
  if (!result.isValid) {
    if (result.hasCriticalFields) {
      stats.partialFailures++;
    } else {
      stats.completeFailures++;
    }
    
    // Track field failures
    for (const failure of result.failures) {
      const currentCount = stats.fieldFailures.get(failure.path) || 0;
      stats.fieldFailures.set(failure.path, currentCount + 1);
    }
  }
  
  // Update failure ratio
  stats.failureRatio = (stats.completeFailures + stats.partialFailures) / stats.totalValidations;
  
  // Log high failure ratios
  if (stats.failureRatio > 0.1 && stats.totalValidations > 10) {
    logger.warn({
      type,
      ...stats,
      fieldFailures: Object.fromEntries(stats.fieldFailures.entries())
    }, '[ValidationMonitor] High failure ratio detected');
  }
}

/**
 * Get validation statistics for all endpoint types
 */
export function getValidationStats(): Record<string, Omit<ValidationStats, 'fieldFailures'> & { 
  topFailures: Array<{ field: string; count: number }> 
}> {
  const result: Record<string, any> = {};
  
  for (const [type, stats] of validationStatsByType.entries()) {
    // Convert field failures to a sorted array of top failures
    const topFailures = Array.from(stats.fieldFailures.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([field, count]) => ({ field, count }));
    
    // Add stats to result
    result[type] = {
      totalValidations: stats.totalValidations,
      completeFailures: stats.completeFailures,
      partialFailures: stats.partialFailures,
      lastValidationTime: stats.lastValidationTime,
      failureRatio: stats.failureRatio,
      topFailures
    };
  }
  
  return result;
}

/**
 * Reset validation statistics
 */
export function resetValidationStats(): void {
  validationStatsByType.clear();
}

/**
 * Log validation statistics summary
 */
export function logValidationStatsSummary(): void {
  const stats = getValidationStats();
  logger.info({ stats }, '[ValidationMonitor] Validation statistics summary');
}

// Set up periodic logging of validation statistics
const STATS_LOG_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
setInterval(logValidationStatsSummary, STATS_LOG_INTERVAL_MS);