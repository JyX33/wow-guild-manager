# Design Plan: Main/Alt Characters & Unknown User Grouping

**Date:** 2025-03-31

**Author:** Roo (Architect Mode)

## 1. Goal Recap

The objective is to modify the database schema and corresponding data models to support:

* **Registered Users:** Designating one character as "Main" per guild, with others as "Alts". Includes fallback logic based on name/rank if no main is set.
* **Unknown Users:** Grouping characters (not linked to a registered user) based on a hash derived from their Battle.net toy collection data.

## 2. Proposed Schema Changes

Based on analysis of `users`, `characters`, and `guild_members` tables and models, the following changes are proposed:

* **`characters` Table:**
  * **Remove:** `is_main` (BOOLEAN) - Logic moves to `guild_members`.
  * **Remove:** `guild_id` (INTEGER) - Relationship defined in `guild_members`.
  * **Remove:** `guild_rank` (INTEGER) - Stored in `guild_members`.
  * **Add:** `toy_hash` (VARCHAR, Nullable) - Stores toy collection hash for characters where `user_id IS NULL`. Consider indexing.

* **`guild_members` Table:**
  * **Add:** `is_main` (BOOLEAN, Nullable, Default: FALSE) - Indicates if this character is the designated "Main" for the associated user within this specific guild. `NULL` or `FALSE` indicates an "Alt" or no explicit designation.

## 3. Rationale for Schema Changes

* Moving `is_main` to `guild_members` correctly scopes the designation to a specific guild for a specific character.
* Removing `guild_id` and `guild_rank` from `characters` normalizes the data.
* Adding `toy_hash` to `characters` provides a persistent mechanism for grouping unknown users' characters.

## 4. Unknown User Grouping (Toy Hash)

* **Approach:** Store the hash persistently in `characters.toy_hash`.
* **Why Persistent?** Improves performance (avoids repeated API calls) and reduces rate limit pressure.
* **Trade-offs:** Requires a background process for updates; data might be slightly stale.
* **Implementation Note:** Only calculate/store for characters with `user_id IS NULL`.

## 5. Fallback Logic Support

The proposed schema supports the fallback logic:

* Query `guild_members` joined with `characters`.
* Filter by `guild_id` and `user_id`.
* Order by `character.name` ASC, then `guild_member.rank` ASC.
* The first result is the fallback main if no `guild_members.is_main` is TRUE for that user/guild combination.

## 6. Proposed Model Changes (`*.model.ts`)

* **`backend/src/models/character.model.ts`:**
  * Remove `is_main`, `guild_id`, `guild_rank` from `DbCharacter` type.
  * Remove methods related to global `is_main` (`getMainCharacter`, `setMainCharacter`).
  * Add `toy_hash` property to `DbCharacter`.
  * Update relevant methods (`createCharacter`, `updateCharacter`, `syncCharactersFromBattleNet`, etc.).

* **`backend/src/models/guild_member.model.ts`:**
  * Add `is_main` property to `DbGuildMember` type.
  * Implement `setGuildMainCharacter(guildId, characterId, userId)` method with transactional logic to ensure only one main per user per guild.
  * Update `bulkCreate`, `bulkUpdate` to handle `is_main`.

* **`shared/types/*.ts`:**
  * Update relevant interfaces/types (`DbCharacter`, `Character`, `DbGuildMember`, `GuildMember`) to reflect schema changes.

## 7. Data Relationships Visualization (Mermaid)

```mermaid
erDiagram
    USERS ||--o{ CHARACTERS : "has"
    GUILDS ||--o{ GUILD_MEMBERS : "has"
    CHARACTERS ||--o{ GUILD_MEMBERS : "is"

    USERS {
        integer id PK
        varchar battle_net_id UK
        varchar battle_tag
        varchar access_token
        varchar refresh_token
        timestamp token_expires_at
        timestamp tokens_valid_since
        varchar role
        timestamp last_synced_at
        timestamp created_at
        timestamp updated_at
    }

    CHARACTERS {
        integer id PK
        integer user_id FK "Nullable"
        varchar name
        varchar realm
        varchar region
        varchar class
        integer level
        varchar role
        jsonb profile_json
        jsonb equipment_json
        jsonb mythic_profile_json
        jsonb professions_json
        timestamp last_synced_at
        varchar toy_hash "Nullable, New"
        timestamp created_at
        timestamp updated_at
        bigint bnet_character_id "Nullable"
    }

    GUILDS {
        integer id PK
        varchar name
        varchar realm
        varchar region
        varchar faction
        timestamp created_at
        timestamp updated_at
        timestamp last_synced_at
        integer sync_status
        varchar created_by_user_id "Nullable"
    }

    GUILD_MEMBERS {
        integer id PK
        integer guild_id FK
        integer character_id FK
        integer rank
        boolean is_main "Nullable, Default: FALSE, New"
        varchar character_name "Denormalized?"
        varchar character_class "Denormalized?"
        jsonb member_data_json "Nullable"
        timestamp created_at
        timestamp updated_at
    }
