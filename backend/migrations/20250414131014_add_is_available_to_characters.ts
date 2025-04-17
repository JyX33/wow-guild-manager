import type { Knex } from "knex";

const TABLE_NAME = 'characters';
const COLUMN_NAME = 'is_available';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable(TABLE_NAME, (table) => {
    // Add the new column, allowing nulls initially might be safer
    // Defaulting to TRUE for existing rows
    table.boolean(COLUMN_NAME).nullable().defaultTo(true);
  });
  // Optional: Add a comment to the column in the database
  await knex.raw(`COMMENT ON COLUMN ??."??" IS 'Flag indicating if the character profile is accessible via Battle.net API (set to false on 404)'`, [TABLE_NAME, COLUMN_NAME]);
}


export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable(TABLE_NAME, (table) => {
    table.dropColumn(COLUMN_NAME);
  });
}
