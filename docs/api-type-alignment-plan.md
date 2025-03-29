# Plan: Frontend/Backend API Alignment and Type Unification

**Objective:** Ensure frontend API calls match backend endpoints and that shared types are used consistently, using backend definitions as the reference while allowing for necessary frontend additions.

**Analysis Findings:**

1. **API Client:** Frontend uses `axios` via `apiRequest` wrapper, correctly configured for `/api` base URL and credentials.
2. **Shared Types:** Both projects use `@shared/*` path aliases for types in `shared/types`.
3. **Endpoint Mismatches:**
    * Missing `DELETE /api/events/:eventId/subscribe` endpoint in the backend for event unsubscribing.
    * Frontend calls deprecated `POST /api/guilds/:guildId/sync-roster` endpoint.
4. **Type Mismatches:**
    * `GET /api/guilds/:guildId/members` returns `BattleNetGuildMember[]` instead of the expected `GuildMember[]`.

**Implementation Steps:**

**Part 1: Backend Modifications**

1. **Add Missing Event Unsubscribe Endpoint:**
    * **File:** `backend/src/routes/event.routes.ts`
    * **Action:** Add a new route definition:

        ```typescript
        router.delete('/:eventId/subscribe', authMiddleware.authenticate, eventController.unsubscribeFromEvent);
        ```

    * **File:** `backend/src/controllers/event.controller.ts`
    * **Action:** Implement the `unsubscribeFromEvent` controller function. This function should:
        * Find the subscription based on `eventId` and `req.user.id`.
        * If found, call `subscriptionModel.delete(subscriptionId)`.
        * Return a success message.
        * Handle cases where the subscription is not found (404).
    * **File:** `backend/src/models/subscription.model.ts`
    * **Action:** Ensure a `delete` function exists to remove a subscription by its ID.

2. **Address Deprecated Guild Sync Endpoint:**
    * **File:** `backend/src/routes/guild.routes.ts`
    * **Action:** Remove the route definition for `POST /:guildId/sync-roster`.

        ```typescript
        // Remove this block:
        // router.post('/:guildId/sync-roster',
        //   authMiddleware.authenticate,
        //   isGuildMaster,
        //   guildController.syncGuildCharacters
        // );
        ```

    * **File:** `backend/src/controllers/guild.controller.ts`
    * **Action:** Remove the `syncGuildCharacters` controller function entirely.

3. **Fix `getGuildMembers` Type Mismatch:**
    * **File:** `backend/src/controllers/guild.controller.ts`
    * **Action:** Modify the `getGuildMembers` function. Instead of returning `members: BattleNetGuildMember[]` directly from `roster_json`, map this array to the `GuildMember[]` type defined in `shared/types/guild.ts`.
        * Iterate through the `BattleNetGuildMember[]`.
        * For each member, create a `GuildMember` object, extracting relevant fields like `character.name`, `character.playable_class.name`, `rank`, etc. Determine `character_role` based on class/spec if possible (similar logic to `getEnhancedGuildMembers`).
        * Return the mapped `GuildMember[]` array.

**Part 2: Frontend Modifications**

1. **Remove Deprecated Guild Sync Call:**
    * **File:** `frontend/src/services/api/guild.service.ts`
    * **Action:** Remove the `syncGuildRoster` function.
    * **Action:** Search the frontend codebase (`frontend/src`) for any usage of `guildService.syncGuildRoster` and remove those calls. Update UI elements (e.g., buttons) that triggered this function, perhaps disabling them or providing information that syncs happen automatically.

**Part 3: Verification**

1. **Testing:** After implementing the changes, thoroughly test the affected features:
    * Event subscribing and unsubscribing.
    * Displaying basic guild member lists.
    * Any UI related to manual guild syncing.
2. **Type Checking:** Run `tsc --noEmit` in both `frontend` and `backend` directories to ensure type consistency after the changes.

**Diagram (Illustrating Type Flow for `getGuildMembers` Fix):**

```mermaid
sequenceDiagram
    participant FE as Frontend (guild.service.ts)
    participant BE_Ctrl as Backend (guild.controller.ts)
    participant BE_Model as Backend (guild.model.ts)
    participant DB as Database

    FE->>BE_Ctrl: GET /api/guilds/:id/members
    BE_Ctrl->>BE_Model: findById(id)
    BE_Model->>DB: SELECT * FROM guilds WHERE id = :id
    DB-->>BE_Model: DbGuild (with roster_json)
    BE_Model-->>BE_Ctrl: DbGuild
    BE_Ctrl->>BE_Ctrl: Parse roster_json -> BattleNetGuildMember[]
    BE_Ctrl->>BE_Ctrl: Map BattleNetGuildMember[] to GuildMember[]
    BE_Ctrl-->>FE: ApiResponse<GuildMember[]>
