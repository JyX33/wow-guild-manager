# Design Plan: Main/Alt Character Classification

**Date:** 2025-03-31

**Author:** Roo (Architect Mode)

## 1. Objective

To design the backend logic for classifying guild members as "Main" or "Alt" within a specific guild context. This classification needs to handle both characters linked to registered users ("Known Users") and characters not linked to registered users ("Unknown Users"), using a hash derived from their toy collection for grouping the latter.

## 2. Proposed Solution Overview

The solution involves:

1.  **Creating a new service:** `CharacterClassificationService` will encapsulate the logic for determining the Main/Alt status based on the defined rules.
2.  **Modifying the existing sync service:** `BattleNetSyncService` will be updated to calculate and store a `toy_hash` for characters not linked to a user (`user_id IS NULL`).
3.  **Leveraging updated models:** The design relies on the schema changes outlined in `docs/main-alt-character-design.md`, specifically the `guild_members.is_main` and `characters.toy_hash` fields, and corresponding model updates (`GuildMemberModel`, `CharacterModel`).

## 3. New Service: `CharacterClassificationService`

*   **File Path:** `backend/src/services/character-classification.service.ts`
*   **Dependencies:**
    *   `GuildMemberModel` (from `../models/guild_member.model.ts`)
    *   `CharacterModel` (from `../models/character.model.ts`)
*   **Primary Method:** `getClassifiedGuildMembers(guildId: number): Promise<ClassifiedMember[]>`
*   **`ClassifiedMember` Type Definition:**
    ```typescript
    import { DbGuildMember, DbCharacter } from '../../../shared/types/guild'; // Adjust path as needed

    // Represents a guild member joined with their character data and classification
    interface ClassifiedMember extends DbGuildMember {
      character: DbCharacter; // Include the full character details
      classification: 'Main' | 'Alt';
      groupKey: string | number | null; // user_id for known, toy_hash for unknown-hashable, null for unknown-unhashable
    }
    ```
*   **Algorithm for `getClassifiedGuildMembers`:**
    1.  **Fetch Data:**
        *   Use `GuildMemberModel` and `CharacterModel` (or a direct DB query) to fetch all `guild_members` for the given `guildId`.
        *   Perform a JOIN with the `characters` table to get necessary character details (`id`, `name`, `user_id`, `toy_hash`).
    2.  **Separate Known/Unknown:**
        *   Iterate through the fetched members.
        *   Create two lists: `knownMembers` (where `character.user_id` is not null) and `unknownMembers` (where `character.user_id` is null).
    3.  **Process Known Users:**
        *   Group `knownMembers` by `character.user_id`.
        *   For each `user_id` group:
            *   Find if any member has `is_main === true`.
            *   If yes: Mark that member as `classification: 'Main'` and all others in the group as `classification: 'Alt'`. Set `groupKey` to the `user_id`.
            *   If no: Apply fallback logic:
                *   Sort the group by `character.name` ASC, then `guild_member.rank` ASC.
                *   Mark the first member in the sorted list as `classification: 'Main'` and all others as `classification: 'Alt'`. Set `groupKey` to the `user_id`.
            *   Add the classified members from this group to a results list.
    4.  **Process Unknown Users:**
        *   Filter `unknownMembers` into two sub-groups: `hashableUnknowns` (where `character.toy_hash` is not null) and `unhashableUnknowns` (where `character.toy_hash` is null).
        *   Group `hashableUnknowns` by `character.toy_hash`.
        *   For each `toy_hash` group:
            *   Apply fallback logic:
                *   Sort the group by `character.name` ASC, then `guild_member.rank` ASC.
                *   Mark the first member in the sorted list as `classification: 'Main'` and all others as `classification: 'Alt'`. Set `groupKey` to the `toy_hash`.
            *   Add the classified members from this group to the results list.
        *   For each member in `unhashableUnknowns`:
            *   Mark them as `classification: 'Main'`.
            *   Set `groupKey` to `null` (or potentially `character.id` if a unique key is desired per unhashable character).
            *   Add the classified member to the results list.
    5.  **Combine & Return:** Return the combined list of all classified members (`ClassifiedMember[]`).

