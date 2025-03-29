# Dead Code and Comment Removal Plan

This plan outlines the steps to clean up the `backend/src/` directory by removing commented-out code, deprecated code, and unused files.

## Analysis Summary

*   **File to Delete:** `backend/src/services/guild-roster.service.ts` (Deprecated and unused).
*   **File to Modify:** `backend/src/services/guild-leadership.service.ts` (Remove comments about removed functions).
*   **Files with Commented Tests:** Several `*.test.ts` files contain commented-out test blocks (e.g., `battlenet-api.client.test.ts`, `battlenet-sync.service.test.ts`).

## Proposed Plan Steps

1.  **Delete Unused Deprecated Service:**
    *   Action: Delete the file `backend/src/services/guild-roster.service.ts`.
    *   Reason: It's explicitly marked as deprecated in comments and confirmed to be unused via search.

2.  **Clean Up Comments in `guild-leadership.service.ts`:**
    *   Action: Read `backend/src/services/guild-leadership.service.ts`.
    *   Action: Identify and remove the specific comment lines mentioning removed functions (e.g., lines 1, 28, 29 based on previous search results).
    *   Reason: Keep the file clean and remove misleading comments about non-existent code.

3.  **Clean Up Commented-Out Tests:**
    *   Action: Read `backend/src/services/battlenet-api.client.test.ts`.
    *   Action: Identify the blocks of commented-out tests (e.g., lines starting with `// // Temporarily commented out...` or similar patterns found in search results).
    *   Action: Remove these commented-out test blocks.
    *   Action: Read `backend/src/jobs/battlenet-sync.service.ts`.
    *   Action: Identify and remove commented-out test blocks and related TODOs within that file.
    *   Reason: Remove non-functional code from test suites to improve clarity and maintainability.

## Plan Diagram

```mermaid
graph TD
    A[Start: Identify Cleanup Targets] --> B{File: guild-roster.service.ts};
    A --> C{File: guild-leadership.service.ts};
    A --> D{Files: *.test.ts};

    B --> E[Action: Delete File];
    C --> F[Action: Read File];
    F --> G[Action: Remove Deprecated Comments];
    D --> H[Action: Read Test Files];
    H --> I[Action: Identify Commented Tests];
    I --> J[Action: Remove Commented Tests];

    E --> K[End: Cleanup Complete];
    G --> K;
    J --> K;