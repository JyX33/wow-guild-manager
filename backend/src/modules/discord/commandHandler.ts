import { Client, Interaction, REST, Routes, SlashCommandBuilder, Events } from 'discord.js';
import crypto from 'crypto';
import logger from '../../utils/logger.js';
import { storeToken } from './discordTokenStore.js';
import config from '../../config/index.js';

/**
 * Registers the /link-discord command for a specific guild using the Discord REST API.
 * Throws an error if any required environment variable is missing.
 */
export async function registerCommands(clientId: string, guildId: string, token: string) {
    if (!clientId || !guildId || !token) {
        throw new Error('Missing required environment variables for command registration');
    }

    const commands = [
        new SlashCommandBuilder()
            .setName('link-discord')
            .setDescription('Links your Discord account to your WoW Guild Manager profile.')
            .toJSON(),
    ];

    const rest = new REST({ version: '10' }).setToken(token);

    try {
        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands }
        );
        console.log('Successfully registered application commands for guild ' + guildId);
    } catch (error) {
        console.error('Error registering application commands:', error);
    }
}

/**
 * Attaches a listener to the Discord client to handle the /link-discord command.
 * Replies with a placeholder message when the command is invoked.
 */
export function attachCommandListener(client: Client) {
    client.on(Events.InteractionCreate, async (interaction: Interaction) => {
        if (!interaction.isChatInputCommand()) return;

        if (interaction.commandName === 'link-discord') {
            try {
                const token = crypto.randomBytes(32).toString('hex');
                const discordId = interaction.user.id;
                const discordUsername = interaction.user.tag;

                // --- Temporary Storage Placeholder ---
                // TODO: Implement proper temporary storage (e.g., Redis, temporary DB table)
                storeToken(token, { discordId, discordUsername });
                // -------------------------------------

                const frontendUrl = config.server.frontendUrl; // Assumes config is imported and has this value
                if (!frontendUrl) {
                    logger.error('FRONTEND_URL is not configured. Cannot generate linking URL.');
                    await interaction.reply({ content: 'An internal configuration error occurred. Please contact an administrator.', ephemeral: true });
                    return;
                }
                const linkUrl = `${frontendUrl}/link-discord?token=${token}`; // Path on frontend to handle linking

                const dmMessage = `Please click this link while logged into the WoW Guild Manager website to link your account:\n${linkUrl}\n\nThis link is valid for a short time.`;

                try {
                    await interaction.user.send(dmMessage);
                    await interaction.reply({ content: 'I have sent you a DM with instructions to link your account.', ephemeral: true });
                } catch (dmError) {
                    logger.error({ err: dmError, discordId }, 'Failed to send DM for account linking');
                    await interaction.reply({ content: 'I could not send you a DM. Please check if your DMs are enabled for this server and try again.', ephemeral: true });
                }

            } catch (error) {
                logger.error({ err: error }, 'Error processing /link-discord command');
                // Avoid replying again if DM error reply already happened
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: 'An unexpected error occurred while processing your request.', ephemeral: true });
                }
            }
        }
    });
}