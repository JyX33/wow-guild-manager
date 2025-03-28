/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // This migration wraps the raw SQL from 01_add_user_roles.sql
  // It includes conditional logic (DO $$ ... IF NOT EXISTS ...)
  await knex.raw(`
    -- Migration script to add user roles and update guild table structure

    -- Create type for user roles if it doesn't exist
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
            CREATE TYPE user_role AS ENUM ('user', 'guild_leader', 'admin');
        END IF;
    END$$;

    -- Add role column to users table if it doesn't exist
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                      WHERE table_name = 'users' AND column_name = 'role') THEN
            ALTER TABLE users ADD COLUMN role user_role DEFAULT 'user';
        END IF;
    END$$;

    -- Add leader_id column to guilds table if it doesn't exist
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                      WHERE table_name = 'guilds' AND column_name = 'leader_id') THEN
            ALTER TABLE guilds ADD COLUMN leader_id INTEGER REFERENCES users(id);
        END IF;
    END$$;

    -- Set first user as admin if no admin exists yet
    DO $$
    DECLARE
        first_user_id INTEGER;
    BEGIN
        -- Check if there are any admin users
        IF NOT EXISTS (SELECT 1 FROM users WHERE role = 'admin') THEN
            -- Get the first user
            SELECT id INTO first_user_id FROM users ORDER BY id LIMIT 1;

            -- If there is at least one user, make them an admin
            IF first_user_id IS NOT NULL THEN
                UPDATE users SET role = 'admin' WHERE id = first_user_id;
                RAISE NOTICE 'User with ID % has been set as admin', first_user_id;
            END IF;
        END IF;
    END$$;
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Reversing this migration is complex due to conditional logic and potential data changes.
  // Dropping columns/types could lead to data loss if other migrations depend on them.
  // Manual review and potentially custom rollback SQL would be needed if required.
  console.warn('Rolling back 00000000000001_add_user_roles.js is complex and not automatically handled.');
  // Example potential rollback steps (use with caution):
  // await knex.raw('ALTER TABLE guilds DROP COLUMN IF EXISTS leader_id;');
  // await knex.raw('ALTER TABLE users DROP COLUMN IF EXISTS role;');
  // await knex.raw('DROP TYPE IF EXISTS user_role;');
  return Promise.resolve(); // Indicate successful (but possibly no-op) rollback
};