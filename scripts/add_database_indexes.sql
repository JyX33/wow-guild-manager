-- WoW Guild Manager - Database Index Optimization Script
-- This script adds performance-enhancing indexes to the database tables
-- Run on production database after backing up your database

-- Check if indexes already exist before creating them
-- This prevents errors when running the script multiple times

-- === Roster Tables Indexes ===

-- roster_members indexes
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_roster_members_character_id') THEN
        CREATE INDEX idx_roster_members_character_id ON roster_members(character_id);
        RAISE NOTICE 'Created index: idx_roster_members_character_id';
    ELSE
        RAISE NOTICE 'Index idx_roster_members_character_id already exists, skipping';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_roster_members_roster_id') THEN
        CREATE INDEX idx_roster_members_roster_id ON roster_members(roster_id);
        RAISE NOTICE 'Created index: idx_roster_members_roster_id';
    ELSE
        RAISE NOTICE 'Index idx_roster_members_roster_id already exists, skipping';
    END IF;
END $$;

-- rosters indexes
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_rosters_guild_id') THEN
        CREATE INDEX idx_rosters_guild_id ON rosters(guild_id);
        RAISE NOTICE 'Created index: idx_rosters_guild_id';
    ELSE
        RAISE NOTICE 'Index idx_rosters_guild_id already exists, skipping';
    END IF;
END $$;

-- === Events Table Indexes ===
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_events_event_time') THEN
        CREATE INDEX idx_events_event_time ON events(event_time);
        RAISE NOTICE 'Created index: idx_events_event_time';
    ELSE
        RAISE NOTICE 'Index idx_events_event_time already exists, skipping';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_events_created_by') THEN
        CREATE INDEX idx_events_created_by ON events(created_by);
        RAISE NOTICE 'Created index: idx_events_created_by';
    ELSE
        RAISE NOTICE 'Index idx_events_created_by already exists, skipping';
    END IF;
END $$;

-- === Users Table Indexes ===
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_bnet_id') THEN
        CREATE INDEX idx_users_bnet_id ON users(bnet_id);
        RAISE NOTICE 'Created index: idx_users_bnet_id';
    ELSE
        RAISE NOTICE 'Index idx_users_bnet_id already exists, skipping';
    END IF;
    
    -- Check if discord_id column exists in users table
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'discord_id'
    ) THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_discord_id') THEN
            CREATE INDEX idx_users_discord_id ON users(discord_id);
            RAISE NOTICE 'Created index: idx_users_discord_id';
        ELSE
            RAISE NOTICE 'Index idx_users_discord_id already exists, skipping';
        END IF;
    END IF;
END $$;

-- === Characters Table Additional Indexes ===
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_characters_class') THEN
        CREATE INDEX idx_characters_class ON characters(class);
        RAISE NOTICE 'Created index: idx_characters_class';
    ELSE
        RAISE NOTICE 'Index idx_characters_class already exists, skipping';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_characters_level') THEN
        CREATE INDEX idx_characters_level ON characters(level);
        RAISE NOTICE 'Created index: idx_characters_level';
    ELSE
        RAISE NOTICE 'Index idx_characters_level already exists, skipping';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_characters_role') THEN
        CREATE INDEX idx_characters_role ON characters(role);
        RAISE NOTICE 'Created index: idx_characters_role';
    ELSE
        RAISE NOTICE 'Index idx_characters_role already exists, skipping';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_characters_is_main') THEN
        CREATE INDEX idx_characters_is_main ON characters(is_main);
        RAISE NOTICE 'Created index: idx_characters_is_main';
    ELSE
        RAISE NOTICE 'Index idx_characters_is_main already exists, skipping';
    END IF;
    
    -- Check if is_available column exists in characters table
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'characters' AND column_name = 'is_available'
    ) THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_characters_is_available') THEN
            CREATE INDEX idx_characters_is_available ON characters(is_available);
            RAISE NOTICE 'Created index: idx_characters_is_available';
        ELSE
            RAISE NOTICE 'Index idx_characters_is_available already exists, skipping';
        END IF;
    END IF;
END $$;

-- === Guild Members Table Additional Indexes ===
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_guild_members_rank') THEN
        CREATE INDEX idx_guild_members_rank ON guild_members(rank);
        RAISE NOTICE 'Created index: idx_guild_members_rank';
    ELSE
        RAISE NOTICE 'Index idx_guild_members_rank already exists, skipping';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_guild_members_is_main') THEN
        CREATE INDEX idx_guild_members_is_main ON guild_members(is_main);
        RAISE NOTICE 'Created index: idx_guild_members_is_main';
    ELSE
        RAISE NOTICE 'Index idx_guild_members_is_main already exists, skipping';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_guild_members_guild_rank') THEN
        CREATE INDEX idx_guild_members_guild_rank ON guild_members(guild_id, rank);
        RAISE NOTICE 'Created index: idx_guild_members_guild_rank';
    ELSE
        RAISE NOTICE 'Index idx_guild_members_guild_rank already exists, skipping';
    END IF;
    
    -- Check if joined_at column exists in guild_members table
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'guild_members' AND column_name = 'joined_at'
    ) THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_guild_members_joined_at') THEN
            CREATE INDEX idx_guild_members_joined_at ON guild_members(joined_at);
            RAISE NOTICE 'Created index: idx_guild_members_joined_at';
        ELSE
            RAISE NOTICE 'Index idx_guild_members_joined_at already exists, skipping';
        END IF;
    END IF;
    
    -- Check if left_at column exists in guild_members table
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'guild_members' AND column_name = 'left_at'
    ) THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_guild_members_left_at') THEN
            CREATE INDEX idx_guild_members_left_at ON guild_members(left_at);
            RAISE NOTICE 'Created index: idx_guild_members_left_at';
        ELSE
            RAISE NOTICE 'Index idx_guild_members_left_at already exists, skipping';
        END IF;
    END IF;
END $$;

-- === Guild Ranks Table Additional Indexes ===
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_guild_ranks_rank_id') THEN
        CREATE INDEX idx_guild_ranks_rank_id ON guild_ranks(rank_id);
        RAISE NOTICE 'Created index: idx_guild_ranks_rank_id';
    ELSE
        RAISE NOTICE 'Index idx_guild_ranks_rank_id already exists, skipping';
    END IF;
END $$;

-- Run ANALYZE to update statistics for query planner
ANALYZE;

RAISE NOTICE 'Database index optimization complete';