import dotenv from 'dotenv';
import path from 'path';
import logger from '../utils/logger'; // Import the logger

// Load environment variables from .env file in the backend root directory
const envPath = path.resolve(__dirname, '../../.env'); // Go up two levels from src/scripts to backend
logger.info(`Attempting to load .env file from: ${envPath}`);
const result = dotenv.config({ path: envPath });

if (result.error) {
  logger.error({ err: result.error }, 'Error loading .env file:');
  // process.exit(1); // Exit if .env is critical
} else {
  logger.info('.env file loaded successfully.');
}


import db from '../db/db'; // Adjusted path
import * as characterModel from '../models/character.model'; // Adjusted path
import * as guildModel from '../models/guild.model'; // Adjusted path
import { DbCharacter, BattleNetCharacter } from '../../../shared/types/guild'; // Adjusted path

/**
 * Backfills missing bnet_character_id, guild_id, and region fields in the characters table
 * based on data stored in the profile_json column.
 */
async function backfillCharacterData(): Promise<void> {
  logger.info('Starting character data backfill...');
  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  try {
    // Fetch all characters - consider batching if the table is very large
    const allCharacters = await characterModel.findAll();
    logger.info(`Found ${allCharacters.length} characters to process.`);

    for (let i = 0; i < allCharacters.length; i++) {
      const character = allCharacters[i];
      logger.info(`Processing character ${i + 1}/${allCharacters.length}: ${character.name}-${character.realm} (ID: ${character.id})`);

      if (!character.profile_json) {
        logger.info({ charId: character.id }, `Skipping character ${character.id}: No profile_json found.`);
        skippedCount++;
        continue;
      }

      // Check if data already seems populated to avoid unnecessary updates
      if (character.bnet_character_id && character.guild_id && character.region) {
         logger.info({ charId: character.id }, `Skipping character ${character.id}: Fields already populated.`);
         skippedCount++;
         continue;
      }


      try {
        // Type assertion might be needed if profile_json is stored as string
        const profileData = character.profile_json as BattleNetCharacter;

        const bnet_character_id = profileData.id;
        const guild_id = profileData.guild?.id; // This is BNet Guild ID, need to map
        let local_guild_id: number | undefined = undefined; // Use a different variable name
        let region: string | undefined = undefined;

        if (guild_id) { // If BNet guild ID exists in profile
          try {
            // Find local guild using bnet_guild_id
            const guild = await guildModel.findOne({ bnet_guild_id: guild_id });
            if (guild) {
              region = guild.region;
              local_guild_id = guild.id; // Store the local DB guild ID
            } else {
              logger.warn({ bnetGuildId: guild_id, charId: character.id }, `Guild with BNet ID ${guild_id} not found for character ${character.id}. Region and local guild ID will be null.`);
            }
          } catch (guildError) {
            logger.error({ err: guildError, bnetGuildId: guild_id, charId: character.id }, `Error fetching guild with BNet ID ${guild_id} for character ${character.id}:`);
            // Decide on fallback: keep region undefined or use existing character.region?
            // Let's keep it undefined if guild fetch fails, to be conservative.
          }
        }

        // Prepare update payload only with fields that need updating
        const updatePayload: Partial<DbCharacter> = {};
        let needsUpdate = false;

        if (bnet_character_id && character.bnet_character_id !== bnet_character_id) {
            updatePayload.bnet_character_id = bnet_character_id;
            needsUpdate = true;
        }
        // Update local guild_id even if it's null (character might have left guild)
        if (character.guild_id !== local_guild_id) {
             updatePayload.guild_id = local_guild_id; // Can be undefined
             needsUpdate = true;
        }
        if (region && character.region !== region) {
            updatePayload.region = region;
            needsUpdate = true;
        }

        if (needsUpdate) {
          logger.info({ charId: character.id, payload: updatePayload }, `Updating character ${character.id}`);
          await characterModel.update(character.id, updatePayload);
          updatedCount++;
        } else {
           logger.info({ charId: character.id }, `Skipping character ${character.id}: No updates needed.`);
           skippedCount++;
        }

      } catch (parseOrUpdateError) {
        logger.error({ err: parseOrUpdateError, charId: character.id }, `Error processing character ${character.id}:`);
        errorCount++;
      }
       // Optional: Add a small delay to avoid overwhelming the DB/API if guild fetch was needed
       // await new Promise(resolve => setTimeout(resolve, 50));
    }

    logger.info('------------------------------------');
    logger.info('Backfill process completed.');
    logger.info(`  Characters updated: ${updatedCount}`);
    logger.info(`  Characters skipped: ${skippedCount}`);
    logger.info(`  Errors encountered: ${errorCount}`);
    logger.info('------------------------------------');

  } catch (error) {
    logger.error({ err: error }, 'Fatal error during backfill process:');
    process.exitCode = 1; // Indicate failure
  } finally {
    // Ensure database connection is closed if necessary
    // Knex might handle this automatically depending on setup
    await db.end(); // Explicitly end the connection pool
    logger.info('Database connection closed.');
  }
}

// Execute the backfill function
backfillCharacterData();