// Use CommonJS syntax for compatibility with Knex execution context
const { Knex } = require('knex');

const TABLE_NAME = 'users';
const COLUMN_NAME = 'tokens_valid_since';

/**
 * @param {Knex} knex
 */
exports.up = async function(knex) {
  await knex.schema.alterTable(TABLE_NAME, (table) => {
    table
      .timestamp(COLUMN_NAME, { useTz: true }) // TIMESTAMP WITH TIME ZONE
      .notNullable()
      .defaultTo(knex.fn.now()); // Default to the current time
  });
};

/**
 * @param {Knex} knex
 */
exports.down = async function(knex) {
  // Check if column exists before dropping to avoid errors on repeated down migrations
  const hasColumn = await knex.schema.hasColumn(TABLE_NAME, COLUMN_NAME);
  if (hasColumn) {
    await knex.schema.alterTable(TABLE_NAME, (table) => {
      table.dropColumn(COLUMN_NAME);
    });
  }
};
