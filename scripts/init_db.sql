-- WoW Guild Manager - Full Database Initialization Script
-- Suitable for running directly in pgAdmin or psql.
-- Combines all migrations (raw SQL and Knex-equivalent) into one idempotent script.

-- Note: \set ON_ERROR_STOP on is a psql meta-command and removed for pgAdmin compatibility.
-- Ensure your client runs this script within a transaction or stops on error.

BEGIN;

-- =============================================================================
-- Initial Table Creation (from 00000000000000_create_initial_tables.js)
-- =============================================================================

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    battletag VARCHAR(255) UNIQUE NOT NULL,
    bnet_id BIGINT UNIQUE NOT NULL,
    region VARCHAR(255) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE users IS 'Stores user account information linked to Battle.net';

-- Create guilds table
CREATE TABLE IF NOT EXISTS guilds (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    realm VARCHAR(255) NOT NULL,
    region VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_guilds_name_realm_region ON guilds (name, realm, region);
COMMENT ON TABLE guilds IS 'Stores information about tracked guilds';

-- Create characters table
CREATE TABLE IF NOT EXISTS characters (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, -- Initially NOT NULL, changed later
    name VARCHAR(255) NOT NULL,
    realm VARCHAR(255) NOT NULL,
    class VARCHAR(255) NOT NULL,
    level INTEGER NOT NULL,
    -- role ENUM type defined later
    -- is_main BOOLEAN DEFAULT false, -- Removed later
    -- guild_id INTEGER REFERENCES guilds(id) ON DELETE SET NULL, -- Removed later
    -- guild_rank INTEGER, -- Removed later
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_characters_name_realm ON characters (name, realm);
CREATE INDEX IF NOT EXISTS idx_characters_user_id ON characters (user_id);
-- CREATE INDEX IF NOT EXISTS idx_characters_guild_id ON characters (guild_id); -- Column removed later
COMMENT ON TABLE characters IS 'Stores information about individual WoW characters';

-- Create guild_ranks table
CREATE TABLE IF NOT EXISTS guild_ranks (
    id SERIAL PRIMARY KEY,
    guild_id INTEGER REFERENCES guilds(id) ON DELETE CASCADE NOT NULL,
    rank_id INTEGER NOT NULL,
    rank_name VARCHAR(255) NOT NULL,
    is_custom BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (guild_id, rank_id)
);
COMMENT ON TABLE guild_ranks IS 'Stores guild rank definitions';

-- Create guild_members table
CREATE TABLE IF NOT EXISTS guild_members (
    id SERIAL PRIMARY KEY,
    guild_id INTEGER REFERENCES guilds(id) ON DELETE CASCADE NOT NULL,
    character_id INTEGER REFERENCES characters(id) ON DELETE CASCADE NOT NULL,
    rank INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (guild_id, character_id)
);
CREATE INDEX IF NOT EXISTS idx_guild_members_guild_id ON guild_members (guild_id);
CREATE INDEX IF NOT EXISTS idx_guild_members_character_id ON guild_members (character_id);
COMMENT ON TABLE guild_members IS 'Associates characters with guilds and their rank';

-- Create events table
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    guild_id INTEGER REFERENCES guilds(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    event_time TIMESTAMP NOT NULL,
    description TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_events_guild_id ON events (guild_id);
COMMENT ON TABLE events IS 'Stores guild event information';

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    endpoint TEXT UNIQUE NOT NULL,
    keys JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions (user_id);
COMMENT ON TABLE subscriptions IS 'Stores web push notification subscriptions';

-- =============================================================================
-- Raw SQL Migrations (from backend/database/migrations/)
-- =============================================================================

-- From 01_add_user_roles.sql (and Knex 00000000000001_add_user_roles.js)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('user', 'guild_leader', 'admin');
    END IF;
END$$;

ALTER TABLE users ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'user';
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS leader_id INTEGER REFERENCES users(id);

-- Add role column to characters table (missed in initial create)
ALTER TABLE characters ADD COLUMN IF NOT EXISTS role VARCHAR(50) NOT NULL DEFAULT 'DPS'; -- Defaulting to DPS, adjust if needed

-- Set first user as admin if no admin exists yet
DO $$
DECLARE
    first_user_id INTEGER;
BEGIN
    IF EXISTS (SELECT 1 FROM users) AND NOT EXISTS (SELECT 1 FROM users WHERE role = 'admin') THEN
        SELECT id INTO first_user_id FROM users ORDER BY id LIMIT 1;
        IF first_user_id IS NOT NULL THEN
            UPDATE users SET role = 'admin' WHERE id = first_user_id;
            RAISE NOTICE 'User with ID % has been set as admin', first_user_id;
        END IF;
    END IF;
END$$;

-- From 02_add_member_count_to_guild_ranks.sql (and Knex 00000000000002_add_member_count_to_guild_ranks.js)
ALTER TABLE guild_ranks ADD COLUMN IF NOT EXISTS member_count INTEGER NOT NULL DEFAULT 0;

-- =============================================================================
-- Remaining Knex Migrations (Translated to SQL)
-- =============================================================================

-- From 20240325161500_add_last_roster_sync_to_guilds.js
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS last_roster_sync TIMESTAMP WITH TIME ZONE;

-- From 20250327234330_allow_null_user_id_in_characters.js
ALTER TABLE characters ALTER COLUMN user_id DROP NOT NULL;

-- From 20250331144641_add_tokens_valid_since_to_users.cjs
ALTER TABLE users ADD COLUMN IF NOT EXISTS tokens_valid_since TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- From 20250331173518_update_character_guild_member_for_main_alt.js
ALTER TABLE characters ADD COLUMN IF NOT EXISTS toy_hash VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_characters_toy_hash ON characters (toy_hash);
COMMENT ON COLUMN characters.toy_hash IS 'Hash derived from toy collection for grouping unknown users';

ALTER TABLE guild_members ADD COLUMN IF NOT EXISTS is_main BOOLEAN DEFAULT false;
COMMENT ON COLUMN guild_members.is_main IS 'Is this the designated main character for the user in this guild?';

-- Drop old columns from characters (make sure this is safe for your data)
ALTER TABLE characters DROP COLUMN IF EXISTS is_main;
ALTER TABLE characters DROP COLUMN IF EXISTS guild_id;
ALTER TABLE characters DROP COLUMN IF EXISTS guild_rank;

-- From 20250401104800_add_availability_to_guild_members.js
ALTER TABLE guild_members ADD COLUMN IF NOT EXISTS consecutive_update_failures INTEGER NOT NULL DEFAULT 0;
COMMENT ON COLUMN guild_members.consecutive_update_failures IS 'Tracks consecutive Battle.net update failures for this member.';
ALTER TABLE guild_members ADD COLUMN IF NOT EXISTS is_available BOOLEAN NOT NULL DEFAULT true;
COMMENT ON COLUMN guild_members.is_available IS 'Indicates if the character is considered available for updates and display.';

-- From YYYYMMDDHHMMSS_add_jsonb_and_sync_fields.js (Assuming this runs after initial setup)
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS bnet_guild_id BIGINT;
CREATE INDEX IF NOT EXISTS idx_guilds_bnet_guild_id ON guilds (bnet_guild_id);
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS roster_json JSONB;
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS guild_data_json JSONB;
COMMENT ON COLUMN guilds.guild_data_json IS 'Stores raw JSON response from BNet Guild API';
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP; -- Assuming this is different from updated_at

ALTER TABLE characters ADD COLUMN IF NOT EXISTS bnet_character_id BIGINT;
CREATE INDEX IF NOT EXISTS idx_characters_bnet_character_id ON characters (bnet_character_id);
ALTER TABLE characters ADD COLUMN IF NOT EXISTS region VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_characters_region ON characters (region);
ALTER TABLE characters ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS profile_json JSONB;
COMMENT ON COLUMN characters.profile_json IS 'Stores raw JSON from BNet Character Profile API';
ALTER TABLE characters ADD COLUMN IF NOT EXISTS equipment_json JSONB;
COMMENT ON COLUMN characters.equipment_json IS 'Stores raw JSON from BNet Character Equipment API';
ALTER TABLE characters ADD COLUMN IF NOT EXISTS mythic_profile_json JSONB;
COMMENT ON COLUMN characters.mythic_profile_json IS 'Stores raw JSON from BNet Mythic Keystone Profile API';
ALTER TABLE characters ADD COLUMN IF NOT EXISTS professions_json JSONB;
COMMENT ON COLUMN characters.professions_json IS 'Stores raw JSON from BNet Character Professions API';
-- Drop old structured character_data column if it exists
-- ALTER TABLE characters DROP COLUMN IF EXISTS character_data; -- Uncomment if needed

ALTER TABLE guild_members ADD COLUMN IF NOT EXISTS character_name VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_guild_members_character_name ON guild_members (character_name);
ALTER TABLE guild_members ADD COLUMN IF NOT EXISTS character_class VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_guild_members_character_class ON guild_members (character_class);
ALTER TABLE guild_members ADD COLUMN IF NOT EXISTS member_data_json JSONB;
COMMENT ON COLUMN guild_members.member_data_json IS 'Stores raw JSON object for the member from BNet Guild Roster API';

-- From YYYYMMDDHHMMSS_add_member_count_to_guilds.js
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS member_count INTEGER DEFAULT 0;
COMMENT ON COLUMN guilds.member_count IS 'Cached member count from roster';

-- =============================================================================
-- Finalization
-- =============================================================================

-- Update timestamp function for updated_at columns (Optional but good practice)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger function to tables with updated_at
DO $$
DECLARE
    t_name TEXT;
BEGIN
    FOR t_name IN SELECT table_name FROM information_schema.columns WHERE column_name = 'updated_at' AND table_schema = 'public' LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS update_%s_updated_at ON %I;', t_name, t_name);
        EXECUTE format('CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();', t_name, t_name);
    END LOOP;
END$$;

COMMIT;

RAISE NOTICE 'Database initialization script completed successfully.';