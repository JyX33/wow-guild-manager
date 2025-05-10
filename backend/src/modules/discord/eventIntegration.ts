import { client as discordClient } from "./discordClient.js";
import logger from "../../utils/logger.js";
import { EmbedBuilder, TextChannel } from "discord.js";
import eventModelInstance from "../../models/event.model.js";
import { Event } from "../../../../shared/types/event.js";
import process from "node:process";

/**
 * Posts event details to Discord by creating a thread in the configured channel,
 * posting an embed message, and updating the event record with Discord IDs.
 * @param event DbEvent - The event data to post.
 */
export async function postEventToDiscord(event: Event): Promise<void> {
  logger.info(`Attempting to post event ID ${event.id} to Discord.`);

  if (!event.id) {
    logger.error("Event data is missing ID. Cannot post to Discord.");
    return;
  }

  const channelId = process.env.DISCORD_EVENT_CHANNEL_ID;
  if (!channelId) {
    logger.error(
      "DISCORD_EVENT_CHANNEL_ID environment variable not set. Cannot post event.",
    );
    return;
  }

  try {
    const channel = await discordClient.channels.fetch(channelId);

    if (!channel) {
      logger.error(`Configured Discord channel (${channelId}) not found.`);
      return;
    }

    if (!(channel instanceof TextChannel)) {
      logger.error(
        `Configured Discord channel (${channelId}) is not a text channel.`,
      );
      return;
    }

    // --- Create Thread ---
    const threadName = `Event: ${event.title || `Event ID ${event.id}`}`;
    const thread = await channel.threads.create({
      name: threadName.substring(0, 100), // Max thread name length is 100
      autoArchiveDuration: 1440, // 1 day (can be configured)
      reason: `Discussion thread for event ID ${event.id}`,
    });
    logger.info(
      `Created thread ${thread.id} for event ${event.id} in channel ${channelId}`,
    );

    // --- Format Embed ---
    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle(event.title || "Upcoming Event")
      .setDescription(event.description || "No description provided.")
      .addFields(
        {
          name: "Date & Time",
          value: event.start_time
            ? new Date(event.start_time).toLocaleString("en-US", {
              dateStyle: "full",
              timeStyle: "short",
            })
            : "Not specified",
        },
        {
          name: "Location",
          value: event.event_details?.location || "Not specified",
        },
        // Add more fields as needed (e.g., sign-up link, organizer)
      )
      .setTimestamp(new Date())
      .setFooter({ text: `Event ID: ${event.id}` });

    // --- Post Message ---
    const message = await thread.send({ embeds: [embed] });
    logger.info(`Posted event message ${message.id} to thread ${thread.id}`);

    // --- Update DB ---
    await eventModelInstance.update(event.id, {
      discord_thread_id: thread.id,
      discord_message_id: message.id,
    });
    logger.info(`Updated event ${event.id} record with Discord IDs.`);
  } catch (error) {
    logger.error(
      { err: error, eventId: event.id },
      "Failed to post event to Discord or update database.",
    );
    // Optional: Consider retry logic or notifying an admin
  }
}
