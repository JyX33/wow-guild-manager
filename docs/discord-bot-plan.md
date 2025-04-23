# Discord Bot Integration Plan for WoW Guild Manager

**1. Goal:**
Integrate a Discord bot with the existing `wow-guild-manager` application to enhance event management by posting events to Discord, reminding users, and allowing Discord account linking.

**2. Code Location:**

* **Proposal:** Integrate the bot's code directly into the existing `backend` project.
* **Directory Structure:** Create a new module within the backend, e.g., `backend/src/modules/discord/`.
* **Justification:**
  * **Leverages Existing Infrastructure:** Allows easy reuse of the existing database connection (Knex), configuration system (dotenv), scheduling (`node-schedule`), TypeScript setup, and potentially shared services or types (e.g., user/event types).
  * **Simplified Data Access:** Direct access to database models and services simplifies fetching event data, user details (including linked Discord IDs), and subscription statuses.
  * **Unified Deployment:** Keeps the bot logic coupled with the backend, simplifying the deployment process as they are deployed together. While separation offers deployment independence, the tight integration required for this bot makes co-location more practical initially.
  * **Consistency:** Maintains consistency with how other backend functionalities might be structured.

**3. Core Components (within `backend/src/modules/discord/`):**

* **Discord Client Service (`discordClient.ts`):**
  * Uses `discord.js` library.
  * Handles initial connection to Discord using the bot token.
  * Registers necessary Gateway Intents (e.g., `GUILDS`, `GUILD_MESSAGES`, `DIRECT_MESSAGES`).
  * Manages the client lifecycle.
* **Configuration (`config.ts` or use existing system):**
  * Loads Discord Bot Token, Guild ID, Target Channel ID(s) from environment variables.
* **Command Handler (`commandHandler.ts`):**
  * Registers slash commands (`/link-discord`, potentially `/upcoming-events`, etc.) with Discord on startup.
  * Listens for `interactionCreate` events from the Discord client.
  * Parses and routes slash commands to appropriate logic.
* **Event Integration Service (`eventIntegration.ts`):**
  * Contains logic to format event data for Discord (e.g., creating embeds).
  * Handles posting new event announcements to the designated Discord channel/thread.
  * Creates and manages Discord threads for events.
  * Updates the `events` table with `discord_message_id` and `discord_thread_id`.
  * *Integration Point:* This service needs to be called from the existing backend logic where events are created or updated (e.g., within the Express route handler for event creation).
* **Reminder Service (`reminderService.ts`):**
  * Uses the existing `node-schedule` library.
  * Sets up scheduled jobs (e.g., daily check).
  * Fetches upcoming events and identifies users who haven't subscribed.
  * Retrieves linked `discord_id` for relevant users.
  * Sends reminder messages (likely DMs) via the Discord Client Service.
* **Database Service (`discordDbService.ts` or integrate into existing DB services):**
  * Provides functions to interact with the database for Discord-related data.
  * Methods: `linkDiscordId(userId, discordId, discordUsername)`, `getUserDiscordId(userId)`, `getDiscordIdByUserId(userId)`, `updateEventDiscordIds(eventId, messageId, threadId)`, `getUsersNotSubscribedToEvent(eventId)`, etc.
  * Uses the existing Knex instance.
* **User Linking Logic (`userLinking.ts`):**
  * Handles the `/link-discord` command flow.
  * Generates a secure, temporary token associated with the Discord user initiating the link.
  * Provides a unique URL (pointing back to the web app) for the user to click.
  * Includes backend endpoint (e.g., `/auth/discord-link`) to verify the token and link the `discord_id` to the currently logged-in web application user.

**4. Database Schema Modifications:**

* **`users` Table:**
  * Add column: `discord_id` (Type: `VARCHAR(20)` or `BIGINT`, Constraint: `UNIQUE`, Nullable: `true`). Stores the user's unique Discord ID. Using `VARCHAR` is often safer for IDs that might exceed standard integer limits.
  * Add column: `discord_username` (Type: `VARCHAR(255)`, Nullable: `true`). Stores the Discord username#discriminator for easier identification (though `discord_id` is the primary key).
