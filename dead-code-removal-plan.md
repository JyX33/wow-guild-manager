# Plan for Finding and Removing Dead Code

This plan outlines the steps to identify and remove unused code from the `wow-guild-manager` codebase using `ts-prune`.

## Steps

1.  **Install `ts-prune`:**
    *   Add `ts-prune` as a development dependency to the project at the root level.
2.  **Configure `ts-prune`:**
    *   Add a script to the root `package.json` (e.g., `"find-dead-code": "ts-prune"`) for easy execution. `ts-prune` will use the root `tsconfig.json`.
3.  **Run Analysis:**
    *   Execute the `ts-prune` script.
4.  **Review Results:**
    *   Carefully examine the list of potentially unused exports reported by `ts-prune`.
    *   **Crucially, manually verify each reported item.** Static analysis tools can have false positives. Confirm code is truly unused before removal.
5.  **Remove Confirmed Dead Code:**
    *   Delete the verified dead code (functions, classes, types, interfaces, constants, etc.).
    *   Remove any associated imports that become unused after the deletion.
6.  **Verification:**
    *   Run the TypeScript compiler (`tsc --noEmit` or similar build/check command).
    *   Run existing automated tests.
    *   Perform a quick manual check of the application's main functionalities.
7.  **Iteration (Optional):**
    *   If the initial removal reveals more dead code, re-run `ts-prune` and repeat the review/removal process.
8.  **Final Decision on Tool:**
    *   Decide whether to keep `ts-prune` as a dev dependency for ongoing checks or remove it after this cleanup.

## Process Flow

```mermaid
graph TD
    A[Install ts-prune] --> B(Configure ts-prune Script);
    B --> C(Run ts-prune);
    C --> D{Review Results};
    D -- False Positive --> E[Keep Code];
    D -- Confirmed Dead --> F(Remove Code);
    F --> G(Verification);
    G -- Errors --> D;
    G -- OK --> H{More Dead Code?};
    H -- Yes --> C;
    H -- No --> I(Decide: Keep/Remove ts-prune);
    I --> J[End];
    E --> J;