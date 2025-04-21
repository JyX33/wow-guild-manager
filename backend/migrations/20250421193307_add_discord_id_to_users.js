exports.up = function(knex) {
  return knex.schema.table('users', function(table) {
    table.string('discord_id', 255).nullable().unique();
  });
};

exports.down = function(knex) {
  return knex.schema.table('users', function(table) {
    table.dropColumn('discord_id');
  });
};