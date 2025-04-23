import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.string('discord_id', 20).unique().nullable();
    table.string('discord_username', 255).nullable();
  });

  await knex.schema.alterTable('events', (table) => {
    table.string('discord_message_id', 20).nullable();
    table.string('discord_thread_id', 20).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('discord_id');
    table.dropColumn('discord_username');
  });

  await knex.schema.alterTable('events', (table) => {
    table.dropColumn('discord_message_id');
    table.dropColumn('discord_thread_id');
  });
}