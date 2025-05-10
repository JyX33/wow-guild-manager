# Phase 2: Eliminating `any` Type in JSON Field Access

## Overview

This implementation plan focuses on replacing all `any` type assertions used when accessing JSON fields stored in the database. These are typically fields like `profile_json`, `equipment_json`, etc. that store serialized Battle.net API responses.

## Current Issues

1. The codebase frequently accesses JSON fields using `(entity as any).json_field`.
2. The return types of model methods don't properly reflect the JSON fields.
3. There's inconsistency in how JSON data is accessed and parsed.

## Implementation Steps

### 1. Create Enhanced Database Model Interfaces

```typescript
// /mnt/f/Projects/wow-guild-manager/shared/types/db-enhanced.ts

import {
  DbGuild,
  DbCharacter,
  DbGuildMember,
  BattleNetGuild,
  BattleNetGuildRoster,
  BattleNetCharacter,
  BattleNetCharacterEquipment,
  BattleNetMythicKeystoneProfile,
  BattleNetProfessions
} from './guild.js';

import { BattleNetUserProfile } from './user.js';

/**
 * Enhanced database models that explicitly include JSON fields
 * with proper typing instead of using any
 */

export interface DbGuildEnhanced extends DbGuild {
  guild_data_json?: BattleNetGuild | null;
  roster_json?: BattleNetGuildRoster | null;
}

export interface DbCharacterEnhanced extends DbCharacter {
  profile_json?: BattleNetCharacter | null;
  equipment_json?: BattleNetCharacterEquipment | null;
  mythic_profile_json?: BattleNetMythicKeystoneProfile | null;
  professions_json?: BattleNetProfessions['primaries'] | null;
}

export interface DbGuildMemberEnhanced extends DbGuildMember {
  member_data_json?: BattleNetGuildMember | null;
}

export interface DbUserEnhanced extends DbUser {
  user_data?: BattleNetUserProfile | null;
}

/**
 * Type guards to verify JSON data structures
 */

export function isBattleNetGuild(data: unknown): data is BattleNetGuild {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'name' in data &&
    'faction' in data &&
    'realm' in data
  );
}

export function isBattleNetGuildRoster(data: unknown): data is BattleNetGuildRoster {
  return (
    typeof data === 'object' &&
    data !== null &&
    '_links' in data &&
    'guild' in data &&
    'members' in data &&
    Array.isArray((data as any).members)
  );
}

export function isBattleNetCharacter(data: unknown): data is BattleNetCharacter {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'name' in data &&
    'realm' in data
  );
}

// Add similar type guards for other Battle.net structures
```

### 2. Update BaseModel to Support JSON Fields

