# Refactoring Plan: Battle.net Sync Service

**Goal:** Improve the reliability, data integrity, and efficiency of the guild and character synchronization process.

**Phase 1: Critical Fixes & Core Logic Adjustments**

1. **Fix Outdated Guild Selection:**
    * **File:** `backend/src/models/guild.model.ts`
    * **Action:** Uncomment lines 19 and 22 in the `findOutdatedGuilds` function to re-enable filtering guilds based on the `last_updated` timestamp.
    * **Rationale:** Addresses Blocking Point #1. Ensures the service prioritizes guilds that actually need syncing.

2. **Correct Guild Member Matching:**
    * **File:** `backend/src/jobs/battlenet-sync.service.ts`
    * **Function:** `syncGuildMembersTable`
    * **Action:**
        * Modify the SQL query (around line 219) to `JOIN` the `guild_members` table with the `characters` table on `guild_members.character_id = characters.id`.
        * Select `characters.realm` (assuming this column holds the slug) instead of trying to select `realm` from `guild_members`.
        * Update the creation of `existingMembersMap` (lines 225-231) to use the `realm` slug fetched from the joined `characters` table when constructing the `charactername-realmslug` key.
    * **Rationale:** Addresses Inconsistency #2 and schema finding. Ensures members are correctly matched between the roster and the database.

3. **Implement Correct Leader ID Handling:**
    * **File:** `backend/src/jobs/battlenet-sync.service.ts`
    * **Function:** `_updateCoreGuildData`
    * **Action:**
        * If no Guild Master (rank 0) is found in the roster, explicitly set `updatePayload.leader_id = null`.
        * If the user lookup for the GM fails (`catch` block, line 79), explicitly set `updatePayload.leader_id = null`.
        * If the user lookup succeeds but finds no user (`else` block, line 74), explicitly set `updatePayload.leader_id = null`.
    * **Rationale:** Addresses Inconsistency #1 and User Feedback #3. Ensures the `leader_id` is accurately cleared when necessary.

4. **Implement Guild Queueing for Character Sync:**
    * **File:** `backend/src/jobs/battlenet-sync.service.ts`
    * **Function:** `_prepareCharacterUpdatePayload`
    * **Action:**
        * Inside the `if (bnet_guild_id)` block (around line 434):
            * If `localGuild = await this.guildModel.findOne({ bnet_guild_id: bnet_guild_id });` results in `null` (guild not found locally):
                * **Do not** immediately set `updatePayload.guild_id = undefined`.
                * Instead: Call a (new or existing) function to add this `bnet_guild_id` (along with necessary info like name/realm/region if available from the character profile) to a queue or trigger an immediate sync for *that specific guild*. This might involve adding the guild to the `guilds` table with minimal data and marking it for immediate sync.
                * For the current character update, leave `updatePayload.guild_id` unset or set it to the character's *current* `guild_id` from the DB to avoid incorrectly marking them as guildless temporarily. The link will be corrected when the guild sync completes and potentially triggers a character update or during the next character sync.
        * Adjust the logic setting `updatePayload.region` (line 464) to ensure it prioritizes the region from the (potentially newly found/queued) `localGuild` if available, otherwise falling back to the character's existing region.
    * **Rationale:** Addresses Blocking Point #3 and User Feedback #4. Prevents incorrect guild linking and ensures missing guilds are eventually added and synced.

**Phase 2: Enhancements & Refinements**

5. **Enable Rank Cleanup:**
    * **File:** `backend/src/jobs/battlenet-sync.service.ts`
    * **Function:** `_syncGuildRanks`
    * **Action:** Uncomment the logic block (lines 405-410) that iterates through `existingRanks` and sets the `member_count` to 0 for ranks found in the DB but not in the current roster.
    * **Rationale:** Addresses Inconsistency #4. Keeps rank data clean.

6. **Improve Typing:**
    * **Files:** `backend/src/jobs/battlenet-sync.service.ts`, potentially `shared/types/battlenet.ts` (or similar)
    * **Action:** Define specific TypeScript interfaces for the expected structures of `guildData` (from `getGuildData`) and `enhancedData` (from `getEnhancedCharacterData`). Use these interfaces instead of `any`.
    * **Rationale:** Addresses Inconsistency #5. Improves code safety and maintainability.

7. **Optimize Character Creation (Optional):**
    * **File:** `backend/src/jobs/battlenet-sync.service.ts`
    * **Function:** `syncGuildMembersTable`
    * **Action:** If the `characterModel` supports bulk creation, refactor the loop (lines 274-283) to first collect all `charactersToCreate` data and then perform a single bulk insert operation before creating the guild members.
    * **Rationale:** Addresses Inconsistency #3. Potential performance improvement for large rosters.

8. **Review Transaction Usage (Optional):**
    * **File:** `backend/src/jobs/battlenet-sync.service.ts`
    * **Function:** `_updateCoreGuildData`
    * **Action:** Evaluate if the sequence of user lookup and guild update warrants being wrapped in a database transaction using the `withTransaction` helper for atomicity.
    * **Rationale:** Addresses Inconsistency #6. Minor improvement to data consistency guarantees.

9. **Parallelize API Calls (Optional):**
    * **File:** `backend/src/jobs/battlenet-sync.service.ts`
    * **Function:** `syncGuild`
    * **Action:** Modify lines 104-107 to use `Promise.all` to fetch `guildData` and `guildRoster` concurrently.
    * **Rationale:** Addresses Inconsistency #7. Minor performance improvement for individual guild syncs.

**Diagram: Proposed Character-Guild Link Flow**

```mermaid
graph TD
    A[Start syncCharacter(character)] --> B{Character has bnet_guild_id?};
    B -- Yes --> C{Find local guild by bnet_guild_id};
    B -- No --> F[Prepare update payload (guild_id=null)];
    C -- Found (localGuild) --> D[Prepare update payload (guild_id=localGuild.id)];
    C -- Not Found --> E{Queue missing guild for sync};
    E --> F;
    F --> G[Update character in DB];
    D --> G;
    G --> H[End syncCharacter];

    subgraph Queue Guild Sync
        E --> Q1[Add guild info to queue/DB];
        Q1 --> Q2[Mark guild for immediate sync];
    end

    style F fill:#f9f,stroke:#333,stroke-width:2px
    style E fill:#ccf,stroke:#333,stroke-width:2px
