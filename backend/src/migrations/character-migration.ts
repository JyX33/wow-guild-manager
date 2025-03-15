import { Pool } from 'pg';
import { withTransaction } from '../utils/transaction';
import db from '../db/db';
import characterModel from '../models/character.model';

/**
 * Migration script to create characters from event subscriptions
 * 
 * This script should be run after adding the characters table to the schema
 * but before switching the application to use character_id in subscriptions
 */
export async function migrateSubscriptionCharacters(): Promise<void> {
  console.log('Starting character migration from event subscriptions...');
  
  try {
    await withTransaction(async (client: Pool) => {
      // First, get all unique user character combinations from subscriptions
      const uniqueCharactersResult = await client.query(`
        SELECT DISTINCT user_id, character_name, character_class, character_role, realm
        FROM event_subscriptions
        JOIN users ON event_subscriptions.user_id = users.id 
        WHERE character_name IS NOT NULL
      `);
      
      const uniqueCharacters = uniqueCharactersResult.rows;
      console.log(`Found ${uniqueCharacters.length} unique characters to migrate`);
      
      // Create a character for each unique combination
      for (const char of uniqueCharacters) {
        // Get user's realm from Battle.net data if available
        let realm = 'unknown';
        if (char.realm) {
          realm = char.realm;
        } else {
          try {
            // Try to get realm from user data
            const userResult = await client.query(
              'SELECT user_data FROM users WHERE id = $1',
              [char.user_id]
            );
            
            if (userResult.rows.length > 0 && userResult.rows[0].user_data?.wow_accounts?.[0]?.characters?.[0]?.realm) {
              realm = userResult.rows[0].user_data.wow_accounts[0].characters[0].realm;
            }
          } catch (err) {
            console.warn(`Could not determine realm for character ${char.character_name}, using 'unknown'`);
          }
        }
        
        // Check if this character already exists to avoid duplicates
        const existingCharResult = await client.query(
          'SELECT id FROM characters WHERE user_id = $1 AND name = $2 AND realm = $3 LIMIT 1',
          [char.user_id, char.character_name, realm]
        );
        
        if (existingCharResult.rows.length > 0) {
          console.log(`Character ${char.character_name} already exists for user ${char.user_id}, skipping`);
          continue;
        }
        
        // Create the character
        const characterResult = await client.query(
          `INSERT INTO characters 
           (user_id, name, realm, class, level, role, is_main, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
           RETURNING id`,
          [
            char.user_id,
            char.character_name,
            realm,
            char.character_class,
            60, // Default max level in Shadowlands
            char.character_role,
            false // Not setting any as main yet
          ]
        );
        
        const characterId = characterResult.rows[0].id;
        console.log(`Created character #${characterId}: ${char.character_name} for user ${char.user_id}`);
      }
      
      // For each user, set the most recently used character as main
      const usersResult = await client.query('SELECT DISTINCT user_id FROM characters');
      for (const userRow of usersResult.rows) {
        const userId = userRow.user_id;
        
        // Find most recently used character in subscriptions
        const recentCharResult = await client.query(`
          SELECT c.id
          FROM characters c
          JOIN event_subscriptions es ON c.user_id = es.user_id 
                                     AND c.name = es.character_name
          WHERE c.user_id = $1
          ORDER BY es.created_at DESC
          LIMIT 1
        `, [userId]);
        
        if (recentCharResult.rows.length > 0) {
          const mainCharId = recentCharResult.rows[0].id;
          
          // Set as main character
          await client.query(
            'UPDATE characters SET is_main = true, updated_at = NOW() WHERE id = $1',
            [mainCharId]
          );
          
          console.log(`Set character #${mainCharId} as main for user ${userId}`);
        }
      }
      
      console.log('Character migration completed successfully');
    });
  } catch (error) {
    console.error('Character migration failed:', error);
    throw error;
  }
}

/**
 * Update event subscriptions to use character_id instead of character fields
 * 
 * This script should be run after migrating characters from subscriptions
 */
export async function updateSubscriptionsToUseCharacterId(): Promise<void> {
  console.log('Updating event subscriptions to use character_id...');
  
  try {
    await withTransaction(async (client: Pool) => {
      // Get all subscriptions that need updating
      const subscriptionsResult = await client.query(`
        SELECT es.id, es.user_id, es.character_name, c.id as character_id
        FROM event_subscriptions es
        JOIN characters c ON es.user_id = c.user_id AND es.character_name = c.name
      `);
      
      const subscriptions = subscriptionsResult.rows;
      console.log(`Found ${subscriptions.length} subscriptions to update`);
      
      // Update each subscription to use character_id
      for (const sub of subscriptions) {
        await client.query(
          'UPDATE event_subscriptions SET character_id = $1 WHERE id = $2',
          [sub.character_id, sub.id]
        );
        
        console.log(`Updated subscription #${sub.id} to use character #${sub.character_id}`);
      }
      
      console.log('Event subscription update completed successfully');
    });
  } catch (error) {
    console.error('Event subscription update failed:', error);
    throw error;
  }
}

/**
 * Run full migration
 */
export async function runFullMigration(): Promise<void> {
  try {
    console.log('Starting full character migration process...');
    
    // 1. Migrate characters from subscriptions
    await migrateSubscriptionCharacters();
    
    // 2. Update subscriptions to use character_id
    await updateSubscriptionsToUseCharacterId();
    
    console.log('Full character migration completed successfully');
  } catch (error) {
    console.error('Full character migration failed:', error);
    throw error;
  }
}

// Export a function to run the migration from CLI
if (require.main === module) {
  runFullMigration()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}