*   **Classification Flow Diagram (Mermaid):**
    ```mermaid
    graph TD
        A[Start getClassifiedGuildMembers(guildId)] --> B{Fetch GuildMembers + Characters for guildId};
        B --> C{Separate Known (user_id != null) & Unknown (user_id == null)};

        C --> D[Process Known Users];
        D --> E{Group by user_id};
        E --> F{For each user group};
        F --> G{is_main == true exists?};
        G -- Yes --> H[Mark is_main as 'Main', others as 'Alt'];
        G -- No --> I[Sort by Name ASC, Rank ASC];
        I --> J[Mark first as 'Main', others as 'Alt'];
        H --> K[Add classified known members (groupKey=user_id) to result];
        J --> K;

        C --> L[Process Unknown Users];
        L --> M{Separate Hashable (toy_hash != null) & Unhashable (toy_hash == null)};

        M --> N[Process Hashable Unknowns];
        N --> O{Group by toy_hash};
        O --> P{For each toy_hash group};
        P --> Q[Sort by Name ASC, Rank ASC];
        Q --> R[Mark first as 'Main', others as 'Alt'];
        R --> S[Add classified hashable members (groupKey=toy_hash) to result];

        M --> T[Process Unhashable Unknowns];
        T --> U{For each unhashable member};
        U --> V[Mark as 'Main'];
        V --> W[Add classified unhashable members (groupKey=null) to result];

        K --> X[Combine all classified members];
        S --> X;
        W --> X;
        X --> Y[Return ClassifiedMember[]];
    ```

## 4. Toy Hash Calculation & Storage

*   **Location:** `backend/src/jobs/battlenet-sync.service.ts`, within the `syncCharacter` method.
*   **Trigger:** This logic should execute only for characters where the `user_id` associated with the `DbCharacter` record being synced is `null`.
*   **API Endpoints:**
    1.  **Character Collections Index:** `/profile/wow/character/{realmSlug}/{characterName}/collections` (Namespace: `profile-{region}`)
    2.  **Toys Collection:** Extract the URL from the `toys.href` field in the response of the index endpoint and call that URL.
*   **Hashing Strategy:**
    1.  Use the `BattleNetApiClient` to fetch data from the **Toys Collection** endpoint (Step 2 above).
    2.  Handle API errors gracefully (e.g., 404 Not Found, rate limits). If the fetch fails or the response doesn't contain a valid `toys` array, use a predefined constant hash string (e.g., calculate `sha256("NO_TOYS_FOUND")` once and store it).
    3.  If the fetch is successful and a `toys` array exists (e.g., `response.toys`):
        *   Extract the toy IDs: `const toyIds = response.toys.map(t => t.toy.id);`
        *   If `toyIds` is empty, use the "NO_TOYS_FOUND" hash.
        *   If `toyIds` is not empty:
            *   Sort the IDs numerically: `toyIds.sort((a, b) => a - b);`
            *   Join the sorted IDs into a single string with a delimiter: `const idString = toyIds.join('|');`
            *   Calculate the SHA-256 hash of `idString` using Node.js `crypto` module: `crypto.createHash('sha256').update(idString).digest('hex');`
    4.  The resulting hexadecimal string is the `toy_hash`.
*   **Integration into `syncCharacter`:**
    1.  Inside `syncCharacter`, after fetching `enhancedData` and before preparing the `updatePayload`.
    2.  Check `if (character.user_id === null)`.
    3.  If true, execute the API calls and hashing strategy described above to get the `toy_hash`.
    4.  Add the calculated `toy_hash` to the `updatePayload` object: `updatePayload.toy_hash = calculatedToyHash;`
    5.  The existing call to `this.characterModel.update(character.id, updatePayload)` will then store the hash.

## 5. Model Updates (Prerequisites)

*   **`CharacterModel` (`backend/src/models/character.model.ts`):**
    *   Ensure the `DbCharacter` type includes `toy_hash: string | null;`.
    *   Verify that the `update` method (or the underlying `BaseModel.update`) correctly handles updating the `toy_hash` column based on the payload. (Based on previous file reads, this likely requires adding `toy_hash` to the allowed update fields if not already handled generically).
*   **`GuildMemberModel` (`backend/src/models/guild_member.model.ts`):**
    *   Already supports the `is_main` field and includes the `setGuildMainCharacter` method for explicit setting by known users.

## 6. Conclusion

This design introduces a dedicated service for classification logic, keeping models focused on data access and the sync service focused on data retrieval and basic persistence. It provides clear algorithms for handling both known and unknown users, leveraging the `is_main` flag and the new `toy_hash` respectively, with defined fallback mechanisms. The toy hash calculation is integrated into the existing character sync process for efficiency.