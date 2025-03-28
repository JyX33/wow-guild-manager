/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  return knex.schema.alterTable('guilds', (table) => {
    table.timestamp('last_roster_sync', { useTz: true }).nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  return knex.schema.alterTable('guilds', (table) => {
    table.dropColumn('last_roster_sync');
  });
};