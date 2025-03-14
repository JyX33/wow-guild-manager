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