```typescript
// /mnt/f/Projects/wow-guild-manager/backend/src/db/BaseModel.ts

import { DbQueryCondition } from '../../../shared/types/db.js';

export default class BaseModel<T, TEnhanced extends T = T> {
  tableName: string;
  
  constructor(tableName: string) {
    this.tableName = tableName;
  }
  
  /**
   * Find a single record by ID with proper JSON field typing
   */
  async findById(id: number): Promise<TEnhanced | null> {
    try {
      const result = await db.query(
        `SELECT * FROM ${this.tableName} WHERE id = $1`,
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      throw new AppError(`Error finding ${this.tableName} by ID: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
  
  /**
   * Find all records matching conditions with proper JSON field typing
   */
  async findAll(conditions?: DbQueryCondition<T>): Promise<TEnhanced[]> {
    try {
      if (!conditions || Object.keys(conditions).length === 0) {
        const result = await db.query(`SELECT * FROM ${this.tableName}`);
        return result.rows;
      }
      
      const keys = Object.keys(conditions);
      const values = Object.values(conditions);
      
      const whereClause = keys.map((key, index) => `${key} = $${index + 1}`).join(' AND ');
      
      const result = await db.query(
        `SELECT * FROM ${this.tableName} WHERE ${whereClause}`,
        values
      );
      return result.rows;
    } catch (error) {
      throw new AppError(`Error finding all ${this.tableName}: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
  
  // Other methods similarly updated...
}
```

### 3. Update Individual Models with Enhanced Types

```typescript
// /mnt/f/Projects/wow-guild-manager/backend/src/models/guild.model.ts

import { Guild } from '../../../shared/types/index.js';
import { 
  DbGuild, 
  BattleNetGuildRoster, 
  BattleNetGuildMember,
  BattleNetGuild
} from '../../../shared/types/guild.js';
import { DbGuildEnhanced, isBattleNetGuild, isBattleNetGuildRoster } from '../../../shared/types/db-enhanced.js';
import BaseModel from '../db/BaseModel.js';
import { AppError } from '../utils/error-handler.js';
import db from '../db/db.js';
import { Guild as GuildType } from '../../../shared/types/guild.js';

export class GuildModel extends BaseModel<DbGuild, DbGuildEnhanced> {
  constructor() {
    super('guilds');
  }
  
  /**
   * Get a guild with its raw Battle.net members from roster_json
   */
  async getGuildWithMembers(guildId: number): Promise<{ guild: DbGuildEnhanced; members: BattleNetGuildMember[] } | null> {
    try {
      // Get the guild first (now properly typed with DbGuildEnhanced)
      const guild = await this.findById(guildId);
      
      if (!guild) {
        return null;
      }
      
      // Get members from roster_json (now properly typed)
      const members: BattleNetGuildMember[] = 
        (guild.roster_json && Array.isArray(guild.roster_json.members)) 
          ? guild.roster_json.members 
          : [];
      
      return {
        guild,
        members
      };
    } catch (error) {
      throw new AppError(`Error retrieving guild with members: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
  
  /**
   * Update guild data from the API
   */
  async updateGuildData(id: number, guildDataJson: BattleNetGuild): Promise<DbGuildEnhanced | null> {
    try {
      // Validate input
      if (!isBattleNetGuild(guildDataJson)) {
        throw new Error('Invalid guild data format');
      }
      
      return await this.update(id, {
        guild_data_json: guildDataJson,
        last_updated: new Date().toISOString()
      });
    } catch (error) {
      throw new AppError(`Error updating guild data: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
  
  /**
   * Update guild roster from the API
   */
  async updateGuildRoster(id: number, rosterJson: BattleNetGuildRoster): Promise<DbGuildEnhanced | null> {
    try {
      // Validate input
      if (!isBattleNetGuildRoster(rosterJson)) {
        throw new Error('Invalid guild roster format');
      }
      
      return await this.update(id, {
        roster_json: rosterJson,
        last_roster_sync: new Date().toISOString()
      });
    } catch (error) {
      throw new AppError(`Error updating guild roster: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
  
  // Other methods similarly updated...
}
```

### 4. Update Character Model

```typescript
// /mnt/f/Projects/wow-guild-manager/backend/src/models/character.model.ts

import { 
  DbCharacter,
  BattleNetCharacter,
  BattleNetCharacterEquipment,
  BattleNetMythicKeystoneProfile,
  BattleNetProfessions
} from '../../../shared/types/guild.js';
import { 
  DbCharacterEnhanced, 
  isBattleNetCharacter 
} from '../../../shared/types/db-enhanced.js';
import BaseModel from '../db/BaseModel.js';
import { AppError } from '../utils/error-handler.js';

export class CharacterModel extends BaseModel<DbCharacter, DbCharacterEnhanced> {
  constructor() {
    super('characters');
  }
  
  /**
   * Update character profile data
   */
  async updateCharacterProfile(
    id: number, 
    profileData: BattleNetCharacter,
    equipmentData?: BattleNetCharacterEquipment | null,
    mythicData?: BattleNetMythicKeystoneProfile | null,
    professionsData?: BattleNetProfessions['primaries'] | null
  ): Promise<DbCharacterEnhanced | null> {
    try {
      // Validate input
      if (!isBattleNetCharacter(profileData)) {
        throw new Error('Invalid character profile format');
      }
      
      const updateData: Partial<DbCharacterEnhanced> = {
        profile_json: profileData,
        last_synced_at: new Date().toISOString(),
        is_available: true
      };
      
      if (equipmentData) {
        updateData.equipment_json = equipmentData;
      }
      
      if (mythicData) {
        updateData.mythic_profile_json = mythicData;
      }
      
      if (professionsData) {
        updateData.professions_json = professionsData;
      }
      
      return await this.update(id, updateData);
    } catch (error) {
      throw new AppError(`Error updating character profile: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
  
  // Other methods similarly updated...
}
```

### 5. Update Controllers to Use Enhanced Types

```typescript
// /mnt/f/Projects/wow-guild-manager/backend/src/controllers/guild.controller.ts

import { 
  BattleNetCharacter,
  BattleNetCharacterEquipment,
  BattleNetGuildRoster,
  BattleNetMythicKeystoneProfile,
  BattleNetProfessions,
  CharacterRole,
  EnhancedGuildMember
} from '../../../shared/types/guild.js';
import { 
  DbCharacterEnhanced,
  DbGuildEnhanced,
  DbGuildMemberEnhanced
} from '../../../shared/types/db-enhanced.js';
import * as characterModel from '../models/character.model.js';
import * as guildModel from '../models/guild.model.js';
import * as guildMemberModel from '../models/guild_member.model.js';

// Example method with proper typing
const getEnhancedGuildMembers = asyncHandler(async (req: Request, res: Response) => {
  logger.info({ method: req.method, path: req.path, params: req.params, query: req.query, userId: req.session?.userId }, 'Handling getEnhancedGuildMembers request');
  const { guildId } = req.params;
  const guildIdInt = parseInt(guildId);

  // Input validation...

  // Fetch guild members with proper typing
  const dbGuildMembers: DbGuildMemberEnhanced[] = await guildMemberModel.findByGuildAndRanks(guildIdInt);
  
  if (dbGuildMembers.length === 0) {
    return res.json({ success: true, data: [], stats: { total: 0, successful: 0, failed: 0, errors: [] } });
  }

  // Extract character IDs
  const characterIds = dbGuildMembers.map(member => member.character_id);

  // Fetch characters with proper typing
  const dbCharacters: DbCharacterEnhanced[] = await characterModel.findByIds(characterIds);
  
  // Create a map for easy lookup
  const characterMap = new Map<number, DbCharacterEnhanced>();
  dbCharacters.forEach(char => characterMap.set(char.id, char));

  // Process with type safety - no more (x as any) casts!
  let successCount = 0;
  let errorCount = 0;
  const errors: Array<{ name: string; error: string }> = [];

  const mappedMembers = dbGuildMembers.map(member => {
    const character = characterMap.get(member.character_id);
    const memberName = member.character_name;

    if (!character) {
      logger.warn({ guildMemberId: member.id, characterId: member.character_id, guildId: guildIdInt }, `Character data not found in DB for guild member ID ${member.id}, character ID ${member.character_id}`);
      errorCount++;
      errors.push({ name: memberName || `Unknown (ID: ${member.character_id})`, error: 'Character data missing in DB' });
      return null;
    }

    try {
      // Access JSON fields with proper typing
      const profileData = character.profile_json;
      const equipmentData = character.equipment_json;
      const mythicData = character.mythic_profile_json;
      const professionsData = character.professions_json;

      // Determine role from profile data
      const specName = profileData?.active_spec?.name;
      // Role determination logic...

      successCount++;
      
      // Construct response object with proper types
      const enhancedMember: EnhancedGuildMember = {
        // Member fields...
      };
      
      return enhancedMember;
    } catch (parseError) {
      // Error handling...
      return null;
    }
  });
  
  // Rest of the controller...
});
```

## Testing Plan

1. Add unit tests for JSON field parsing and validation
2. Add tests that verify type guards reject invalid data
3. Test edge cases like null fields and partial data
4. Run TypeScript compiler in strict mode to verify type safety
5. Verify seamless integration with existing code using these types