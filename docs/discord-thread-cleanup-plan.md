# Plan: Automatic Discord Event Thread Deletion

## 1. Location of Logic

*   **Recommendation:** Create a new dedicated service file: `backend/src/modules/discord/threadCleanupService.ts`.
*   **Justification:** This isolates the thread cleanup logic from other Discord functionalities like event posting (`eventIntegration.ts`) or reminders (`reminderService.ts`), improving modularity and maintainability.

## 2. Scheduling

*   **Mechanism:** Utilize the existing `node-schedule` library, similar to `reminderService.ts`.
*   **Frequency:** Schedule a recurring job to run periodically. A frequency of every 15 minutes (`*/15 * * * *`) is recommended. This provides a reasonable balance between prompt cleanup and system load. The exact frequency can be made configurable via an environment variable (e.g., `THREAD_CLEANUP_CRON_SCHEDULE`).
*   **Function:** Create an asynchronous function `cleanupEndedEventThreads` within the new service file to perform the check and deletion logic.

## 3. Database Query

*   **Objective:** Identify events that ended more than 2 hours ago and still have an associated Discord thread ID.
*   **Table:** `events`
*   **Columns:** `id`, `discord_thread_id`, `end_time`, `title` (for logging)
*   **Conditions:**
    *   `discord_thread_id IS NOT NULL`
    *   `end_time IS NOT NULL`
    *   `end_time <= NOW() - INTERVAL '2 hours'`
*   **SQL Query:**
    ```sql
    SELECT id, discord_thread_id, title, end_time
    FROM events
    WHERE discord_thread_id IS NOT NULL
      AND end_time IS NOT NULL
      AND end_time <= NOW() - INTERVAL '2 hours';
    ```
*   **Implementation:** Use the `db.query` method from `backend/src/db/db.js` to execute this query within the `cleanupEndedEventThreads` function.

## 4. Discord Interaction

*   **Client:** Import the `client as discordClient` from `../discordClient.js`.
*   **Process:**
    *   Iterate through the list of events retrieved from the database query.
    *   For each event:
        *   Log the attempt to delete the thread for the specific event ID and title.
        *   Use `discordClient.channels.fetch(event.discord_thread_id)` to retrieve the thread channel object. Use a `try...catch` block specifically for this fetch operation.
        *   Verify the fetched channel is a thread using `channel.isThread()`. If not, log a warning and skip.
        *   If the fetch is successful and it's a thread, call `thread.delete('Automated cleanup: Event ended more than 2 hours ago.')`. Use a `try...catch` block for the deletion call.

## 5. Error Handling

*   **Database Query Errors:** Wrap the `db.query` call in a `try...catch` block. Log any errors using the application logger (`logger.error`). The job run will likely terminate prematurely if the DB query fails.
*   **Thread Fetch Errors (`discordClient.channels.fetch`):**
    *   `DiscordAPIError[10003]: Unknown Channel`: The thread likely no longer exists (manually deleted?). Log a warning (`logger.warn`) indicating this and proceed to the database update step (Step 6) to clear the ID.
    *   `DiscordAPIError[50001]: Missing Access`: The bot lacks permissions. Log an error (`logger.error`) detailing the missing permission and the specific thread/channel. Skip this thread.
    *   Other `DiscordAPIError` or network errors: Log the specific error (`logger.error`) and skip processing this thread for this run.
*   **Thread Deletion Errors (`thread.delete`):**
    *   Log the specific error (`logger.error`) including event ID and thread ID. Skip processing this thread for this run (do not proceed to DB update).
*   **General:** Wrap the entire processing loop for each event in a `try...catch` to prevent one failed event from stopping the processing of others in the batch.

## 6. Database Update

*   **Objective:** Prevent repeated attempts to delete threads that have already been successfully deleted or were confirmed as non-existent.
*   **Action:** After a thread is successfully deleted OR if a `DiscordAPIError[10003]: Unknown Channel` error occurs during fetch, update the corresponding event record in the `events` table.
*   **SQL Query:**
    ```sql
    UPDATE events
    SET discord_thread_id = NULL
    WHERE id = $1;
    ```
*   **Implementation:** Execute this query using `db.query` with the specific `event.id`. Wrap this in its own `try...catch` block and log any errors.

## 7. Integration

*   **Export:** Create and export a function `scheduleThreadCleanupJob()` from `backend/src/modules/discord/threadCleanupService.ts`. This function will configure and start the `node-schedule` job using the `cleanupEndedEventThreads` function and the configured cron schedule.
*   **Initialization:** Import `scheduleThreadCleanupJob` into the main application entry point (e.g., `backend/src/server.ts` or wherever `initializeDiscordClient` and `scheduleReminderJob` are called).
*   **Execution:** Call `scheduleThreadCleanupJob()` after the Discord client is ready to ensure the bot is logged in and capable of making API calls.