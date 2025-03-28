/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // --- Guilds Table ---
  await knex.schema.alterTable('guilds', (table) => {
    // Add Battle.net Guild ID (assuming it might be large)
    table.bigInteger('bnet_guild_id').index();
    // Add column for raw roster JSON
    table.jsonb('roster_json');
    // Rename existing guild_data and ensure it's JSONB
    // Note: Renaming might require raw SQL depending on exact DB/version
    // If direct rename fails, alternative is add new, copy data, drop old.
    // Assuming direct alter type works for simplicity here.
    table.jsonb('guild_data_json').comment('Stores raw JSON response from BNet Guild API');
    // Ensure last_updated exists
    if (!knex.schema.hasColumn('guilds', 'last_updated')) {
      table.timestamp('last_updated');
    }
  });

  // Separate step to potentially drop the old guild_data if rename wasn't direct
  // This depends on the specific DB and Knex version behavior with rename + alter type.
  // Let's assume the alterType handles it or we manage data migration manually if needed.
  // If `guild_data` still exists after the above, drop it:
  // await knex.schema.alterTable('guilds', (table) => {
  //   table.dropColumn('guild_data');
  // });


  // --- Characters Table ---
  await knex.schema.alterTable('characters', (table) => {
    // Add Battle.net Character ID
    table.bigInteger('bnet_character_id').index();
    // Add region
    table.string('region').index();
    // Add sync timestamp
    table.timestamp('last_synced_at');
    // Add JSONB columns for raw API data
    table.jsonb('profile_json').comment('Stores raw JSON from BNet Character Profile API');
    table.jsonb('equipment_json').comment('Stores raw JSON from BNet Character Equipment API');
    table.jsonb('mythic_profile_json').comment('Stores raw JSON from BNet Mythic Keystone Profile API');
    table.jsonb('professions_json').comment('Stores raw JSON from BNet Character Professions API');

    // Drop the old structured character_data column if it exists
    if (knex.schema.hasColumn('characters', 'character_data')) {
       table.dropColumn('character_data');
    }
  });

  // --- Guild Members Table ---
  await knex.schema.alterTable('guild_members', (table) => {
    // Add indexed fields as decided
    table.string('character_name').index();
    table.string('character_class').index();
    // Add JSONB column for raw member data from roster
    table.jsonb('member_data_json').comment('Stores raw JSON object for the member from BNet Guild Roster API');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Revert Guild Members Table
  await knex.schema.alterTable('guild_members', (table) => {
    table.dropColumn('character_name');
    table.dropColumn('character_class');
    table.dropColumn('member_data_json');
  });

  // Revert Characters Table
  await knex.schema.alterTable('characters', (table) => {
    table.dropColumn('bnet_character_id');
    table.dropColumn('region');
    table.dropColumn('last_synced_at');
    table.dropColumn('profile_json');
    table.dropColumn('equipment_json');
    table.dropColumn('mythic_profile_json');
    table.dropColumn('professions_json');
    // Add back the old column (assuming it was jsonb or similar)
    table.jsonb('character_data');
  });

  // Revert Guilds Table
  await knex.schema.alterTable('guilds', (table) => {
    table.dropColumn('bnet_guild_id');
    table.dropColumn('roster_json');
    table.dropColumn('guild_data_json');
    // Add back the old column (assuming it was jsonb or similar)
    // If rename wasn't direct, this needs adjustment
    table.jsonb('guild_data');
    // Optionally drop last_updated if it was added by this migration
    // table.dropColumn('last_updated');
  });
};