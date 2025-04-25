/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('rosters', (table) => {
      table.increments('id').primary();
      table.integer('guild_id').unsigned().notNullable();
      table.foreign('guild_id').references('guilds.id').onDelete('CASCADE');
      table.string('name').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    .then(() => {
      // Add trigger to update updated_at on roster update
      return knex.raw(`
        CREATE TRIGGER update_rosters_updated_at
        BEFORE UPDATE ON rosters
        FOR EACH ROW
        EXECUTE PROCEDURE update_updated_at_column();
      `);
    })
    .createTable('roster_members', (table) => {
      table.integer('roster_id').unsigned().notNullable();
      table.foreign('roster_id').references('rosters.id').onDelete('CASCADE');
      table.integer('character_id').unsigned().notNullable();
      table.foreign('character_id').references('characters.id').onDelete('CASCADE');
      table.string('role').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.primary(['roster_id', 'character_id']); // Composite primary key
    })
    .then(() => {
      // Add trigger to update updated_at on roster_member update
      return knex.raw(`
        CREATE TRIGGER update_roster_members_updated_at
        BEFORE UPDATE ON roster_members
        FOR EACH ROW
        EXECUTE PROCEDURE update_updated_at_column();
      `);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('roster_members') // Drop dependent table first
    .dropTableIfExists('rosters');
};
