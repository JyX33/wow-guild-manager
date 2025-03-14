-- Create type for user roles
CREATE TYPE user_role AS ENUM ('user', 'guild_leader', 'admin');

-- Create users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  battle_net_id VARCHAR(255) UNIQUE NOT NULL,
  battletag VARCHAR(255) NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_data JSONB, -- For storing additional Battle.net user data
  role user_role DEFAULT 'user'
);

-- Create guilds table
CREATE TABLE guilds (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  realm VARCHAR(255) NOT NULL,
  region VARCHAR(50) NOT NULL,
  leader_id INTEGER REFERENCES users(id),
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  guild_data JSONB, -- For storing guild data from API
  UNIQUE(name, realm, region)
);

-- Create events table
CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_type VARCHAR(50) NOT NULL, -- 'Raid', 'Dungeon', 'Special'
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  created_by INTEGER REFERENCES users(id),
  guild_id INTEGER REFERENCES guilds(id),
  max_participants INTEGER,
  event_details JSONB -- For storing flexible event details
);

-- Create event subscriptions table
CREATE TABLE event_subscriptions (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES events(id),
  user_id INTEGER REFERENCES users(id),
  status VARCHAR(50) NOT NULL, -- 'Confirmed', 'Tentative', 'Declined'
  character_name VARCHAR(255),
  character_class VARCHAR(50),
  character_role VARCHAR(50), -- 'Tank', 'Healer', 'DPS'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(event_id, user_id)
);