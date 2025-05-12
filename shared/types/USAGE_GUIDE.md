# Shared Types Usage Guide

This guide explains how to use the new shared type system in the WoW Guild Manager project.

## Type Organization

The shared types are organized into the following modules:

```
shared/types/
├── api/         # API request/response types
├── db/          # Database-related types
├── battlenet/   # Battle.net API types
├── models/      # Application model types
├── config/      # Configuration types
├── enums/       # Shared enumerations
└── utils/       # Type utilities
```

## Import Patterns

There are two main ways to import types from this system:

### 1. Namespace Imports

For a cleaner approach when importing multiple types, use namespace imports:

```typescript
import * as API from '../../shared/types/api';
import * as DB from '../../shared/types/db';
import * as Models from '../../shared/types/models';

function example(response: API.ApiResponse<Models.Guild>) {
  const params: DB.DbQueryParams<DB.models.DbGuild> = {
    // ...
  };
}
```

This approach organizes your imports by domain and prevents name collisions.

### 2. Direct Imports

For more specific imports when you only need a few types:

```typescript
import { ApiResponse } from '../../shared/types/api/responses';
import { Guild } from '../../shared/types/models/guild';
import { DbGuild } from '../../shared/types/db/models/guild';
```

This approach gives you more precise control over what types are imported.

### 3. Legacy Imports

For backward compatibility, you can still use the main barrel file:

```typescript
import { Guild, DbGuild, ApiResponse } from '../../shared/types';
```

However, this approach is discouraged for new code as it may lead to less maintainable imports and doesn't provide clear domain separation.

## Module Structure

### API Types (`/api`)

API types include:
- `responses.ts`: Standard API response formats
- `requests.ts`: Request parameters and structures
- `pagination.ts`: Pagination and filtering
- `http.ts`: HTTP methods and configs
- `roster.ts`: Roster-specific API types

### Database Types (`/db`)

Database types include:
- `query.ts`: Query parameters and conditions
- `models/`: Database model interfaces
- `enhanced/`: Enhanced models with JSON fields

### BattleNet Types (`/battlenet`)

BattleNet API types include:
- `auth.ts`: Authentication types
- `profile.ts`: User profile types
- `guild.ts`: Guild API types
- `character.ts`: Character API types
- `item.ts`: Item API types
- `common.ts`: Shared types across APIs

### Application Models (`/models`)

Application models include:
- `user.ts`: User model
- `guild.ts`: Guild model
- `character.ts`: Character model
- `event.ts`: Event model

### Enumerations (`/enums`)

Shared enumerations:
- `user.ts`: User roles and regions
- `guild.ts`: Character roles
- `event.ts`: Event types and statuses

### Utilities (`/utils`)

Type utilities include:
- `helpers.ts`: Utility types like Partial, Nullable, etc.
- `guards.ts`: Type guard functions
- `errors.ts`: Error types and codes

## Best Practices

1. **Group imports by module**: Keep imports organized by their domain
2. **Use namespace imports for related types**: When importing multiple types from the same domain
3. **Use explicit paths for single types**: When only importing one or two types
4. **Avoid circular dependencies**: Be mindful of dependencies between modules
5. **Prefer type imports**: Use `import type` when possible to avoid runtime dependencies

## Examples

### Backend Controller

```typescript
import { ApiResponse } from '../../shared/types/api/responses';
import { ErrorCode } from '../../shared/types/utils/errors';
import { DbGuild } from '../../shared/types/db/models/guild';
import { Guild } from '../../shared/types/models/guild';

export async function getGuildById(id: number): Promise<ApiResponse<Guild>> {
  try {
    const dbGuild: DbGuild = await findGuildById(id);
    // Transform to application model
    const guild: Guild = mapToGuild(dbGuild);
    return { success: true, data: guild };
  } catch (error) {
    return { 
      success: false, 
      error: { 
        status: 404, 
        message: 'Guild not found', 
        code: ErrorCode.NOT_FOUND 
      } 
    };
  }
}
```

### Frontend Component

```typescript
import { FC, useState } from 'react';
import * as API from '../../../shared/types/api';
import * as Models from '../../../shared/types/models';

interface GuildListProps {
  guilds: Models.Guild[];
}

export const GuildList: FC<GuildListProps> = ({ guilds }) => {
  const [response, setResponse] = useState<API.ApiResponse<Models.Guild[]>>();
  
  // Component implementation
};
```