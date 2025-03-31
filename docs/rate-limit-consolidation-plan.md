# Battle.net Rate Limit Consolidation Plan

## Goal

Consolidate Battle.net API rate limiting logic into `backend/src/services/battlenet-api.client.ts` using the existing `bottleneck` library, and remove the redundant `p-queue` implementation from `backend/src/services/battlenet.service.ts`. This addresses the issue of having two independent rate limiters for the same API, ensuring consistent behavior and accurate limit enforcement.

## Plan Steps

1. **Fix `bottleneck` 429 Retry Logic:** Modify the `scheduleWithRetry` method in `battlenet-api.client.ts` to:
    * Correctly parse the `retry-after` header from the 429 error response.
    * Wait for the duration specified by `retry-after`.
    * Implement a reasonable retry limit (e.g., 3 retries).
2. **Move `axios` Call Logic:** Transfer the core API call implementations (using `axios`) from the methods in `battlenet.service.ts` into new, likely private, methods within `battlenet-api.client.ts`.
3. **Update Client Public Methods:** Ensure `battlenet-api.client.ts` exposes all necessary public methods (e.g., `getGuildData`, `getGuildRoster`, `getEnhancedCharacterData`, `getClientCredentialsToken`, `getAccessToken`, `getUserInfo`, etc.), calling the new internal `axios` methods via the corrected `scheduleWithRetry`.
4. **Update Call Sites:** Modify the following files to import and use an instance of `battlenet-api.client.ts` instead of `battlenet.service.ts`:
    * `backend/tests/integration/battlenet-sync.integration.test.ts`
    * `backend/src/services/onboarding.service.ts`
    * `backend/src/services/battlenet-api.client.test.ts`
    * `backend/src/controllers/character.controller.ts`
    * `backend/src/controllers/auth.controller.ts`
5. **Delete `battlenet.service.ts`:** Once steps 1-4 are complete and verified, the service file should be safe to delete.
6. **Testing:** Thoroughly test the refactored client's functionality, rate limiting, retry behavior, and ensure the controllers/services/tests that were updated still function correctly.

## Visual Plan (Mermaid)

```mermaid
graph TD
    A[Fix bottleneck 429 retry logic in client.ts] --> B(Move axios logic from service.ts to private methods in client.ts);
    B --> C[Update client public methods to use new private methods + scheduleWithRetry];
    C --> D[Update Call Sites];
    D --> E[Delete battlenet.service.ts];
    E --> F[Test Thoroughly];

    subgraph CallSitesToUpdate
        direction LR
        Test1[battlenet-sync.integration.test.ts]
        Service1[onboarding.service.ts]
        Test2[battlenet-api.client.test.ts]
        Controller1[character.controller.ts]
        Controller2[auth.controller.ts]
    end

    subgraph FilesAffected
        direction LR
        ClientTs[battlenet-api.client.ts]
        ServiceTs[battlenet.service.ts]
    end

    A --> ClientTs;
    B --> ServiceTs;
    B --> ClientTs;
    C --> ClientTs;
    D --> Test1;
    D --> Service1;
    D --> Test2;
    D --> Controller1;
    D --> Controller2;
    E --x ServiceTs;
