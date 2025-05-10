# Battle.net Enhanced API Client Documentation

## Overview

The Battle.net Enhanced API Client is a robust replacement for the standard API client, designed to provide better validation, error handling, and resilience to API changes. It uses a validation framework to verify API responses against the expected structure, with the ability to gracefully degrade when only partial data is available.

## Configuration

The enhanced client can be enabled with two environment variables:

- `USE_ENHANCED_BNET_CLIENT`: Set to `true` to use the enhanced client instead of the standard client
- `USE_SHADOW_MODE_BNET_CLIENT`: Set to `true` to run both clients in parallel (shadow mode testing)

These variables can be set in the `.env` file or as environment variables in the deployment environment.

## Shadow Mode Testing

Shadow mode testing is a way to test the enhanced client without affecting production usage. In this mode, the system:

1. Makes the API call using the original client and uses its response
2. Also makes the same API call using the enhanced client in the background
3. Compares the results and logs any differences
4. Always returns the original client's response, so production is unaffected

This mode is useful for testing the enhanced client in production or staging environments without affecting users.

## Validation

The enhanced client validates all API responses against reference types that match the Battle.net API documentation. The validation process:

1. Checks if the response is an object
2. Validates the self-link structure common to all Battle.net API responses
3. Validates critical fields for each specific response type
4. Logs detailed validation failures for debugging

If a response fails validation but contains critical fields, the client will log warnings but continue to process the data, allowing for graceful degradation.

## Adapter Functions

The enhanced client uses adapter functions to transform reference API types to application types. These adapters:

1. Extract English text from localized strings
2. Handle optional fields and provide defaults
3. Maintain structure compatibility with existing application code
4. Ensure type safety throughout the transformation

## Error Handling

The enhanced client provides improved error handling with:

1. Detailed error logging with context
2. Standardized error responses
3. Specific error types for different validation failures
4. Rate limit handling with automatic retries

## Migration

To migrate from the standard client to the enhanced client:

1. Set `USE_ENHANCED_BNET_CLIENT=true` in your environment
2. Monitor logs for validation warnings and failures
3. Address any validation issues in the application code

For a safer migration, use shadow mode testing first by setting `USE_SHADOW_MODE_BNET_CLIENT=true` and monitoring logs for differences between the clients.

## API Reference

The enhanced client implements all methods of the original client with the same parameters and return types:

- `getGuildData(realmSlug, guildNameSlug, region)`: Gets guild data
- `getGuildRoster(region, realmSlug, guildNameSlug)`: Gets guild roster data
- `getCharacter(realmSlug, characterName, region)`: Gets character data
- `getEnhancedCharacterData(realmSlug, characterName, region)`: Gets enhanced character data
- `getCharacterCollectionsIndex(realmSlug, characterName, region)`: Gets character collections

## Factory

The API client factory provides an easy way to create instances of either client:

- `createBattleNetApiClient()`: Creates the appropriate client based on configuration
- `createShadowTestClient()`: Creates a shadow test client that calls both implementations

Use the factory to get client instances instead of creating them directly:

```typescript
// Before
const apiClient = new BattleNetApiClient();

// After
import { createBattleNetApiClient } from './services/battlenet-api-client-factory';
const apiClient = createBattleNetApiClient();
```