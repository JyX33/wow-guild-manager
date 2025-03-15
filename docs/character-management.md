# Character Management Feature

## Overview

This feature adds character management to the WoW Guild Manager application, allowing users to:

1. Create and manage multiple characters
2. Designate one character as their main character
3. Use existing characters when signing up for events

## Implementation Details

### Database Changes

- Added a new `characters` table to store user characters
- Modified the `event_subscriptions` table to reference characters by ID instead of storing character details directly

### Backend Components

- `CharacterModel`: Handles CRUD operations for characters
- `CharacterController`: Provides API endpoints for character management
- Migration scripts: For transferring existing character data from event subscriptions

### Frontend Components

- `CharactersPage`: Main page for managing characters
- `CharacterList`: Displays user's characters with options to edit/delete
- `CharacterForm`: Form for creating/editing characters
- `CharacterSelector`: Component for selecting characters in other parts of the application

## Deployment Steps

1. **Database Migration**
   - Apply schema changes first:

     ```sql
     -- Create characters table
     CREATE TABLE characters (
       id SERIAL PRIMARY KEY,
       user_id INTEGER REFERENCES users(id) NOT NULL,
       name VARCHAR(255) NOT NULL,
       realm VARCHAR(255) NOT NULL,
       class VARCHAR(50) NOT NULL,
       level INTEGER NOT NULL,
       role VARCHAR(50) NOT NULL,
       is_main BOOLEAN DEFAULT FALSE,
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       character_data JSONB,
       UNIQUE(user_id, name, realm)
     );

     -- Update event_subscriptions table
     ALTER TABLE event_subscriptions ADD COLUMN character_id INTEGER REFERENCES characters(id);
     ```

2. **Data Migration**
   - Run the migration script to create characters from existing subscriptions:

     ```bash
     ./scripts/migrate-characters.js
     ```

3. **Final Schema Update**
   - After successful data migration, remove the old character columns:

     ```sql
     ALTER TABLE event_subscriptions DROP COLUMN character_name;
     ALTER TABLE event_subscriptions DROP COLUMN character_class;
     ALTER TABLE event_subscriptions DROP COLUMN character_role;
     ```

## Feature Usage

### Managing Characters

1. Users can access character management from the dashboard or user menu
2. The character list shows all characters with options to edit, delete, or set as main
3. The main character is automatically selected when joining events

### Event Registration

1. When registering for an event, users select from their existing characters
2. The main character is pre-selected by default
3. Users can still change their status (Confirmed/Tentative/Declined) as before

## Troubleshooting

### Migration Issues

If the migration script fails:

1. Check the logs for specific errors
2. Verify database connectivity and permissions
3. Run the script with `--debug` flag for more information:

   ```bash
   ./scripts/migrate-characters.js --debug
   ```

### Missing Character Data

If users report missing characters after migration:

1. Check that the migration completed successfully
2. Verify that event subscriptions have been correctly linked to characters
3. Users can always manually create new characters through the UI
