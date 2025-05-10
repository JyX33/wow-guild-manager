// backend/src/utils/safe-adapter.ts
/**
 * Utility to safely run adapter functions with error handling
 */

import logger from './logger.js';

/**
 * Safely runs an adapter function, catching any errors and returning a fallback value
 * 
 * @param fn Adapter function to run
 * @param args Arguments to pass to the adapter function
 * @param fallback Fallback value to return in case of error
 * @param context Additional context for error logging
 * @returns The result of the adapter function or the fallback value
 */
export function safeRun<T, Args extends any[]>(
  fn: (...args: Args) => T,
  args: Args,
  fallback: T,
  context: Record<string, any> = {}
): T {
  try {
    return fn(...args);
  } catch (error) {
    logger.error({
      adapterFunction: fn.name, 
      error,
      ...context
    }, '[SafeAdapter] Error running adapter function');
    
    return fallback;
  }
}

/**
 * Creates a safe version of an adapter function that catches errors and returns a fallback value
 * 
 * @param fn Adapter function to wrap
 * @param fallback Fallback value to return in case of error
 * @returns A wrapped function that safely calls the original adapter
 */
export function createSafeAdapter<T, Args extends any[]>(
  fn: (...args: Args) => T,
  fallback: T
): (...args: Args) => T {
  return (...args: Args) => {
    return safeRun(fn, args, fallback, {
      args: args.map(arg => 
        typeof arg === 'object' ? 
          (arg ? `${Object.keys(arg).length} keys` : 'null') : 
          typeof arg
      ).join(', ')
    });
  };
}