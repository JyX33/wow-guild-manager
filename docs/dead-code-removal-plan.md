# Frontend Dead Code Removal Plan (2025-03-29)

## Objective

Identify and remove unused components, hooks, and utility files from the `frontend/src` directory to reduce codebase size and improve maintainability.

## Analysis Summary

- **Endpoint Verification:** A review confirmed that the frontend API configuration correctly uses the `/api` base URL, matching the backend setup. All defined API services (`auth`, `character`, `event`, `guild`) are imported and utilized within the frontend application. No endpoint mismatches were identified.
- **Dead Code Identification:** A thorough search for imports across all `.ts` and `.tsx` files within `frontend/src` was conducted.

## Files Identified for Removal

The following files were found to have no imports and are planned for removal:

1. `frontend/src/components/SyncGuildRosterButton.tsx`
2. `frontend/src/hooks/useRequireAuth.ts`
3. `frontend/src/utils/api-helpers.ts`

## Action

Proceed with deleting the three files listed above.
