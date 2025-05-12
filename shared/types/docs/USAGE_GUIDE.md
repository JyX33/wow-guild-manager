# Using the Shared Types System

This guide explains how to effectively use the shared types system in the WoW Guild Manager application.

## Type Organization

The shared types are organized into the following categories:

- **API**: Types related to API requests and responses
- **DB**: Database model types and enhanced versions with JSON fields
- **BattleNet**: Types for Battle.net API interactions
- **Models**: Application domain models
- **Enums**: Enumerated values and constants
- **Config**: Configuration-related types
- **Utils**: Utility types like error handling

## Importing Types

There are two primary ways to import types:

### 1. Namespace Imports

This approach is recommended for improved organization and clarity:

```typescript
// Import entire namespaces
import * as API from '../../../shared/types/api';
import * as Models from '../../../shared/types/models';
import * as Enums from '../../../shared/types/enums';
import * as DB from '../../../shared/types/db';
import * as BattleNet from '../../../shared/types/battlenet';
import * as Config from '../../../shared/types/config';
import * as Utils from '../../../shared/types/utils';

// Use types with namespace
const response: API.ApiResponse<Models.Guild> = {...};
const userRole = Enums.UserRole.ADMIN;
```

### 2. Direct Type Imports

For specific types that are used frequently in a file:

```typescript
// Import directly for better type references in code
import type { ApiResponse, ApiError } from '../../../shared/types/api/responses';
import type { Guild, GuildMember } from '../../../shared/types/models/guild';
import type { UserRole } from '../../../shared/types/enums/user';
```

### 3. Mixed Approach (Recommended)

For the best developer experience, combine both approaches:

```typescript
// Import namespaces for general use
import * as API from '../../../shared/types/api';
import * as Models from '../../../shared/types/models';
import * as Enums from '../../../shared/types/enums';

// Import specific types for better code references
import type { Guild, GuildMember } from '../../../shared/types/models/guild';
import type { ApiResponse } from '../../../shared/types/api/responses';
import type { UserRole } from '../../../shared/types/enums/user';

// Use in code
const guild: Guild = {...};  // Direct type reference
const response: API.ApiResponse<Models.GuildRank[]> = {...};  // Namespace usage
```

### Note on Imported Namespaces Without Usage

If you import a namespace but don't use it directly (only importing specific types from it), TypeScript will show a warning about the unused import. This is normal and helps identify imports that could be removed.

## Type Categories and Usage

### API Types

Located in `shared/types/api/*`:

- **requests.ts**: Request parameter types
- **responses.ts**: Response formats and error handling
- Module-specific API types (roster.ts, event.ts, etc.)

```typescript
import * as API from '../../../shared/types/api';
import type { ApiResponse } from '../../../shared/types/api/responses';

const handler = (req, res) => {
  const response: ApiResponse<User[]> = {
    success: true,
    data: users
  };
  res.json(response);
};
```

### Database Types

Located in `shared/types/db/*`:

- **models/**: Base database models
- **enhanced/**: Enhanced models with JSON field handling

```typescript
import * as DB from '../../../shared/types/db';
import type { DbGuildMember } from '../../../shared/types/db/models/member';

const getMembers = async (): Promise<DbGuildMember[]> => {
  // Database query logic
};
```

### Application Model Types

Located in `shared/types/models/*`:

- Domain objects used throughout the application
- Often derived from DB or API types with additional properties

```typescript
import * as Models from '../../../shared/types/models';
import type { Guild } from '../../../shared/types/models/guild';

function displayGuild(guild: Guild) {
  // UI rendering logic
}
```

### Enum Types

Located in `shared/types/enums/*`:

- Constants and enumerated values

```typescript
import * as Enums from '../../../shared/types/enums';
import type { UserRole } from '../../../shared/types/enums/user';

if (user.role === Enums.UserRole.ADMIN) {
  // Admin-specific logic
}
```

## Legacy Imports

For backward compatibility, the main index.ts file re-exports all types in their original structure. It's recommended to migrate to the new import patterns for better organization and maintainability.

```typescript
// Legacy import (still works but not recommended)
import { Guild, GuildMember } from '../../../shared/types';

// Preferred approach
import type { Guild, GuildMember } from '../../../shared/types/models/guild';
```

## Extending Types

When extending existing types, import the type directly and extend it:

```typescript
import type { DbGuildMember } from '../../../shared/types/db/models/member';

interface EnhancedMember extends DbGuildMember {
  customProperty: string;
}
```