# `any` Type Usage Analysis in WoW Guild Manager

## Categories of `any` Usage

### 1. Generic API Response Types

**Location**: `/mnt/f/Projects/wow-guild-manager/shared/types/api.ts`

- Line 2: `export interface ApiResponse<T = any>`
- Line 13: `details?: any;`
- Line 80: `data?: any;`

**Impact**: Medium

- Generic type parameters can often be replaceable with `unknown`
- The `details` field should have a defined structure or use `unknown`

### 2. External API Types

**Location**: `/mnt/f/Projects/wow-guild-manager/shared/types/user.ts`

- Line 18: `[key: string]: any; // For any additional fields returned by Battle.net API`

**Impact**: Low

- Provides flexibility for unpredictable external API responses
- Could be replaced with a more specific mapping or interface extension

### 3. Database Query Parameters

**Location**: `/mnt/f/Projects/wow-guild-manager/backend/src/db/BaseModel.ts`

- Line 29: `async findAll(conditions?: Record<string, any>): Promise<T[]>`
- Line 124: `async findOne(conditions: Record<string, any>): Promise<T | null>`
- Line 145: `async count(conditions?: Record<string, any>): Promise<number>`
- Line 148: `let values: any[] = [];`

**Location**: `/mnt/f/Projects/wow-guild-manager/backend/src/db/db.ts`

- Line 26: `query: (text: string, params?: any[])`
- Line 45: `client.query = (...args: any[]): Promise<any>`
- Line 49: `return originalQuery.apply(client, args as any) as unknown as Promise<any>;`

**Impact**: High

- Significant risk as it allows arbitrary values in database queries
- Strong typing here would provide safety against SQL injection and errors

### 4. Library Type Conflicts

**Location**: `/mnt/f/Projects/wow-guild-manager/backend/src/index.ts`

- Line 52: `const PgStore = connectPgSimple(session as any);`
- Line 76: `}) as any); // Cast to any to bypass complex type error for now`

**Impact**: Medium

- Used to bypass type mismatches between libraries
- Could be fixed with proper type declarations or middleware type definitions

### 5. JSON Field Access

**Location**: `/mnt/f/Projects/wow-guild-manager/backend/src/controllers/guild.controller.ts`

- Line 306-309:

  ```typescript
  const profileData = (character as any).profile_json as BattleNetCharacter | null;
  const equipmentData = (character as any).equipment_json as BattleNetCharacterEquipment | null;
  const mythicData = (character as any).mythic_profile_json as BattleNetMythicKeystoneProfile | null;
  const professionsData = (character as any).professions_json as BattleNetProfessions | null;
  ```

**Impact**: High

- Used to access JSON fields on database records without proper typing
- Risk of runtime errors if field structure changes

### 6. Runtime Type Tracking

**Location**: `/mnt/f/Projects/wow-guild-manager/backend/src/db/db.ts`

- Line 33: `(client as any).lastQuery = null;`
- Line 37: `logger.error({ lastQuery: (client as any).lastQuery }, 'A client has been checked out for more than 5 seconds!');`
- Line 46: `(client as any).lastQuery = args;`

**Impact**: Low

- Used for adding runtime properties to track query execution
- Limited scope and isolated to monitoring logic

## Prioritized Replacement Plan

1. Database Query Parameters (Priority: Critical)
   - Replace all `Record<string, any>` with strongly typed interfaces
   - Define query parameter interfaces for each model

2. JSON Field Access (Priority: High)
   - Create proper interfaces for database models with JSON fields
   - Update model return types to include these fields

3. Generic API Response Types (Priority: Medium)
   - Replace `T = any` with `T = unknown` where appropriate
   - Create proper error detail interfaces

4. Library Type Conflicts (Priority: Medium)
   - Create proper type declarations for external libraries
   - Use declaration merging to resolve conflicts

5. External API Types (Priority: Low)
   - Consider documenting known additional fields
   - Use Partial<> and discriminated unions for variant structures

6. Runtime Type Tracking (Priority: Low)
   - Create interfaces with index signatures for runtime properties
   - Or create a custom type that extends the base type with monitoring fields
