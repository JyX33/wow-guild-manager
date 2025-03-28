// backend/migrations/20250327234330_allow_null_user_id_in_characters.js

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('characters', function(table) {
    // Modify the user_id column to allow null values
    // Note: The specific syntax might vary slightly depending on the database (PostgreSQL, MySQL, SQLite)
    // This syntax is common for PostgreSQL. Adjust if using a different DB.
    table.integer('user_id').nullable().alter();
    // For SQLite, altering constraints is more complex. It might involve:
    // 1. Creating a new table with the desired schema.
    // 2. Copying data from the old table to the new table.
    // 3. Dropping the old table.
    // 4. Renaming the new table to the original name.
    // Knex might handle some of this, but raw SQL might be needed for SQLite constraint changes.
    // If using SQLite, confirm the best approach. Assuming PostgreSQL for now.
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('characters', function(table) {
    // Revert the user_id column to NOT NULL
    // This might fail if there are existing NULL values in the column.
    // Handle potential errors or ensure data cleanup before reverting.
    table.integer('user_id').notNullable().alter();
  });
};