/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // 1. Add new columns
  await knex.schema.alterTable('characters', (table) => {
    table.string('toy_hash').nullable().comment('Hash derived from toy collection for grouping unknown users');
    // Add index for faster lookups on toy_hash, especially for grouping
    table.index('toy_hash');
  });

  await knex.schema.alterTable('guild_members', (table) => {
    table.boolean('is_main').nullable().defaultTo(false).comment('Is this the designated main character for the user in this guild?');
  });

  // 2. Drop old columns from 'characters'
  // Check if columns exist before dropping to make migration more robust
  const hasIsMain = await knex.schema.hasColumn('characters', 'is_main');
  const hasGuildId = await knex.schema.hasColumn('characters', 'guild_id');
  const hasGuildRank = await knex.schema.hasColumn('characters', 'guild_rank');

  if (hasIsMain || hasGuildId || hasGuildRank) {
    await knex.schema.alterTable('characters', (table) => {
      if (hasIsMain) {
        table.dropColumn('is_main');
      }
      if (hasGuildId) {
        // Consider potential foreign key constraints if they exist before dropping
        // await table.dropForeign('guild_id'); // Example if FK exists
        table.dropColumn('guild_id');
      }
      if (hasGuildRank) {
        table.dropColumn('guild_rank');
      }
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // 1. Add old columns back to 'characters'
  await knex.schema.alterTable('characters', (table) => {
    table.boolean('is_main').nullable().defaultTo(false).comment('DEPRECATED: Was this the user\'s main character (global)?');
    table.integer('guild_id').nullable().comment('DEPRECATED: Character\'s guild ID');
    // If there was a foreign key, add it back
    // table.foreign('guild_id').references('id').inTable('guilds'); // Example
    table.integer('guild_rank').nullable().comment('DEPRECATED: Character\'s rank in guild');
  });

  // 2. Drop new columns
  await knex.schema.alterTable('guild_members', (table) => {
    table.dropColumn('is_main');
  });

  await knex.schema.alterTable('characters', (table) => {
    table.dropIndex('toy_hash'); // Drop index first
    table.dropColumn('toy_hash');
  });
};
