# TypeScript Configuration Updates

This document outlines the changes made to improve TypeScript configuration in the project and address ECMAScript compatibility issues.

## Changes Made

### 1. Configuration Updates

#### Backend (tsconfig.json)

```json
{
  "compilerOptions": {
    "target": "es2022",           // Updated to match Node.js 20+ capabilities
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "esModuleInterop": true,      // Required for default import compatibility
    "lib": ["ES2022"],            // Explicitly include ES2022 library
    "downlevelIteration": true,   // Support for iterating Map, Set, etc.
    "typeRoots": ["./src/types", "./node_modules/@types"]  // Added to find custom type definitions
  },
  "references": [                 // Project references for monorepo structure
    { "path": "../shared" }
  ]
}
```

#### Frontend (tsconfig.json)

```json
{
  "compilerOptions": {
    "target": "ES2020",           // Good balance for browser compatibility
    "moduleResolution": "bundler", // Works better with Vite
    "downlevelIteration": true,   // Support for iterating Map, Set, etc.
  },
  "references": [
    { "path": "./tsconfig.node.json" },
    { "path": "../shared" }
  ]
}
```

#### Shared Types (tsconfig.json)

```json
{
  "compilerOptions": {
    "target": "ES2020",           // Compatible with both frontend and backend
    "module": "ESNext",
    "moduleResolution": "NodeNext",
    "declaration": true,          // Generate .d.ts files
    "declarationMap": true,       // Source maps for declarations
    "composite": true             // Enable project references
  },
  "include": ["types/**/*"]
}
```

#### Root (tsconfig.json)

```json
{
  "compilerOptions": {
    // Base options
  },
  "files": [],                    // No direct files, only references
  "references": [                 // Project references
    { "path": "./frontend" },
    { "path": "./backend" },
    { "path": "./shared" }
  ]
}
```

### 2. Type Declaration Files

#### Express Request Extensions (express.d.ts)

```typescript
// For req.user property
declare global {
  namespace Express {
    interface Request {
      user?: UserWithTokens;
      guildId?: number;
    }
  }
}
```

#### Express Session Extensions (express-session.d.ts)

```typescript
// For req.session properties
declare module "express-session" {
  interface SessionData {
    userId?: number;
    region?: BattleNetRegion;
    oauthState?: string;
    stateExpiry?: number;
    state?: string;
  }
}
```

### 3. Import Fixes

Changed default imports to namespace imports for modules without default exports:

```typescript
// Before
import crypto from "crypto";
import jwt from "jsonwebtoken";
import process from "node:process";

// After
import * as crypto from "crypto";
import * as jwt from "jsonwebtoken";
import * as process from "node:process";
```

## Benefits of These Changes

1. **Better Compatibility**: Target ES2022 for backend to fully utilize Node.js 20+ features
2. **Improved Type Safety**: Custom type declarations for Express extensions
3. **Project Organization**: Using project references for cleaner dependencies
4. **Module Resolution**: Fixed import issues with non-default exports
5. **Iteration Support**: Added downlevelIteration for proper Map/Set support

## Remaining Issues

Some issues still need to be addressed:

1. **Type Definition Ambiguities**: Duplicate exports in shared/types/index.ts
2. **Express Type Integration**: Some session properties may still need adjustments
3. **Default Imports**: There may be other files with default import issues

## Next Steps

1. Update other files with default import issues
2. Resolve type definition ambiguities in shared types
3. Create proper TypeScript paths aliases for cleaner imports
4. Set up ts-node or similar for direct TypeScript execution in development