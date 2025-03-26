import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('guilds', (table) => {
    table.timestamp('last_roster_sync', { useTz: true }).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('guilds', (table) => {
    table.dropColumn('last_roster_sync');
  });
}