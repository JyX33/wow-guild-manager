-- Add member_count column to guild_ranks table
ALTER TABLE guild_ranks
ADD COLUMN member_count INTEGER NOT NULL DEFAULT 0;