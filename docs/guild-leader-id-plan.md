# Plan: Set Guild Leader ID During Onboarding

**Revised: April 1, 2025**

## Goal

Modify the user onboarding process (`backend/src/services/onboarding.service.ts`) to correctly identify the Guild Master (GM) for each guild associated with a user's characters and update the corresponding guild record in the database.

Instead of assigning a `GUILD_LEADER` role to the *user*, this plan focuses on setting the `leader_id` field on the *guild's* record, linking it to the local character record of the GM.

## Steps

1. **Gather Information (Completed):**
    * Confirmed `guilds` table schema includes `leader_id` (integer), `name`, `realm`, `region`, `bnet_guild_id`, `last_roster_sync`.
    * Confirmed `characters` table schema includes `id` (integer, PK) and `bnet_character_id` (bigint) for linking.

2. **Code Modifications (`backend/src/services/onboarding.service.ts` - `processNewUser` method):**
    * **Remove User Role Logic:** Delete the `isGuildMaster` variable and all associated logic for checking and updating the user's role (previously lines `233`, `266`, `280`, `281`, `286-297`).
    * **Modify Guild Processing Loop (Starts around line `235`):**
        * Iterate through each `guildInfo` from `uniqueGuilds`.
        * **Ensure Local Guild:** Find or create the `localGuild` record using `guildInfo` (existing logic lines `237-252`). Ensure fields like `name`, `realm`, `region`, `bnet_guild_id` are populated.
        * **Fetch Roster:** Fetch the roster via `battleNetApiClient.getGuildRoster` (existing logic lines `255-260`).
        * **Find GM in Roster:** Loop through `roster.members`.
            * Identify the member where `member.rank === 0`.
            * If found, store the GM's Battle.net character ID (`gmBnetId = member.character.id`).
            * Break the *inner* member loop.
        * **Find Local GM Character:** If a `gmBnetId` was found:
            * Look up the local character: `const localGmCharacter = await characterModel.findOne({ bnet_character_id: gmBnetId });`
        * **Update Guild Leader & Sync Time:** If `localGmCharacter` is found:
            * Update the guild record: `await guildModel.update(localGuild.id, { leader_id: localGmCharacter.id, last_roster_sync: new Date() });`
            * Log success.
        * **Handle Missing GM/Character:** Log warnings if no rank 0 member is found in the roster or if the `localGmCharacter` lookup fails for a specific guild.
        * **Ensure Full Iteration:** The loop must continue to the next guild after processing the current one.

3. **Implementation:** Switch to 'code' mode to apply these changes.

## Visual Plan (Mermaid Diagram)

```mermaid
graph TD
    A[Start Onboarding] --> B[Fetch User Profile & Sync Characters];
    B --> C[Fetch Enhanced Character Data];
    C --> D[Extract Unique Guilds from Characters];
    D --> E{Loop through Unique Guilds};
    E -- Next Guild --> F[Find/Create Local Guild Record];
    F --> G[Fetch Guild Roster];
    G -- Roster OK --> H{Update Guild's last_roster_sync};
    G -- Error Fetching --> I[Log Roster Error];
    I --> E; // Continue to next guild
    H --> J{Loop through Roster Members};
    J -- Next Member --> K{Is Member Rank 0?};
    J -- No More Members --> L[Log: No GM found in Roster];
    L --> E; // Continue to next guild
    K -- Yes --> M[Store GM's BNet ID];
    M --> N[Break Inner Member Loop];
    N --> O{Find Local Character by GM's BNet ID};
    O -- Character Found --> P[Update Guild Record: set leader_id = Local GM Character ID];
    P --> E; // Continue to next guild
    O -- Character Not Found --> Q[Log: Local GM Character Not Found];
    Q --> E; // Continue to next guild
    K -- No --> J;
    E -- No More Guilds --> R[Update User Sync Timestamp];
    R --> S[End Onboarding];
