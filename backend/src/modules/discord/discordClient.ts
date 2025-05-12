import { Client, GatewayIntentBits } from "discord.js";
import { process } from "../../utils/import-fixes.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
  ],
});

export async function initializeDiscordClient(): Promise<void> {
  const token = process.env.DISCORD_BOT_TOKEN;

  if (!token) {
    throw new Error("Missing DISCORD_BOT_TOKEN environment variable");
  }

  client.once("ready", () => {
    console.log(`Logged in as ${client.user?.tag}!`);
  });

  await client.login(token);
}

export { client };
