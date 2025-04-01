/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.table('guild_members', function(table) {
    // Track consecutive failures for Battle.net updates
    table.integer('consecutive_update_failures').notNullable().defaultTo(0).comment('Tracks consecutive Battle.net update failures for this member.');
    // Flag to mark if the character is available for updates/display
    table.boolean('is_available').notNullable().defaultTo(true).comment('Indicates if the character is considered available for updates and display.');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('guild_members', function(table) {
    table.dropColumn('consecutive_update_failures');
    table.dropColumn('is_available');
  });
};