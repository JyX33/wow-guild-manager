# Unused Exports Analysis

This document provides an analysis of unused exports identified in the WoW Guild
Manager codebase using ts-prune.

## Summary

We've identified several types of unused exports:

1. **Shared type definitions**: A large number of types in
   `shared/types/index.ts` appear to be unused. These may be:
   - Types used in frontend but not backend
   - Types intended for future use
   - Legacy types no longer needed

2. **Error factory functions**: Several error creation functions in
   `src/utils/error-factory.ts` appear unused
   - `createDatabaseError`
   - `createExternalApiError`
   - `createUnauthorizedError`
   - `createForbiddenError`
   - `createRateLimitError`
   - `createAppError`

3. **Other specific functions**:
   - `deleteToken` in `src/modules/discord/discordTokenStore.ts`
   - `default` export in `src/utils/logger.js.d.ts`

## Analysis and Recommendations

### Shared Types (shared/types/index.ts)

Most of these type definitions appear to be in the shared types directory,
suggesting they may be used by the frontend, even if not directly referenced in
the backend code. Before removing any types, verify they are not used in the
frontend code.

**Recommended Action**: Review usage in frontend code before removing any shared
types.

### Error Factory Functions (src/utils/error-factory.ts)

The error factory functions appear to be unused but may be intended for future
error handling improvements or specific error cases that haven't been
encountered in testing.

**Recommended Action**: Review each error factory function:

1. `createDatabaseError` - Consider retaining for database error handling
2. `createExternalApiError` - Likely important for Battle.net API errors
3. `createUnauthorizedError` - Likely needed for auth flows
4. `createForbiddenError` - Important for permission handling
5. `createRateLimitError` - Needed for API rate limiting
6. `createAppError` - Generic error factory, may be useful

### Discord Token Store (src/modules/discord/discordTokenStore.ts)

The `deleteToken` function in the Discord token store appears unused. This may
be a function intended for user logout or token revocation that isn't currently
being called.

**Recommended Action**: Review Discord integration for potential need to
delete/revoke tokens.

## Implementation Plan

1. **First phase**: Safely remove obvious dead code:
   - Identify and remove any code that's definitely not used in frontend or
     backend

2. **Second phase**: Review shared types:
   - Check frontend code for usage of shared types
   - Document or update any ambiguous types
   - Remove any confirmed unused types

3. **Third phase**: Error handling improvements:
   - Review error handling approach
   - Ensure error factory functions are properly utilized or removed

## How to Run the Analysis

We've added a script to help identify unused exports:

```bash
# Run the basic analysis
npm run find-unused-exports

# Filter to specific directories
npm run find-unused-exports -- --filter "src/"

# Exclude exports marked as "used in module"
npm run find-unused-exports -- --ignore "(used in module)"

# Combined filtering
npm run find-unused-exports -- --filter "src/" --ignore "(used in module)"

# Get JSON output
npm run find-unused-exports -- --json
```

## Next Steps

1. Review each identified unused export
2. Determine if exports are actually used in the frontend
3. Create a prioritized list of code to safely remove
4. Implement changes with proper testing
