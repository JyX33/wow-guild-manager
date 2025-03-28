/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Add member_count column to guilds table if it doesn't exist
  const hasColumn = await knex.schema.hasColumn('guilds', 'member_count');
  if (!hasColumn) {
    await knex.schema.alterTable('guilds', (table) => {
      console.log("Adding member_count column to guilds table...");
      table.integer('member_count').defaultTo(0).comment('Cached member count from roster');
    });
  } else {
     console.log("Column member_count already exists on guilds table.");
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Drop the member_count column if it exists
  const hasColumn = await knex.schema.hasColumn('guilds', 'member_count');
  if (hasColumn) {
    await knex.schema.alterTable('guilds', (table) => {
      console.log("Dropping member_count column from guilds table...");
      table.dropColumn('member_count');
    });
  }
};