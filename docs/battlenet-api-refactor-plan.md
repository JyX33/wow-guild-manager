# Battle.net API Client Refactoring Plan

## 1. Current State Analysis

The `BattleNetApiClient` class in `/backend/src/services/battlenet-api.client.ts` is responsible for interacting with the Battle.net API, handling authentication, rate limiting, and data fetching. While it has good foundations, there are several areas where improvements can be made:

### Strengths
- Uses Bottleneck for rate limiting
- Implements retry logic for 429 errors
- Has detailed logging
- Handles token refresh
- Validates regions

### Areas for Improvement
- **Error Handling**: Error handling is duplicated across methods
- **Response Parsing**: Direct type assertions without validation
- **Type Safety**: Uses `any` in several places
- **Code Duplication**: Similar error handling patterns repeated in many methods
- **Axion Integration**: Direct axios usage without abstraction

## 2. Refactoring Goals

1. **Centralize Error Handling**: Create unified error handling to reduce duplication
2. **Improve Response Parsing**: Add validation for API responses
3. **Enhance Type Safety**: Replace `any` types with explicit interfaces
4. **Abstract HTTP Client**: Decouple from axios to improve testability
5. **Standardize API Method Structure**: Create consistent patterns for all API calls

## 3. Detailed Implementation Plan

### Phase 1: Create Base Types and Utilities

1. **Create API Response Types**
   - Create a `/backend/src/types/battlenet-api.types.ts` file with:
     - `BattleNetApiResponse<T>` - Base interface for all API responses
     - Type guards and validation utilities
     - Specific response interfaces for each API endpoint

2. **Develop API Error Mapper**
   - Create a utility function to map HTTP/API errors to application-specific errors:
     - Map 401 errors to authentication errors
     - Map 403 errors to permission errors
     - Map 404 errors to resource not found errors
     - Map 429 errors to rate limit errors
     - Map 5xx errors to server errors
   - Include details from the Battle.net API in the error object

### Phase 2: HTTP Client Abstraction

1. **Create HTTP Client Interface**
   - Define an interface for HTTP operations:
     ```typescript
     interface HttpClient {
       get<T>(url: string, params?: Record<string, any>, headers?: Record<string, string>): Promise<T>;
       post<T>(url: string, data: any, auth?: { username: string; password?: string }, headers?: Record<string, string>): Promise<T>;
     }
     ```

2. **Implement Axios HTTP Client**
   - Create an axios implementation of the HttpClient interface
   - Handle axios-specific error handling and conversion
   - Add logging middleware

3. **Update BattleNetApiClient Constructor**
   - Accept HttpClient as a constructor parameter
   - Default to AxiosHttpClient if not provided
   - This enables dependency injection for testing

### Phase 3: Centralize Error Handling

1. **Create Response Handler Function**
   - Implement a private method to handle API responses:
     ```typescript
     private handleApiResponse<T>(response: unknown, validator: (data: unknown) => data is T): T {
       if (!validator(response)) {
         throw new AppError('Invalid API response structure', 500, {
           code: ErrorCode.EXTERNAL_API_ERROR,
           details: { 
             type: 'external_api',
             provider: 'battle.net',
             originalData: response 
           }
         });
       }
       return response;
     }
     ```

2. **Create Error Handler Function**
   - Implement a private method to standardize error handling:
     ```typescript
     private handleApiError(error: unknown, context: {
       operation: string;
       resourceType: string;
       resourceId: string;
       jobId?: string;
     }): never {
       // Logic to extract status, message, etc. from error and create AppError
     }
     ```

3. **Create API Call Wrapper**
   - Implement a method to wrap all API calls with error handling:
     ```typescript
     private async callApi<T>(
       jobId: string,
       apiCall: () => Promise<unknown>,
       validator: (data: unknown) => data is T,
       errorContext: {
         operation: string;
         resourceType: string;
         resourceId: string;
       }
     ): Promise<T> {
       try {
         const result = await this.scheduleWithRetry(jobId, apiCall);
         return this.handleApiResponse(result, validator);
       } catch (error) {
         this.handleApiError(error, { ...errorContext, jobId });
       }
     }
     ```

### Phase 4: Refactor API Methods

1. **Update Private API Methods**
   - Update `_doAxiosGet` and `_doAxiosPost` to use the HttpClient
   - Remove direct axios dependency

2. **Refactor Public API Methods**
   - Update methods like `getGuildData`, `getGuildRoster`, etc. to use the new `callApi` method
   - Replace inline error handling with the centralized approach
   - Add response validation using type guards

3. **Enhance Token Management**
   - Refactor token handling to use the new error handling pattern
   - Add refresh token logic improvements if needed

