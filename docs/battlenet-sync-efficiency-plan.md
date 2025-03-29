# Battle.net Sync Service Efficiency Improvement Plan

This plan outlines the steps to improve the efficiency of the `BattleNetSyncService` by introducing concurrency and respecting Battle.net API rate limits.

**Rate Limits:**

* Per Second: 100 requests/sec
* Per Hour: 36,000 requests/hour

**Core Strategy:**

* Use the `bottleneck` library to manage API request rates and concurrency.
* Parallelize the processing of guilds and characters using `Promise.allSettled`.

## Phase 1: Implement Rate Limiting in `BattleNetApiClient`

1. **Add Dependency:** Install `bottleneck` (`npm install bottleneck` or `bun add bottleneck` in the `backend` directory).
2. **Integrate Limiter:** Modify `backend/src/services/battlenet-api.client.ts`.
    * Import `Bottleneck`.
    * Create a `Bottleneck` instance with configurable settings:
        * `reservoir`: 36000
        * `reservoirRefreshAmount`: 36000
        * `reservoirRefreshInterval`: `3600 * 1000` (1 hour)
        * `maxConcurrent`: Read from `process.env.BNET_MAX_CONCURRENT` (default: 20).
        * `minTime`: Read from `process.env.BNET_MIN_TIME_MS` (default: 10ms).
3. **Implement Retry Logic:**
    * Create a private helper method `scheduleWithRetry<T>(taskFn: () => Promise<T>): Promise<T>` within `BattleNetApiClient`.
    * This method will use `this.limiter.schedule()`.
    * Inside the scheduled function, use `try...catch` to call the `taskFn`.
    * If a 429 error is caught (check `error.status` or similar, depending on `battleNetService` error structure):
        * Log a warning.
        * Calculate wait time: `(1000 - (Date.now() % 1000)) + 50`.
        * Wait using `await new Promise(resolve => setTimeout(resolve, waitTime))`.
        * Retry `taskFn` once.
        * If retry fails or the original error wasn't 429, re-throw the error.
4. **Wrap API Calls:**
    * Modify `getGuildData`, `getGuildRoster`, and `getEnhancedCharacterData` to pass their respective `battleNetService` calls (as functions) to `this.scheduleWithRetry()`.
    * Ensure the `.catch()` block in these methods handles errors appropriately after potential retries.

## Phase 2: Parallelize Sync Logic in `BattleNetSyncService`

1. **Modify `runSync`:** Update `backend/src/jobs/battlenet-sync.service.ts`.
    * Fetch `outdatedGuilds` and `outdatedCharacters` as before.
    * Replace sequential `for...of` loops with parallel processing:

        ```typescript
        // For Guilds
        const guildSyncPromises = outdatedGuilds.map(guild =>
          this.syncGuild(guild).catch(error => {
            console.error(`[SyncService] Failed sync for guild ${guild.id}:`, error);
            // Return null or a specific error object if needed downstream
            return { status: 'rejected', reason: error };
          })
        );
        const guildResults = await Promise.allSettled(guildSyncPromises);
        // Log summary of guildResults if desired

        // For Characters
        const characterSyncPromises = outdatedCharacters.map(character =>
          this.syncCharacter(character).catch(error => {
            console.error(`[SyncService] Failed sync for character ${character.id}:`, error);
            return { status: 'rejected', reason: error };
          })
        );
        const characterResults = await Promise.allSettled(characterSyncPromises);
        // Log summary of characterResults if desired
        ```

    * Remove any manual `setTimeout` delays previously used for pacing.

## Phase 3: Refinement & Testing

1. **Configuration:** Ensure `BNET_MAX_CONCURRENT` and `BNET_MIN_TIME_MS` are documented and used from environment variables.
2. **Monitoring:** Add logging around the limiter (e.g., using `bottleneck` events like `RECEIVED`, `QUEUED`, `EXECUTING`, `DONE`, `ERROR`, `FAILED`) and API call outcomes (success, failure, retries).
3. **Unit Tests:**
    * Test the `scheduleWithRetry` logic in `BattleNetApiClient`, mocking `battleNetService` calls and verifying retry behavior on 429s.
    * Test `runSync` in `BattleNetSyncService` to ensure it calls `.map` and `Promise.allSettled`, mocking `syncGuild` and `syncCharacter`.
4. **Integration Tests:**
    * Test the full flow with a real `Bottleneck` instance and mocked `battleNetService` responses.
    * Simulate scenarios with many items to sync to verify concurrency and rate limiting.
    * Simulate 429 responses to test the retry mechanism.

## Conceptual Flow Diagram

```mermaid
graph TD
    subgraph Sync Process (runSync)
        A[Start] --> B(Fetch Outdated Guilds);
        B --> C(Fetch Outdated Characters);
        C --> D{Map Guilds to syncGuild Promises};
        D --> E(Promise.allSettled Guilds);
        E --> F{Map Characters to syncCharacter Promises};
        F --> G(Promise.allSettled Characters);
        G --> H[End];
    end

    subgraph Individual Sync (syncGuild / syncCharacter)
        I[Start Sync Item] --> J(Call ApiClient Methods);
    end

    subgraph BattleNetApiClient
        K[API Method Called] --> L{scheduleWithRetry};
        L -- Uses --> M{limiter.schedule};
        M -- Queues/Throttles --> N(Call battleNetService);
        N -- On 429 Error --> O{Wait & Retry Once};
        O -- Success --> P[Return Data];
        N -- Success --> P;
        O -- Failure --> Q[Throw Error];
        N -- Other Error --> Q;
        P --> R[Return Data / Error to Sync Service];
        Q --> R;
    end

    D -- Triggers Multiple --> I;
    F -- Triggers Multiple --> I;
    J --> K;

    style M fill:#f9f,stroke:#333,stroke-width:2px
    style O fill:#ffcc00,stroke:#333,stroke-width:1px
