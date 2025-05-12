# Shared Types Restructuring Plan

## Current Structure Issues

- Types are organized by domain (guild, user, event) but mix different concerns (API, DB, application)
- Many large files with hundreds of lines
- Some type dependencies create circular references
- BattleNet API types are scattered across files
- No clear separation between API request/response types and application models

## New Structure Design

```
shared/types/
├── index.ts                     # Main barrel file exporting everything
├── api/                         # API-related types
│   ├── index.ts                 # Barrel file for API types
│   ├── responses.ts             # Standard API response structures
│   ├── requests.ts              # Common API request parameters
│   ├── errors.ts                # API error types
│   ├── pagination.ts            # Pagination types
│   └── http.ts                  # HTTP-related types
├── db/                          # Database-related types
│   ├── index.ts                 # Barrel file for DB types
│   ├── query.ts                 # Query-related types
│   ├── models/                  # Database models
│   │   ├── index.ts             # Barrel file for DB models
│   │   ├── user.ts              # User DB models
│   │   ├── guild.ts             # Guild DB models
│   │   ├── character.ts         # Character DB models
│   │   ├── member.ts            # Guild member DB models
│   │   ├── event.ts             # Event DB models
│   │   └── rank.ts              # Guild rank DB models
│   └── enhanced/                # Enhanced DB models with JSON fields
│       ├── index.ts             # Barrel file for enhanced models
│       ├── user.ts              # Enhanced user models
│       ├── guild.ts             # Enhanced guild models
│       ├── character.ts         # Enhanced character models
│       └── member.ts            # Enhanced member models
├── battlenet/                   # Battle.net API types
│   ├── index.ts                 # Barrel file for BattleNet types
│   ├── auth.ts                  # Authentication related types
│   ├── profile.ts               # Profile API types
│   ├── guild.ts                 # Guild API types
│   ├── character.ts             # Character API types
│   ├── item.ts                  # Item API types
│   ├── common.ts                # Common structures and utilities
│   └── responses.ts             # Response wrappers and utilities
├── models/                      # Application model types
│   ├── index.ts                 # Barrel file for models
│   ├── user.ts                  # User application models
│   ├── guild.ts                 # Guild application models
│   ├── character.ts             # Character application models
│   ├── event.ts                 # Event application models
│   └── roster.ts                # Roster application models
├── config/                      # Configuration types
│   ├── index.ts                 # Barrel file for config
│   ├── server.ts                # Server configuration
│   ├── auth.ts                  # Auth configuration
│   ├── battlenet.ts             # BattleNet configuration
│   └── discord.ts               # Discord configuration
├── enums/                       # Shared enumerations
│   ├── index.ts                 # Barrel file for enums
│   ├── user.ts                  # User-related enums
│   ├── guild.ts                 # Guild-related enums
│   └── event.ts                 # Event-related enums
└── utils/                       # Type utilities
    ├── index.ts                 # Barrel file for utilities
    ├── guards.ts                # Type guards
    └── helpers.ts               # Helper types and utilities
```

## Migration Strategy

1. Create the new directory structure without modifying existing files
2. Incrementally move types from the old files to the new structure:
   - Start with the most fundamental types (BattleNet API, DB query)
   - Move DB model types next
   - Move application model types
   - Move API types last (they often depend on everything else)
3. Update the main index.ts to export from the new structure
4. Maintain backward compatibility during migration
5. Update imports gradually as files are relocated

## Benefits of New Structure

1. **Separation of Concerns**: Clear distinction between API, DB, and application types
2. **Reduced File Size**: Smaller, more focused files
3. **Better Organization**: Types grouped by their purpose rather than domain
4. **Easier Maintenance**: Modular structure makes updates and extensions easier
5. **Improved Developer Experience**: Easier to find and understand type definitions
6. **Reduced Circular Dependencies**: Better organization reduces import cycles