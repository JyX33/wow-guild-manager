# Migration Guide: Battle.net API Client

This guide outlines the steps to migrate from the original `BattleNetApiClient` to the refactored version with improved error handling and response validation.

## Key Changes

1. **HTTP Client Abstraction**: The API client now uses a separate `HttpClient` interface, enabling better testability and potential future flexibility.
2. **Enhanced Error Handling**: Error handling is now centralized with comprehensive mapping from HTTP status codes to application error codes.
3. **Response Validation**: API responses are now validated using type guards to ensure they match the expected structure.
4. **Consistent Error Format**: All API-related errors now follow a consistent structure with detailed context.

## Step 1: Install Dependencies

No additional dependencies are required as the refactoring uses existing packages.

## Step 2: Update Imports

Replace imports from the original client to use the refactored version:

```typescript
// Before
import { BattleNetApiClient } from "../services/battlenet-api.client";

// After
import { BattleNetApiClient } from "../services/battlenet-api.client.refactored";
```

## Step 3: Update Error Handling

The refactored client provides more detailed error information. Update any error handling code to take advantage of this:

```typescript
// Before
try {
  const guildData = await battleNetApiClient.getGuildData(realm, name, region);
  // Process guild data
} catch (error) {
  console.error("Failed to fetch guild data:", error);
  // Handle error
}

// After
try {
  const guildData = await battleNetApiClient.getGuildData(realm, name, region);
  // Process guild data
} catch (error) {
  if (error instanceof AppError) {
    if (error.code === ErrorCode.NOT_FOUND) {
      // Handle 404 specifically
      console.warn(`Guild ${name} not found on realm ${realm}`);
    } else if (error.code === ErrorCode.RATE_LIMITED) {
      // Handle rate limiting specifically
      console.warn("Hit Battle.net rate limit, will retry later");
    } else {
      // Handle other API errors
      console.error(`API Error (${error.status}): ${error.message}`);
    }
  } else {
    // Handle unexpected errors
    console.error("Unexpected error:", error);
  }
}
```

## Step 4: Validate Response Types

The refactored client performs response validation. If you were previously doing additional validation, you may be able to remove redundant checks:

```typescript
// Before
const guildData = await battleNetApiClient.getGuildData(realm, name, region);
if (!guildData || !guildData.id || !guildData.name) {
  throw new Error("Invalid guild data received");
}

// After - validation happens inside the client
const guildData = await battleNetApiClient.getGuildData(realm, name, region);
// No need for basic validation, can directly use the data
```

## Step 5: Update Tests

If you have tests that mock the Battle.net API client, update them to account for the new implementation:

```typescript
// Before
jest.mock("../services/battlenet-api.client", () => ({
  BattleNetApiClient: jest.fn().mockImplementation(() => ({
    getGuildData: jest.fn().mockResolvedValue({
      id: 123,
      name: "Test Guild",
      // other guild properties
    }),
  })),
}));

// After
jest.mock("../services/battlenet-api.client.refactored", () => ({
  BattleNetApiClient: jest.fn().mockImplementation(() => ({
    getGuildData: jest.fn().mockResolvedValue({
      _links: { self: { href: "https://example.com" } },
      id: 123,
      name: "Test Guild",
      // Make sure to include all required properties
      faction: { type: "ALLIANCE", name: "Alliance" },
      achievement_points: 1000,
      member_count: 50,
      realm: { id: 1, name: "Test Realm", slug: "test-realm" },
      created_timestamp: 123456789,
      roster_url: "https://example.com/roster",
    }),
  })),
}));
```

## Step 6: Testing

1. Run the unit tests to ensure the new implementation works as expected:

```bash
cd backend
npm test -- battlenet-api-client
```

2. Manually test key functionality that relies on the Battle.net API to ensure it still works with the new implementation.

## Common Issues

### 1. Missing Response Properties

If you encounter errors about invalid API response structure, it likely means the Battle.net API response doesn't match our expected types. Check the specific validation that's failing and update the type guards in `battlenet-api.types.ts` if needed.

### 2. Error Handling Differences

The refactored client uses more specific error codes. If your code was checking for specific status codes directly, update it to use the new `ErrorCode` enum values instead.

### 3. Integration with Battle.net Sync Service

The Battle.net Sync Service uses the API client extensively. Make sure to test all sync functionality thoroughly after migrating to ensure everything works as expected.

## Benefits of the Refactored API Client

1. **Improved Error Handling**: The refactored client provides more detailed and consistent error information, making debugging and error handling easier.

2. **Better Type Safety**: Response validation ensures that data matches the expected structure, catching potential issues early.

3. **Enhanced Testability**: The abstracted HTTP client makes it easier to test code that uses the Battle.net API client.

4. **Reduced Duplication**: Error handling logic is centralized, reducing code duplication and ensuring consistency.

5. **More Maintainable**: New API methods can be added following the same pattern, ensuring consistency and maintainability.