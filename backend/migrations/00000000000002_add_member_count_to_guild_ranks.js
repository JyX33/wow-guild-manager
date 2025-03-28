/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Wraps the SQL from 02_add_member_count_to_guild_ranks.sql
  await knex.schema.alterTable('guild_ranks', (table) => {
    // Add member_count column with a default value
    table.integer('member_count').notNullable().defaultTo(0);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Revert the change by dropping the column
  await knex.schema.alterTable('guild_ranks', (table) => {
    table.dropColumn('member_count');
  });
};