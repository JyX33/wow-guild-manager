/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Create users table if it doesn't exist
  if (!(await knex.schema.hasTable('users'))) {
    await knex.schema.createTable('users', (table) => {
      table.increments('id').primary();
      table.string('battletag').unique().notNullable();
      table.bigInteger('bnet_id').unique().notNullable();
      table.string('region').notNullable();
      // role added by 00000000000001_add_user_roles.js
      table.text('access_token');
      table.text('refresh_token');
      table.timestamp('token_expires_at');
      table.timestamps(true, true); // Adds created_at and updated_at
    });
    console.log("Created 'users' table.");
  } else {
    console.log("'users' table already exists, skipping creation.");
  }

  // Create guilds table if it doesn't exist
  if (!(await knex.schema.hasTable('guilds'))) {
    await knex.schema.createTable('guilds', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('realm').notNullable();
      table.string('region').notNullable();
      // leader_id added by 00000000000001_add_user_roles.js
      // bnet_guild_id, guild_data_json, roster_json, last_updated, last_roster_sync added by later migrations
      table.timestamps(true, true);
      table.index(['name', 'realm', 'region']);
    });
    console.log("Created 'guilds' table.");
  } else {
    console.log("'guilds' table already exists, skipping creation.");
  }

  // Create characters table if it doesn't exist
  if (!(await knex.schema.hasTable('characters'))) {
    await knex.schema.createTable('characters', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
      table.string('name').notNullable();
      table.string('realm').notNullable();
      table.string('class').notNullable(); // Assuming class name as string
      table.integer('level').notNullable();
      table.enum('role', ['Tank', 'Healer', 'DPS', 'Support']).notNullable(); // Based on CharacterRole type
      table.boolean('is_main').defaultTo(false);
      table.integer('guild_id').unsigned().references('id').inTable('guilds').onDelete('SET NULL').nullable();
      table.integer('guild_rank').nullable();
      // bnet_character_id, region, last_synced_at, JSONB columns added by later migration
      table.timestamps(true, true);
      table.index(['name', 'realm']);
      table.index('user_id');
      table.index('guild_id');
    });
    console.log("Created 'characters' table.");
  } else {
    console.log("'characters' table already exists, skipping creation.");
  }

  // Create guild_ranks table if it doesn't exist
  if (!(await knex.schema.hasTable('guild_ranks'))) {
    await knex.schema.createTable('guild_ranks', (table) => {
      table.increments('id').primary();
      table.integer('guild_id').unsigned().references('id').inTable('guilds').onDelete('CASCADE').notNullable();
      table.integer('rank_id').notNullable(); // The rank number (0, 1, 2...)
      table.string('rank_name').notNullable();
      table.boolean('is_custom').defaultTo(false);
      // member_count added by 00000000000002_add_member_count_to_guild_ranks.js
      table.timestamps(true, true);
      table.unique(['guild_id', 'rank_id']); // Ensure rank ID is unique per guild
    });
    console.log("Created 'guild_ranks' table.");
  } else {
    console.log("'guild_ranks' table already exists, skipping creation.");
  }

  // Create guild_members table if it doesn't exist
  if (!(await knex.schema.hasTable('guild_members'))) {
    await knex.schema.createTable('guild_members', (table) => {
      table.increments('id').primary();
      table.integer('guild_id').unsigned().references('id').inTable('guilds').onDelete('CASCADE').notNullable();
      table.integer('character_id').unsigned().references('id').inTable('characters').onDelete('CASCADE').notNullable();
      table.integer('rank').notNullable(); // Rank number
      // character_name, character_class, member_data_json added by later migration
      table.timestamps(true, true);
      table.unique(['guild_id', 'character_id']); // Ensure character is only in guild once
      table.index('guild_id');
      table.index('character_id');
    });
    console.log("Created 'guild_members' table.");
  } else {
    console.log("'guild_members' table already exists, skipping creation.");
  }

  // Create events table if it doesn't exist
  if (!(await knex.schema.hasTable('events'))) {
    await knex.schema.createTable('events', (table) => {
      table.increments('id').primary();
      table.integer('guild_id').unsigned().references('id').inTable('guilds').onDelete('CASCADE');
      table.string('name').notNullable();
      table.timestamp('event_time').notNullable();
      table.text('description');
      table.integer('created_by').unsigned().references('id').inTable('users').onDelete('SET NULL');
      table.timestamps(true, true);
      table.index('guild_id');
    });
    console.log("Created 'events' table.");
  } else {
    console.log("'events' table already exists, skipping creation.");
  }

   // Create subscriptions table if it doesn't exist
   if (!(await knex.schema.hasTable('subscriptions'))) {
     await knex.schema.createTable('subscriptions', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE').notNullable();
      table.text('endpoint').unique().notNullable(); // Push subscription endpoint
      table.jsonb('keys').notNullable(); // Push subscription keys (p256dh, auth)
      table.timestamps(true, true);
      table.index('user_id');
    });
    console.log("Created 'subscriptions' table.");
  } else {
    console.log("'subscriptions' table already exists, skipping creation.");
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Drop tables in reverse order of creation due to foreign key constraints
  // Using dropTableIfExists is safe for rollback
  await knex.schema.dropTableIfExists('subscriptions');
  await knex.schema.dropTableIfExists('events');
  await knex.schema.dropTableIfExists('guild_members');
  await knex.schema.dropTableIfExists('guild_ranks');
  await knex.schema.dropTableIfExists('characters');
  await knex.schema.dropTableIfExists('guilds');
  await knex.schema.dropTableIfExists('users');
  // Drop the user_role enum if needed (might require raw SQL and check if exists)
  // await knex.raw('DROP TYPE IF EXISTS user_role;');
};