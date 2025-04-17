'use strict';

/**
 * Add exclude_from_sync to guilds table.
 */
exports.up = async function (knex) {
  const hasTable = await knex.schema.hasTable('guilds');
  if (hasTable) {
    await knex.schema.alterTable('guilds', (table) => {
      table.boolean('exclude_from_sync').notNullable().defaultTo(false);
    });
  }
};

exports.down = async function (knex) {
  const hasTable = await knex.schema.hasTable('guilds');
  if (hasTable) {
    await knex.schema.alterTable('guilds', (table) => {
      table.dropColumn('exclude_from_sync');
    });
  }
};