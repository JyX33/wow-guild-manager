# Migrating to the New Type Structure

This guide provides instructions for migrating your code to use the new modular type structure.

## Why Migrate?

The new type structure offers several advantages:

1. **Modularity**: Types are organized into logical categories
2. **Better IDE Support**: More specific imports mean better code completion and navigation
3. **Reduced Coupling**: Dependency relationships are more explicit
4. **Improved Performance**: Potential for better TypeScript compilation performance
5. **Better Documentation**: Each type file includes documentation specific to its domain

## Migration Steps

### Step 1: Understand Your Current Imports

Before migrating, identify which types you're currently using from the shared types:

```typescript
// Old approach
import { Guild, GuildMember, ApiResponse, ErrorCode } from '../../../shared/types';
```

In this example, you're using:
- Domain models: `Guild`, `GuildMember`
- API types: `ApiResponse`
- Utility types: `ErrorCode`

### Step 2: Determine the New Import Locations

Each type category has its own directory and barrel file:

- **API types**: `shared/types/api/*`
- **DB types**: `shared/types/db/*`
- **BattleNet types**: `shared/types/battlenet/*`
- **Model types**: `shared/types/models/*`
- **Enum types**: `shared/types/enums/*`
- **Config types**: `shared/types/config/*`
- **Utility types**: `shared/types/utils/*`

### Step 3: Update Your Imports

You have several options for updating imports. Here's the recommended approach:

```typescript
// 1. Import namespaces for types you use frequently in the file
import * as API from '../../../shared/types/api';
import * as Models from '../../../shared/types/models';
import * as Utils from '../../../shared/types/utils';

// 2. Import specific types for better code references
import type { Guild, GuildMember } from '../../../shared/types/models/guild';
import type { ApiResponse } from '../../../shared/types/api/responses';
import type { ErrorCode } from '../../../shared/types/utils/errors';
```

### Step 4: Fix Type References in Your Code

If you were previously using types directly, update to use either the specific import or the namespace:

```typescript
// Old code
const guild: Guild = { /* ... */ };
const response: ApiResponse<GuildMember[]> = { /* ... */ };

// New code - direct imports
const guild: Guild = { /* ... */ };
const response: ApiResponse<GuildMember[]> = { /* ... */ };

// OR new code - namespace imports
const guild: Models.Guild = { /* ... */ };
const response: API.ApiResponse<Models.GuildMember[]> = { /* ... */ };
```

### Step 5: Handle Enum Values

Enum values should now be accessed through their namespace:

```typescript
// Old code
if (user.role === UserRole.ADMIN) { /* ... */ }

// New code
import * as Enums from '../../../shared/types/enums';

if (user.role === Enums.UserRole.ADMIN) { /* ... */ }
```

### Tips for Smooth Migration

1. **Migrate one file at a time**: Start with simpler files and work toward more complex ones.

2. **Use the import update helper script**: We've created a script to help identify imports that should be updated:
   ```bash
   node shared/types/update-imports.js path/to/file.ts
   ```

3. **Run TypeScript checks**: After updating imports, run type checking to catch any issues:
   ```bash
   npx tsc --noEmit
   ```

4. **Remove unused imports**: TypeScript will warn about imported namespaces that aren't used directly.

5. **Balance between namespace and direct imports**: 
   - Use namespace imports for types you reference infrequently
   - Use direct imports for types used extensively in a file

## Common Challenges and Solutions

### Challenge: "Cannot find module" errors

**Solution**: Double-check the import path. Make sure you're using the correct relative path.

### Challenge: "Module has no exported member" errors

**Solution**: The type might be in a different module than you expected. Check the barrel files to locate the correct module.

### Challenge: "No overload matches this call" errors

**Solution**: The type definition might have changed subtly. Check the type definition in its new location.

### Challenge: Enum value usage no longer works

**Solution**: Make sure you're importing both the type and the value:

```typescript
// Import the enum type
import type { UserRole } from '../../../shared/types/enums/user';
// Import the enum values
import * as Enums from '../../../shared/types/enums';

// Usage
const role: UserRole = Enums.UserRole.ADMIN;
```

## Request Help

If you encounter issues migrating your code, don't hesitate to reach out to the team. We're here to help make this transition as smooth as possible.