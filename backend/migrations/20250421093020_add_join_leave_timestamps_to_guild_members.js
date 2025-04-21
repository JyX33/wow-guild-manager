/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.table('guild_members', function(table) {
    table.timestamp('joined_at').defaultTo(knex.fn.now());
    table.timestamp('left_at').nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('guild_members', function(table) {
    table.dropColumn('joined_at');
    table.dropColumn('left_at');
  });
};
