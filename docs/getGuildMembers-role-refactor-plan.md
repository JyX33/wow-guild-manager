# Refactor `getGuildMembers` Role Determination Plan

**Objective:** Modify the `getGuildMembers` function in `backend/src/controllers/guild.controller.ts` to determine character roles (Tank, Healer, DPS) based on their active specialization (`active_spec.name`) fetched from the database, rather than the current class-based guessing logic.

**Current State:** The function currently parses `roster_json` from the `guilds` table and uses basic logic based on `playable_class.name` to assign a default role. This is inaccurate as it doesn't account for the character's actual specialization.

**Proposed Changes:**

1. **Fetch Guild Members from DB:** Instead of relying solely on `roster_json`, fetch the definitive list of guild members for the given `guildId` from the `guild_members` table using `guildMemberModel.findByGuildAndRanks(guildIdInt)`. Let the result be `dbGuildMembers`.
2. **Handle Empty Roster:** If `dbGuildMembers` is empty, return an empty array immediately.
3. **Extract Character IDs:** Collect all unique `character_id` values from the `dbGuildMembers` array.
4. **Fetch Character Details:** Fetch the corresponding `DbCharacter` records from the `characters` table for these `character_id`s using `characterModel.findByIds(characterIds)`. Let the result be `dbCharacters`.
5. **Create Character Map:** Build a `Map` where the key is `character_id` and the value is the corresponding `DbCharacter` object from `dbCharacters` for efficient lookup.
6. **Define Role Logic (Utility Function):** Create a helper function `determineRoleFromSpec(specName: string | undefined): CharacterRole` within the controller file. This function will take an active spec name (e.g., "Protection", "Holy", "Frost") and return the corresponding role ('Tank', 'Healer', 'DPS') based on keywords (similar to logic in `getEnhancedGuildMembers`). Default to 'DPS' if the spec name is undefined or doesn't match known Tank/Healer keywords.
7. **Map Members to Response:** Iterate through the `dbGuildMembers` array. For each `dbMember`:
    * Look up the corresponding `DbCharacter` from the `characterMap` using `dbMember.character_id`.
    * Determine the `character_class`: Use `dbCharacter.class` if the character was found, otherwise use `dbMember.character_class` if available, falling back to 'Unknown'.
    * Determine the `character_role`:
        * Initialize `role` to 'DPS'.
        * If the `dbCharacter` was found, attempt to parse its `profile_json`.
        * If `profile_json` and `profile_json.active_spec.name` exist, use the `determineRoleFromSpec` helper function to set the `role`.
    * Construct a `GuildMember` object for the API response, populating fields like `id` (from `dbMember.id`), `guild_id`, `character_id`, `character_name` (from `dbMember` or fallback), `character_class`, `character_role`, `rank` (from `dbMember`), `isMain` (from `dbMember`), and optionally `user_id` (from `dbCharacter`).
8. **Return Result:** Return the array of constructed `GuildMember` objects.

**Data Flow (Sequence Diagram):**

```mermaid
sequenceDiagram
    participant C as Client
    participant Ctrl as guild.controller
    participant GM_Model as guildMember.model
    participant Char_Model as character.model
    participant DB as Database

    C->>+Ctrl: GET /api/guilds/:guildId/members
    Ctrl->>+GM_Model: findByGuildAndRanks(guildId)
    GM_Model->>+DB: SELECT * FROM guild_members WHERE guild_id = $1
    DB-->>-GM_Model: dbGuildMembers[]
    GM_Model-->>-Ctrl: dbGuildMembers[]
    alt No Members Found
        Ctrl-->>-C: { success: true, data: [] }
    else Members Found
        Ctrl->>Ctrl: Extract characterIds from dbGuildMembers
        Ctrl->>+Char_Model: findByIds(characterIds)
        Char_Model->>+DB: SELECT * FROM characters WHERE id = ANY($1)
        DB-->>-Char_Model: dbCharacters[]
        Char_Model-->>-Ctrl: dbCharacters[]
        Ctrl->>Ctrl: Create characterMap (id -> DbCharacter)
        Ctrl->>Ctrl: Define determineRoleFromSpec() helper
        loop for each dbMember in dbGuildMembers
            Ctrl->>Ctrl: Find dbCharacter in characterMap
            Ctrl->>Ctrl: Parse profile_json (if dbCharacter exists)
            Ctrl->>Ctrl: Call determineRoleFromSpec(active_spec.name)
            Ctrl->>Ctrl: Construct GuildMember response object
        end
        Ctrl-->>-C: { success: true, data: GuildMember[] }
    end
```

**Next Step:** Switch to "Code" mode to implement these changes.
