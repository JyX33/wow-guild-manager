// Discord Thread Cleanup Service
import { client as discordClient } from "./discordClient.js";
import logger from "../../utils/logger.js";
import db from "../../db/db.js";
import schedule from "node-schedule";
import { ThreadChannel } from "discord.js";
import process from "node:process";

/**
 * Cleans up Discord threads for events that ended more than 2 hours ago.
 */
async function cleanupEndedEventThreads(): Promise<void> {
  logger.info("[ThreadCleanupJob] Starting Discord thread cleanup check...");
  let eventsToCleanup: {
    id: number;
    discord_thread_id: string;
    title?: string;
    end_time?: string;
  }[] = [];
  try {
    const query = `
            SELECT id, discord_thread_id, title, end_time
            FROM events
            WHERE discord_thread_id IS NOT NULL
              AND end_time IS NOT NULL
              AND end_time <= NOW() - INTERVAL '2 hours';
        `;
    const result = await db.query(query);
    eventsToCleanup = result.rows;
    logger.info(
      `[ThreadCleanupJob] Found ${eventsToCleanup.length} event threads to clean up.`,
    );
  } catch (dbError) {
    logger.error(
      { err: dbError },
      "[ThreadCleanupJob] Error querying events for thread cleanup.",
    );
    return;
  }

  for (const event of eventsToCleanup) {
    try {
      logger.info(
        `[ThreadCleanupJob] Attempting to delete thread for event ID: ${event.id} (${
          event.title || "Untitled"
        })`,
      );
      let thread: ThreadChannel | null = null;
      try {
        const channel = await discordClient.channels.fetch(
          event.discord_thread_id,
        );
        if (
          !channel || !("isThread" in channel) ||
          typeof channel.isThread !== "function" || !channel.isThread()
        ) {
          logger.warn(
            `[ThreadCleanupJob] Channel ${event.discord_thread_id} for event ${event.id} is not a thread. Skipping.`,
          );
          continue;
        }
        thread = channel as ThreadChannel;
      } catch (fetchError: any) {
        if (fetchError.code === 10003) { // Unknown Channel
          logger.warn(
            `[ThreadCleanupJob] Thread ${event.discord_thread_id} for event ${event.id} not found (may have been deleted manually). Clearing discord_thread_id.`,
          );
          await clearDiscordThreadId(event.id);
          continue;
        } else if (fetchError.code === 50001) { // Missing Access
          logger.error(
            `[ThreadCleanupJob] Missing access to thread ${event.discord_thread_id} for event ${event.id}.`,
          );
          continue;
        } else {
          logger.error(
            { err: fetchError },
            `[ThreadCleanupJob] Error fetching thread ${event.discord_thread_id} for event ${event.id}.`,
          );
          continue;
        }
      }

      if (thread) {
        try {
          await thread.delete(
            "Automated cleanup: Event ended more than 2 hours ago.",
          );
          logger.info(
            `[ThreadCleanupJob] Successfully deleted thread ${event.discord_thread_id} for event ${event.id}.`,
          );
          await clearDiscordThreadId(event.id);
        } catch (deleteError: any) {
          logger.error(
            { err: deleteError },
            `[ThreadCleanupJob] Error deleting thread ${event.discord_thread_id} for event ${event.id}.`,
          );
          // Do not clear discord_thread_id if deletion failed
        }
      }
    } catch (eventError) {
      logger.error(
        { err: eventError },
        `[ThreadCleanupJob] Unexpected error processing event ${event.id}.`,
      );
    }
  }
  logger.info("[ThreadCleanupJob] Finished Discord thread cleanup check.");
}

/**
 * Clears the discord_thread_id for an event in the database.
 */
async function clearDiscordThreadId(eventId: number): Promise<void> {
  try {
    await db.query(
      "UPDATE events SET discord_thread_id = NULL WHERE id = $1;",
      [eventId],
    );
    logger.info(
      `[ThreadCleanupJob] Cleared discord_thread_id for event ${eventId}.`,
    );
  } catch (updateError) {
    logger.error(
      { err: updateError },
      `[ThreadCleanupJob] Error clearing discord_thread_id for event ${eventId}.`,
    );
  }
}

/**
 * Schedules the Discord thread cleanup job.
 * The schedule is configurable via THREAD_CLEANUP_CRON_SCHEDULE env variable.
 */
export function scheduleThreadCleanupJob(): void {
  const cronSchedule = process.env.THREAD_CLEANUP_CRON_SCHEDULE ||
    "*/15 * * * *";
  logger.info(
    `[Scheduler] Scheduling Discord thread cleanup job with schedule: "${cronSchedule}"`,
  );
  const job = schedule.scheduleJob(cronSchedule, () => {
    logger.info(
      `[Scheduler] Executing scheduled Discord thread cleanup job (Schedule: "${cronSchedule}")`,
    );
    (async () => {
      try {
        await cleanupEndedEventThreads();
      } catch (jobError) {
        logger.error(
          { err: jobError },
          "[Scheduler] Unexpected error running scheduled Discord thread cleanup job.",
        );
      }
    })();
  });
  if (job) {
    const nextInvocation = job.nextInvocation();
    if (nextInvocation) {
      logger.info(
        `[Scheduler] Discord thread cleanup job scheduled successfully. Next run at: ${nextInvocation.toISOString()} (${nextInvocation.toLocaleString()})`,
      );
    } else {
      logger.warn(
        "[Scheduler] Discord thread cleanup job was scheduled, but could not determine the next invocation time.",
      );
    }
  } else {
    logger.error(
      "[Scheduler] Failed to schedule the Discord thread cleanup job!",
    );
  }
}
