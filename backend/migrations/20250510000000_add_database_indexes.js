/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  console.log('Adding performance optimization indexes...');

  // --- Roster Tables Indexes ---
  if (await knex.schema.hasTable('roster_members')) {
    // Check if indexes already exist
    const rosterMembersIndexExists = await knex.schema.raw(`
      SELECT indexname FROM pg_indexes 
      WHERE tablename = 'roster_members' AND indexname = 'idx_roster_members_character_id'
    `);

    if (rosterMembersIndexExists.rows.length === 0) {
      await knex.schema.table('roster_members', table => {
        // Add indexes on foreign keys for better JOIN performance
        table.index('character_id', 'idx_roster_members_character_id');
        table.index('roster_id', 'idx_roster_members_roster_id');
      });
      console.log("Added indexes to 'roster_members' table");
    } else {
      console.log("Indexes on 'roster_members' table already exist, skipping");
    }
  }

  if (await knex.schema.hasTable('rosters')) {
    // Check if indexes already exist
    const rostersIndexExists = await knex.schema.raw(`
      SELECT indexname FROM pg_indexes 
      WHERE tablename = 'rosters' AND indexname = 'idx_rosters_guild_id'
    `);

    if (rostersIndexExists.rows.length === 0) {
      await knex.schema.table('rosters', table => {
        // Add index on guild_id for faster guild roster lookups
        table.index('guild_id', 'idx_rosters_guild_id');
      });
      console.log("Added indexes to 'rosters' table");
    } else {
      console.log("Indexes on 'rosters' table already exist, skipping");
    }
  }

  // --- Events Table Indexes ---
  if (await knex.schema.hasTable('events')) {
    // Check if event_time index already exists
    const eventsTimeIndexExists = await knex.schema.raw(`
      SELECT indexname FROM pg_indexes 
      WHERE tablename = 'events' AND indexname = 'idx_events_event_time'
    `);

    if (eventsTimeIndexExists.rows.length === 0) {
      await knex.schema.table('events', table => {
        // Add index on event_time for faster date range queries
        table.index('event_time', 'idx_events_event_time');
        // Add index on created_by for faster user-created events lookups
        table.index('created_by', 'idx_events_created_by');
      });
      console.log("Added indexes to 'events' table");
    } else {
      console.log("Indexes on 'events' table already exist, skipping");
    }
  }

  // --- Users Table Indexes ---
  if (await knex.schema.hasTable('users')) {
    // Check if bnet_id index already exists
    const usersBnetIndexExists = await knex.schema.raw(`
      SELECT indexname FROM pg_indexes 
      WHERE tablename = 'users' AND indexname = 'idx_users_bnet_id'
    `);

    if (usersBnetIndexExists.rows.length === 0) {
      await knex.schema.table('users', table => {
        // Add index on bnet_id for faster user lookups by Battle.net ID
        table.index('bnet_id', 'idx_users_bnet_id');
        // Check if discord_id column exists before adding index
        knex.schema.raw(`
          SELECT column_name FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'discord_id'
        `).then(result => {
          if (result.rows.length > 0) {
            // Add index on discord_id if it exists
            knex.schema.table('users', table => {
              table.index('discord_id', 'idx_users_discord_id');
            }).then(() => {
              console.log("Added index on discord_id to 'users' table");
            });
          }
        });
      });
      console.log("Added indexes to 'users' table");
    } else {
      console.log("Indexes on 'users' table already exist, skipping");
    }
  }

  // --- Characters Table Additional Indexes ---
  if (await knex.schema.hasTable('characters')) {
    // Check if class index already exists
    const charactersClassIndexExists = await knex.schema.raw(`
      SELECT indexname FROM pg_indexes 
      WHERE tablename = 'characters' AND indexname = 'idx_characters_class'
    `);

    if (charactersClassIndexExists.rows.length === 0) {
      await knex.schema.table('characters', table => {
        // Add index on class for faster character class filtering
        table.index('class', 'idx_characters_class');
        // Add index on level for faster level range queries
        table.index('level', 'idx_characters_level');
        // Add index on role for faster role filtering
        table.index('role', 'idx_characters_role');
        // Add index on is_main for faster main character filtering
        table.index('is_main', 'idx_characters_is_main');
        // Add index on is_available for faster availability filtering
        table.index('is_available', 'idx_characters_is_available');
      });
      console.log("Added indexes to 'characters' table");
    } else {
      console.log("Indexes on 'characters' table already exist, skipping");
    }
  }

  // --- Guild Members Table Additional Indexes ---
  if (await knex.schema.hasTable('guild_members')) {
    // Check if rank index already exists
    const guildMembersRankIndexExists = await knex.schema.raw(`
      SELECT indexname FROM pg_indexes 
      WHERE tablename = 'guild_members' AND indexname = 'idx_guild_members_rank'
    `);

    if (guildMembersRankIndexExists.rows.length === 0) {
      await knex.schema.table('guild_members', table => {
        // Add index on rank for faster rank filtering
        table.index('rank', 'idx_guild_members_rank');
        // Add index on is_main for finding main characters
        table.index('is_main', 'idx_guild_members_is_main');
        // Add composite index for common guild+rank queries
        table.index(['guild_id', 'rank'], 'idx_guild_members_guild_rank');
        // Add index on joined_at for tracking new members
        table.index('joined_at', 'idx_guild_members_joined_at');
        // Add index on left_at for tracking left members
        table.index('left_at', 'idx_guild_members_left_at');
      });
      console.log("Added indexes to 'guild_members' table");
    } else {
      console.log("Indexes on 'guild_members' table already exist, skipping");
    }
  }

  // --- Guild Ranks Table Additional Indexes ---
  if (await knex.schema.hasTable('guild_ranks')) {
    // Check if rank_id index already exists
    const guildRanksRankIdIndexExists = await knex.schema.raw(`
      SELECT indexname FROM pg_indexes 
      WHERE tablename = 'guild_ranks' AND indexname = 'idx_guild_ranks_rank_id'
    `);

    if (guildRanksRankIdIndexExists.rows.length === 0) {
      await knex.schema.table('guild_ranks', table => {
        // Add index on rank_id for faster rank lookup
        table.index('rank_id', 'idx_guild_ranks_rank_id');
      });
      console.log("Added indexes to 'guild_ranks' table");
    } else {
      console.log("Indexes on 'guild_ranks' table already exist, skipping");
    }
  }

  console.log('Database index optimization complete');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Drop all added indexes in reverse order

  if (await knex.schema.hasTable('guild_ranks')) {
    await knex.schema.table('guild_ranks', table => {
      table.dropIndex('', 'idx_guild_ranks_rank_id');
    });
  }

  if (await knex.schema.hasTable('guild_members')) {
    await knex.schema.table('guild_members', table => {
      table.dropIndex('', 'idx_guild_members_rank');
      table.dropIndex('', 'idx_guild_members_is_main');
      table.dropIndex('', 'idx_guild_members_guild_rank');
      table.dropIndex('', 'idx_guild_members_joined_at');
      table.dropIndex('', 'idx_guild_members_left_at');
    });
  }

  if (await knex.schema.hasTable('characters')) {
    await knex.schema.table('characters', table => {
      table.dropIndex('', 'idx_characters_class');
      table.dropIndex('', 'idx_characters_level');
      table.dropIndex('', 'idx_characters_role');
      table.dropIndex('', 'idx_characters_is_main');
      table.dropIndex('', 'idx_characters_is_available');
    });
  }

  if (await knex.schema.hasTable('users')) {
    await knex.schema.table('users', table => {
      table.dropIndex('', 'idx_users_bnet_id');
      // Try to drop discord_id index if it exists
      try {
        table.dropIndex('', 'idx_users_discord_id');
      } catch (error) {
        console.log("Index 'idx_users_discord_id' doesn't exist, skipping");
      }
    });
  }

  if (await knex.schema.hasTable('events')) {
    await knex.schema.table('events', table => {
      table.dropIndex('', 'idx_events_event_time');
      table.dropIndex('', 'idx_events_created_by');
    });
  }

  if (await knex.schema.hasTable('rosters')) {
    await knex.schema.table('rosters', table => {
      table.dropIndex('', 'idx_rosters_guild_id');
    });
  }

  if (await knex.schema.hasTable('roster_members')) {
    await knex.schema.table('roster_members', table => {
      table.dropIndex('', 'idx_roster_members_character_id');
      table.dropIndex('', 'idx_roster_members_roster_id');
    });
  }

  console.log('Removed all optimization indexes');
};