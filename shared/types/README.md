# WoW Guild Manager Shared Types

This directory contains the shared type definitions used between the frontend and backend of the WoW Guild Manager application.

## Structure

The types are organized into the following modules:

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

## Documentation

For detailed documentation on how to use these types, please refer to:

- [Usage Guide](./USAGE_GUIDE.md) - Comprehensive guide on how to use the type system
- [Migration Guide](./MIGRATION_GUIDE.md) - Guide for migrating from the old type structure

## Helper Tools

The following helper tools are available to assist with using and maintaining the type system:

- `update-imports.js` - A tool to help migrate imports to the new structure
- `test-exports.ts` - A type compatibility test file to verify exports

## Usage

### Import Patterns

**Namespace imports** (recommended for multiple types from the same domain):

```typescript
import * as API from '../../shared/types/api';
import * as Models from '../../shared/types/models';

function example(response: API.ApiResponse<Models.Guild>) {
  // ...
}
```

**Direct imports** (recommended for specific types):

```typescript
import { ApiResponse } from '../../shared/types/api/responses';
import { Guild } from '../../shared/types/models/guild';

function example(response: ApiResponse<Guild>) {
  // ...
}
```

## Scripts

Run these scripts from the shared directory:

- `npm run test:types` - Verify type compatibility
- `npm run update-imports [directory]` - Find import statements that could be updated to use the new structure

## Design Principles

1. **Separation of concerns** - Types are separated by their domain
2. **Clear organization** - Types are grouped by their purpose
3. **Explicit imports** - Direct imports make dependencies clear
4. **Namespace support** - Namespace imports reduce import clutter

## Maintenance

When adding new types:

1. Add them to the appropriate module
2. Export them from the module's index.ts file
3. Run the type tests to ensure compatibility
4. Update documentation if necessary