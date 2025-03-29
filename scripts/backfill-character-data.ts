import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file in the current directory (should be backend)
console.log(`Attempting to load .env file from CWD: ${process.cwd()}`);
const result = dotenv.config(); // Looks for .env in CWD by default

if (result.error) {
  console.error('Error loading .env file:', result.error);
  // Attempt loading from project root as fallback (if script is run differently)
  const fallbackPath = path.resolve(__dirname, '../../backend/.env');
  console.log(`Attempting fallback load from: ${fallbackPath}`);
  const fallbackResult = dotenv.config({ path: fallbackPath });
  if (fallbackResult.error) {
     console.error('Fallback .env load failed:', fallbackResult.error);
     // process.exit(1); // Exit if .env is critical
  } else {
     console.log('Fallback .env loaded successfully.');
  }
} else {
  console.log('.env file loaded successfully from CWD.');
}


import db from '../backend/src/db/db'; // Adjust path as needed
import * as characterModel from '../backend/src/models/character.model'; // Adjust path
import * as guildModel from '../backend/src/models/guild.model'; // Adjust path
import { DbCharacter, BattleNetCharacter } from '../shared/types/guild'; // Adjust path

/**
 * Backfills missing bnet_character_id, guild_id, and region fields in the characters table
 * based on data stored in the profile_json column.
 */
async function backfillCharacterData(): Promise<void> {
  console.log('Starting character data backfill...');
  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  try {
    // Fetch all characters - consider batching if the table is very large
    const allCharacters = await characterModel.findAll();
    console.log(`Found ${allCharacters.length} characters to process.`);

    for (let i = 0; i < allCharacters.length; i++) {
      const character = allCharacters[i];
      console.log(`Processing character ${i + 1}/${allCharacters.length}: ${character.name}-${character.realm} (ID: ${character.id})`);

      if (!character.profile_json) {
        console.log(`  Skipping character ${character.id}: No profile_json found.`);
        skippedCount++;
        continue;
      }

      // Check if data already seems populated to avoid unnecessary updates
      if (character.bnet_character_id && character.guild_id && character.region) {
         console.log(`  Skipping character ${character.id}: Fields already populated.`);
         skippedCount++;
         continue;
      }


      try {
        // Type assertion might be needed if profile_json is stored as string
        const profileData = character.profile_json as BattleNetCharacter;

        const bnet_character_id = profileData.id;
        const guild_id = profileData.guild?.id;
        let region: string | undefined = undefined;

        if (guild_id) {
          try {
            const guild = await guildModel.findById(guild_id);
            if (guild) {
              region = guild.region;
            } else {
              console.warn(`  Guild with ID ${guild_id} not found for character ${character.id}. Region will be null.`);
            }
          } catch (guildError) {
            console.error(`  Error fetching guild ${guild_id} for character ${character.id}:`, guildError);
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
        // Update guild_id even if it's null (character might have left guild)
        if (character.guild_id !== guild_id) {
             updatePayload.guild_id = guild_id; // Can be undefined
             needsUpdate = true;
        }
        if (region && character.region !== region) {
            updatePayload.region = region;
            needsUpdate = true;
        }

        if (needsUpdate) {
          console.log(`  Updating character ${character.id} with payload:`, updatePayload);
          await characterModel.update(character.id, updatePayload);
          updatedCount++;
        } else {
           console.log(`  Skipping character ${character.id}: No updates needed.`);
           skippedCount++;
        }

      } catch (parseOrUpdateError) {
        console.error(`  Error processing character ${character.id}:`, parseOrUpdateError);
        errorCount++;
      }
       // Optional: Add a small delay to avoid overwhelming the DB/API if guild fetch was needed
       // await new Promise(resolve => setTimeout(resolve, 50));
    }

    console.log('------------------------------------');
    console.log('Backfill process completed.');
    console.log(`  Characters updated: ${updatedCount}`);
    console.log(`  Characters skipped: ${skippedCount}`);
    console.log(`  Errors encountered: ${errorCount}`);
    console.log('------------------------------------');

  } catch (error) {
    console.error('Fatal error during backfill process:', error);
    process.exitCode = 1; // Indicate failure
  } finally {
    // Ensure database connection is closed if necessary
    // Knex might handle this automatically depending on setup
    await db.end(); // Explicitly end the connection pool
    console.log('Database connection closed.');
  }
}

// Execute the backfill function
backfillCharacterData();