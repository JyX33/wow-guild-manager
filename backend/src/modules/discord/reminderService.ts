import { client as discordClient } from './discordClient.js';
import logger from '../../utils/logger.js';
import schedule from 'node-schedule';
import db from '../../db/db.js'; // Custom PG Pool client
import { EmbedBuilder, User as DiscordUser } from 'discord.js';
import { Event } from '../../../../shared/types/event.js';
import process from "node:process"; // Use correct Event type

/**
 * Finds upcoming events and sends Discord DM reminders to users
 * who have linked their Discord account but haven't subscribed to the event yet.
 */
async function sendEventReminders(): Promise<void> {
    logger.info('[ReminderJob] Starting event reminder check...');
    try {
        // 1. Find upcoming events (e.g., starting within the next 24 hours) using raw SQL
        const upcomingEventsQuery = `
            SELECT * FROM events
            WHERE start_time > NOW()
            AND start_time <= NOW() + INTERVAL '24 hours'
            ORDER BY start_time ASC;
        `;
        const upcomingEventsResult = await db.query(upcomingEventsQuery);
        const upcomingEvents: Event[] = upcomingEventsResult.rows;

        logger.info(`[ReminderJob] Found ${upcomingEvents.length} upcoming events.`);

        if (upcomingEvents.length === 0) {
            logger.info('[ReminderJob] No upcoming events requiring reminders.');
            return;
        }

        for (const event of upcomingEvents) {
            logger.info(`[ReminderJob] Processing event ID: ${event.id} - ${event.title}`);
            try {
                // 2. Find users with discord_id who are NOT subscribed to this event using raw SQL
                const usersToRemindQuery = `
                    SELECT u.id, u.discord_id
                    FROM users u
                    WHERE u.discord_id IS NOT NULL
                    AND NOT EXISTS (
                        SELECT 1
                        FROM event_subscriptions es
                        WHERE es.user_id = u.id
                        AND es.event_id = $1
                    );
                `;
                const usersToRemindResult = await db.query(usersToRemindQuery, [event.id]);
                const usersToRemind: { id: number, discord_id: string }[] = usersToRemindResult.rows;

                logger.info(`[ReminderJob] Found ${usersToRemind.length} users to remind for event ${event.id}.`);

                if (usersToRemind.length === 0) {
                    continue; // Skip to next event if no users need reminding
                }

                // 3. Send DMs
                for (const user of usersToRemind) {
                    try {
                        // Fetch the Discord user object using the stored ID
                        const discordUser: DiscordUser = await discordClient.users.fetch(user.discord_id);

                        // Create an embed message for the reminder
                        const embed = new EmbedBuilder()
                            .setColor(0xFFCC00) // A distinct reminder color (e.g., yellow/gold)
                            .setTitle(`🗓️ Event Reminder: ${event.title}`)
                            .setDescription(`Just a friendly reminder about the upcoming event **${event.title}** that you haven't signed up for yet!`)
                            .addFields(
                                { name: 'Date & Time', value: new Date(event.start_time).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' }), inline: true },
                                { name: 'Type', value: event.event_type || 'General Event', inline: true },
                                // TODO: Construct a real URL to the event page on your frontend
                                // { name: 'Details', value: `[Click here to view event](YOUR_FRONTEND_EVENT_URL/${event.id})` }
                            )
                            .setTimestamp(new Date(event.start_time)) // Show event start time in embed timestamp
                            .setFooter({ text: `Event ID: ${event.id} | Don't miss out!` });

                        // Send the embed message via DM
                        await discordUser.send({ embeds: [embed] });
                        logger.info(`[ReminderJob] Sent reminder DM to user ${user.id} (Discord: ${user.discord_id}) for event ${event.id}`);

                        // Simple delay to avoid hitting Discord rate limits too quickly
                        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay between DMs

                    } catch (dmError: any) {
                        // Handle common Discord errors gracefully
                        if (dmError.code === 10013) { // Unknown User
                            logger.warn(`[ReminderJob] Discord user ${user.discord_id} (DB User ID: ${user.id}) not found. Maybe they left the server or deleted their account? Skipping.`);
                        } else if (dmError.code === 50007) { // Cannot send messages to this user
                            logger.warn(`[ReminderJob] Cannot send DM to user ${user.discord_id} (DB User ID: ${user.id}). DMs likely disabled or bot blocked. Skipping.`);
                        } else {
                            // Log other unexpected errors
                            logger.error({
                                message: '[ReminderJob] Error sending DM',
                                err: dmError,
                                userId: user.id,
                                discordId: user.discord_id,
                                eventId: event.id
                            });
                        }
                    }
                } // End user loop

            } catch (eventProcessingError) {
                 logger.error({
                    message: '[ReminderJob] Error processing reminders for a specific event',
                    err: eventProcessingError,
                    eventId: event.id
                 });
            }
        } // End event loop

    } catch (error) {
        logger.error({ err: error }, '[ReminderJob] Critical error during reminder job execution');
    } finally {
         logger.info('[ReminderJob] Finished event reminder check.');
    }
}

/**
 * Schedules the event reminder job using node-schedule.
 * The schedule is configurable via the REMINDER_JOB_CRON_SCHEDULE environment variable.
 */
export function scheduleReminderJob(): void {
    // Example: Run every day at 9:00 AM server time ('0 9 * * *')
    // Fallback to 9 AM daily if the environment variable is not set
    const cronSchedule = process.env.REMINDER_JOB_CRON_SCHEDULE || '0 9 * * *';
    logger.info(`[Scheduler] Scheduling reminder job with schedule: "${cronSchedule}"`);

    const job = schedule.scheduleJob(cronSchedule, () => {
         logger.info(`[Scheduler] Executing scheduled reminder job (Schedule: "${cronSchedule}")`);
         // Wrap in async IIFE to handle potential promise rejection from sendEventReminders
         (async () => {
             try {
                 await sendEventReminders();
             } catch (jobError) {
                 // This catch is primarily for unexpected errors within the async wrapper itself,
                 // as sendEventReminders has its own internal error handling.
                 logger.error({ err: jobError }, '[Scheduler] Unexpected error running scheduled reminder job wrapper');
             }
         })();
    });

    if (job) {
        const nextInvocation = job.nextInvocation();
         if (nextInvocation) {
            logger.info(`[Scheduler] Reminder job scheduled successfully. Next run at: ${nextInvocation.toISOString()} (${nextInvocation.toLocaleString()})`);
         } else {
             logger.warn('[Scheduler] Reminder job was scheduled, but could not determine the next invocation time.');
         }
    } else {
        logger.error('[Scheduler] Failed to schedule the reminder job!');
    }
}