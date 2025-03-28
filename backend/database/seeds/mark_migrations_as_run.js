/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function(knex) {
  // Define the migrations that were already applied manually or by the old script
  const alreadyAppliedMigrations = [
    '00000000000001_add_user_roles.js',
    '00000000000002_add_member_count_to_guild_ranks.js',
    '20240325161500_add_last_roster_sync_to_guilds.js'
  ];

  // Get the name of the migrations table from knex config
  const migrationTableName = knex.client.config.migrations.tableName || 'knex_migrations';

  console.log(`Attempting to mark migrations as run in table: ${migrationTableName}`);

  // Insert records for each already applied migration, ignoring duplicates
  for (const migrationName of alreadyAppliedMigrations) {
    try {
      // Check if the migration is already recorded
      const existing = await knex(migrationTableName).where({ name: migrationName }).first();
      if (!existing) {
        await knex(migrationTableName).insert({
          name: migrationName,
          // Assign a historical batch number (e.g., 0)
          batch: 0,
          // Use a fixed past timestamp or current time
          migration_time: new Date()
        });
        console.log(`Marked migration ${migrationName} as run.`);
      } else {
        console.log(`Migration ${migrationName} already marked as run.`);
      }
    } catch (error) {
      console.error(`Error marking migration ${migrationName} as run:`, error);
      // Decide if you want to stop or continue on error
      // throw error; // Uncomment to stop on first error
    }
  }
  console.log('Finished marking historical migrations.');
};
