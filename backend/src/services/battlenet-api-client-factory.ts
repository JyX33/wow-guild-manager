// backend/src/services/battlenet-api-client-factory.ts
/**
 * Factory for Battle.net API clients.
 * 
 * This factory creates instances of Battle.net API clients based on configuration.
 * It allows for switching between the original and enhanced implementations.
 */

import { BattleNetApiClient } from './battlenet-api.client.js';
import { BattleNetApiClientEnhanced } from './battlenet-api-client-enhanced.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';

/**
 * Creates a Battle.net API client instance.
 * Uses the enhanced client if enabled in the configuration, otherwise uses the original client.
 * 
 * @returns A Battle.net API client instance
 */
export function createBattleNetApiClient(): BattleNetApiClient | BattleNetApiClientEnhanced {
  const useEnhanced = process.env.USE_ENHANCED_BNET_CLIENT === 'true' || 
                      config.battlenet?.useEnhancedClient === true;
  
  if (useEnhanced) {
    logger.info('[BattleNetApiClientFactory] Creating enhanced Battle.net API client');
    return new BattleNetApiClientEnhanced();
  } else {
    logger.info('[BattleNetApiClientFactory] Creating standard Battle.net API client');
    return new BattleNetApiClient();
  }
}

/**
 * Creates a shadow testing mode client that calls both implementations.
 * The original client is still used for actual operations, but the enhanced client
 * is also called to validate its behavior without affecting production.
 * 
 * @returns A special proxy that calls both clients
 */
export function createShadowTestClient(): BattleNetApiClient {
  logger.info('[BattleNetApiClientFactory] Creating shadow test Battle.net API client');
  
  const originalClient = new BattleNetApiClient();
  const enhancedClient = new BattleNetApiClientEnhanced();
  
  // Create a proxy to intercept all method calls
  return new Proxy(originalClient, {
    get(target, prop, receiver) {
      const originalMethod = Reflect.get(target, prop, receiver);
      
      // Only proxy methods, not properties
      if (typeof originalMethod !== 'function') {
        return originalMethod;
      }
      
      // Return a function that calls both implementations
      return async function(...args: any[]) {
        try {
          // Start the enhanced client call but don't wait for it
          let enhancedPromise = Promise.resolve(null);
          const enhancedMethod = enhancedClient[prop as keyof BattleNetApiClientEnhanced];

          if (typeof enhancedMethod === 'function') {
            try {
              // Function to log enhanced client errors but continue
              const handleEnhancedResult = async () => {
                try {
                  // Cast to any to avoid TypeScript errors with method signatures
                  return await (enhancedMethod as any).apply(enhancedClient, args);
                } catch (enhancedError) {
                  logger.warn({
                    method: String(prop),
                    error: enhancedError,
                    args: JSON.stringify(args)
                  }, '[BattleNetApiClientFactory] Enhanced client error in shadow mode');
                  return null; // Suppress errors in shadow mode
                }
              };
              
              // Run the enhanced method but don't wait for it
              enhancedPromise = handleEnhancedResult();
            } catch (error) {
              logger.warn({
                method: String(prop),
                error,
                args: JSON.stringify(args)
              }, '[BattleNetApiClientFactory] Enhanced client threw error in shadow mode');
            }
          }
          
          // Continue with the original call
          const originalResult = await originalMethod.apply(target, args);
          
          // Log the comparison asynchronously
          enhancedPromise.then(enhancedResult => {
            // Only log if both succeeded
            if (enhancedResult) {
              try {
                // Compare results at high level
                const originalKeys = Object.keys(originalResult || {});
                const enhancedKeys = Object.keys(enhancedResult || {});
                const keysDiff = {
                  originalOnly: originalKeys.filter(k => !enhancedKeys.includes(k)),
                  enhancedOnly: enhancedKeys.filter(k => !originalKeys.includes(k)),
                  common: originalKeys.filter(k => enhancedKeys.includes(k))
                };
                
                logger.debug({
                  method: String(prop),
                  keysDiff,
                  originalResultType: typeof originalResult,
                  enhancedResultType: typeof enhancedResult
                }, '[BattleNetApiClientFactory] Shadow mode comparison');
              } catch (error) {
                logger.error({
                  error,
                  method: String(prop)
                }, '[BattleNetApiClientFactory] Error comparing results in shadow mode');
              }
            }
          }).catch(error => {
            logger.error({
              error,
              method: String(prop)
            }, '[BattleNetApiClientFactory] Unhandled error in shadow mode promise');
          });
          
          // Always return the original result
          return originalResult;
        } catch (originalError) {
          // If original throws, let it throw
          throw originalError;
        }
      };
    }
  });
}