* **`events` Table:**
  * Add column: `discord_message_id` (Type: `VARCHAR(20)` or `BIGINT`, Nullable: `true`). Stores the ID of the announcement message posted in Discord.
  * Add column: `discord_thread_id` (Type: `VARCHAR(20)` or `BIGINT`, Nullable: `true`). Stores the ID of the discussion thread created for the event.

**5. Interaction Flows (High-Level):**

* **Linking Discord ID:**

    ```mermaid
    sequenceDiagram
        participant User as Discord User
        participant Bot as Discord Bot (Backend)
        participant Backend as WoW GM Backend API
        participant DB as Database
        participant WebApp as WoW GM Frontend/Auth

        User->>Bot: /link-discord command
        Bot->>DB: Generate unique token, store temporarily with User's Discord ID
        Bot-->>User: DM with link: "[WebApp URL]/auth/discord-link?token=[TOKEN]"
        User->>WebApp: Clicks link (must be logged into WebApp)
        WebApp->>Backend: GET /auth/discord-link?token=[TOKEN] (with user session)
        Backend->>DB: Validate token, retrieve associated Discord ID
        Backend->>DB: Update users table: SET discord_id = [Discord ID], discord_username = [Username] WHERE id = [WebApp User ID]
        Backend->>DB: Delete temporary token
        Backend-->>WebApp: Success confirmation
        WebApp-->>User: Display "Account Linked" page
        Backend->>Bot: (Optional) Notify Bot of success
        Bot-->>User: DM: "Your Discord account is now linked!"
    ```

* **Creating Event & Posting to Discord:**

    ```mermaid
    sequenceDiagram
        participant Creator as Event Creator (Web UI/API)
        participant Backend as WoW GM Backend API
        participant DB as Database
        participant Bot as Discord Bot (Backend Module)
        participant Discord as Discord API

        Creator->>Backend: Create Event Request (API call)
        Backend->>DB: INSERT new event data
        DB-->>Backend: New Event ID
        Backend->>Bot: Trigger: New Event Created (Event Details/ID)
        Bot->>DB: Fetch full event details if needed
        Bot->>Discord: Create Thread in configured channel (Event Title)
        Discord-->>Bot: New Thread ID
        Bot->>Discord: Post formatted event message in Thread
        Discord-->>Bot: New Message ID
        Bot->>DB: UPDATE events SET discord_thread_id = [Thread ID], discord_message_id = [Message ID] WHERE id = [Event ID]
        Backend-->>Creator: Success Response
    ```

* **Sending Unsubscribed Reminders:**

    ```mermaid
    sequenceDiagram
        participant Scheduler as Reminder Service (Backend)
        participant DB as Database
        participant Bot as Discord Bot (Backend Module)
        participant Discord as Discord API

        Scheduler->>Scheduler: Scheduled Job Runs (e.g., daily)
        Scheduler->>DB: Find upcoming events needing reminders
        DB-->>Scheduler: List of Events
        loop For each Event
            Scheduler->>DB: Find users WHERE discord_id IS NOT NULL AND user_id NOT IN (SELECT user_id FROM event_subscriptions WHERE event_id = [Current Event ID])
            DB-->>Scheduler: List of User Records (with discord_id)
            loop For each User Record
                Scheduler->>Bot: Request DM Send (discord_id, event details)
                Bot->>Discord: Send Direct Message (Formatted Reminder)
                Discord-->>Bot: DM Sent Status
            end
        end
    ```

**6. Next Steps & Considerations:**

* **Dependency:** Add `discord.js` to `backend/package.json`.
* **Permissions:** Ensure the bot has the necessary permissions in Discord (Create Threads, Send Messages, Read Messages, potentially Manage Messages if edits/deletions are needed).
* **Error Handling:** Implement robust error handling for Discord API interactions and database operations.
* **Rate Limiting:** Be mindful of Discord API rate limits, especially when sending reminders to many users. Use queues or delays if necessary. `discord.js` handles some rate limiting internally.
* **Configuration:** Securely manage the bot token.
* **Testing:** Develop unit and integration tests for the new Discord module components.