### Phase 5: Testing

1. **Unit Tests**
   - Create tests for HTTP client abstraction
   - Create tests for error handling utilities
   - Create tests for response validation

2. **Integration Tests**
   - Create tests that verify the client works with the actual Battle.net API
   - Create tests for token refresh scenarios
   - Create tests for rate limit handling

## 4. Implementation Details

### Example of Refactored API Method

```typescript
// Before
async getGuildData(
  realmSlug: string,
  guildNameSlug: string,
  region: BattleNetRegion,
): Promise<BattleNetGuild> {
  const validRegion = this._validateRegion(region);
  const token = await this.ensureClientToken();
  const jobId = `guild-${validRegion}-${realmSlug}-${guildNameSlug}`;

  try {
    return await this.scheduleWithRetry(jobId, () => {
      const regionConfig = config.battlenet.regions[validRegion];
      const url = `${regionConfig.apiBaseUrl}/data/wow/guild/${realmSlug}/${
        encodeURIComponent(guildNameSlug)
      }`;
      return this._doAxiosGet<BattleNetGuild>(url, token, {
        namespace: `profile-${validRegion}`,
        locale: "en_US",
      });
    });
  } catch (error: any) {
    const statusCode = error?.status || error?.response?.status ||
      (error instanceof AppError ? error.status : 500);
    throw new AppError(
      `Failed to fetch guild data: ${error.message || String(error)}`,
      statusCode,
      {
        code: ErrorCode.EXTERNAL_API_ERROR,
        details: { realmSlug, guildNameSlug, region: validRegion, jobId },
      },
    );
  }
}

// After
async getGuildData(
  realmSlug: string,
  guildNameSlug: string,
  region: BattleNetRegion,
): Promise<BattleNetGuild> {
  const validRegion = this._validateRegion(region);
  const token = await this.ensureClientToken();
  const jobId = `guild-${validRegion}-${realmSlug}-${guildNameSlug}`;
  const regionConfig = config.battlenet.regions[validRegion];
  const url = `${regionConfig.apiBaseUrl}/data/wow/guild/${realmSlug}/${
    encodeURIComponent(guildNameSlug)
  }`;
  
  return this.callApi<BattleNetGuild>(
    jobId,
    () => this.httpClient.get(
      url, 
      {
        namespace: `profile-${validRegion}`,
        locale: "en_US",
      },
      { Authorization: `Bearer ${token}` }
    ),
    isBattleNetGuild, // Type guard function
    {
      operation: 'fetch',
      resourceType: 'guild',
      resourceId: `${realmSlug}/${guildNameSlug}`,
    }
  );
}
```

### Example Type Guard Implementation

```typescript
// In battlenet-api.types.ts
export interface BattleNetGuild {
  _links: {
    self: {
      href: string;
    };
  };
  id: number;
  name: string;
  faction: {
    type: string;
    name: string;
  };
  achievement_points: number;
  member_count: number;
  realm: {
    id: number;
    name: string;
    slug: string;
  };
  created_timestamp: number;
  roster_url: string;
}

export function isBattleNetGuild(data: unknown): data is BattleNetGuild {
  if (!data || typeof data !== 'object') return false;
  
  const guild = data as Partial<BattleNetGuild>;
  
  return (
    typeof guild._links?.self?.href === 'string' &&
    typeof guild.id === 'number' &&
    typeof guild.name === 'string' &&
    typeof guild.faction?.type === 'string' &&
    typeof guild.faction?.name === 'string' &&
    typeof guild.achievement_points === 'number' &&
    typeof guild.member_count === 'number' &&
    typeof guild.realm?.id === 'number' &&
    typeof guild.realm?.name === 'string' &&
    typeof guild.realm?.slug === 'string' &&
    typeof guild.created_timestamp === 'number' &&
    typeof guild.roster_url === 'string'
  );
}
```

## 5. Advantages of this Approach

1. **Reduced Duplication**: Error handling logic is centralized, reducing code duplication
2. **Improved Type Safety**: Type guards validate responses, catching data inconsistencies early
3. **Better Testability**: HTTP client abstraction allows for easier mocking in tests
4. **Consistent Error Format**: All API-related errors follow a consistent structure
5. **Enhanced Maintainability**: New API methods can be added following the same pattern

## 6. Migration Strategy

1. Implement the HTTP client abstraction and validation types first
2. Refactor one API method at a time, starting with simpler methods
3. Add tests for each refactored method
4. Update consuming services as needed to handle potential changes in error structure

This gradual approach ensures we can validate the refactoring as we go, minimizing the risk of breaking changes.