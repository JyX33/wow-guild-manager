# Type System Migration Guide

This guide will help you understand the new type system structure and migrate code to the new types.

## New Structure

The shared types have been restructured into a more modular organization:

```
shared/types/
├── api/               # API-related types (requests, responses, pagination)
├── db/                # Database-related types
│   ├── models/        # Database models
│   └── enhanced/      # Enhanced DB models with JSON fields
├── battlenet/         # Battle.net API types
├── models/            # Application model types
├── config/            # Configuration types
├── enums/             # Shared enumerations
└── utils/             # Type utilities
```

## Migration Steps

### 1. For direct imports of a specific type

**Before:**
```typescript
import { DbGuild } from '../../../shared/types/guild';
```

**After:**
```typescript
import { DbGuild } from '../../../shared/types/db/models/guild';
```

### 2. For comprehensive imports

**Before:**
```typescript
import { DbGuild, Guild, BattleNetGuild } from '../../../shared/types';
```

**After:**
You can still use the barrel file if importing from multiple domains:
```typescript
import { DbGuild, Guild, BattleNetGuild } from '../../../shared/types';
```

Or use more specific imports for better code organization:
```typescript
import { DbGuild } from '../../../shared/types/db/models/guild';
import { Guild } from '../../../shared/types/models/guild';
import { BattleNetGuild } from '../../../shared/types/battlenet/guild';
```

### 3. Find & Replace Guidance

Here are some common type imports and their new locations:

#### API Types
- ApiResponse → api/responses.ts
- ApiError → api/responses.ts
- PaginationParams → api/pagination.ts
- HttpMethod → api/http.ts
- Roster → api/roster.ts

#### Database Types
- DbQueryCondition → db/query.ts
- DbGuild → db/models/guild.ts
- DbCharacter → db/models/character.ts
- DbGuildMember → db/models/member.ts
- DbGuildRank → db/models/rank.ts

#### BattleNet API Types
- BattleNetGuild → battlenet/guild.ts
- BattleNetCharacter → battlenet/character.ts
- TokenResponse → battlenet/auth.ts
- BattleNetUserProfile → battlenet/profile.ts

#### Application Models
- Guild → models/guild.ts
- Character → models/character.ts
- GuildMember → models/guild.ts
- Event → models/event.ts
- User → models/user.ts

#### Enums
- UserRole → enums/user.ts
- EventType → enums/event.ts
- CharacterRole → enums/guild.ts

#### Configuration
- AppConfig → config/server.ts
- BattleNetConfig → config/battlenet.ts
- AuthConfig → config/auth.ts

## Best Practices

1. Import from the most specific module possible rather than the barrel file
2. Group imports by their source module
3. Use consistent import paths throughout your code
4. Update imports gradually as you work with different parts of the code

## Backward Compatibility

For now, all types are still available through the main barrel (`shared/types/index.ts`), but this backward compatibility will be phased out over time.

## Testing

After updating imports, make sure to run type checking and build tests to ensure all imports are correct.