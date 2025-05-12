# Remaining TypeScript Issues and Solutions

This document outlines the remaining TypeScript issues that need to be addressed and provides solutions for each.

## 1. Express Session and Request Type Issues

### Issues
- `Property 'region' does not exist on type 'Session & Partial<SessionData>'`
- `Property 'user' does not exist on type 'Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>'`

### Solution
We've already created type declaration files in `backend/src/types/` for Express and Express-session, but they're not being properly recognized. To fix this:

1. **Ensure TypeScript Sees the Type Declarations**:
   - Add the types directory to the TypeScript config's typeRoots (already done)
   - If needed, add explicit references at the top of files with issues:
     ```typescript
     /// <reference path="../types/express.d.ts" />
     /// <reference path="../types/express-session.d.ts" />
     ```

2. **Fix Session Type Declaration**:
   Make sure the session type declaration includes all properties being accessed:
   ```typescript
   // express-session.d.ts
   declare module "express-session" {
     interface SessionData {
       userId?: number;
       region?: BattleNetRegion;
       state?: string;
       oauthState?: string; 
       stateExpiry?: number;
     }
   }
   ```

3. **Fix Express Request Type Declaration**:
   Ensure the request type declaration includes the user property:
   ```typescript
   // express.d.ts
   declare global {
     namespace Express {
       interface Request {
         user?: UserWithTokens;
         guildId?: number;
         // Add any other custom properties
       }
     }
   }
   ```

## 2. Default Import Issues

### Issues
- `Module 'crypto' has no default export`
- `Module 'jsonwebtoken' has no default export`
- `Module 'node:process' can only be default-imported using the 'esModuleInterop' flag`

### Solution
We've created a utility file `backend/src/utils/import-fixes.ts` that properly imports and re-exports these modules. To use it throughout the codebase:

1. **Update imports in files with default import issues**:
   ```typescript
   // Before
   import crypto from 'crypto';
   import jwt from 'jsonwebtoken';
   import process from 'node:process';

   // After - option 1: import from utility file
   import { crypto, jwt, process } from '../utils/import-fixes';

   // After - option 2: use namespace imports directly
   import * as crypto from 'crypto';
   import * as jwt from 'jsonwebtoken';
   import * as process from 'node:process';
   ```

2. **For Node.js built-in modules**, update these files:
   - `src/models/character.model.ts`
   - `src/services/battlenet-api-client-enhanced.ts`
   - `src/utils/logger.ts`

## 3. Iteration Issues

### Issues
- `Type 'MapIterator<T>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher`

### Solution
We've already added `downlevelIteration: true` to the TypeScript config, but the changes might not be taking effect. Make sure:

1. **TypeScript Config is Being Used**:
   - Run `tsc` with `--project` or `-p` flag pointing to the config:
     ```
     npx tsc -p tsconfig.json --noEmit
     ```

2. **Fix Map Iteration**:
   In case the config changes don't work, use Array.from to convert iterables before using them:
   ```typescript
   // Before
   for (const [key, value] of mapObject.entries()) { /*...*/ }

   // After
   for (const [key, value] of Array.from(mapObject.entries())) { /*...*/ }
   ```

## 4. Type Definition Ambiguities

### Issues
- `Duplicate identifier 'CharacterRole'`
- Other potential naming conflicts between new and legacy types

### Solution
We've already fixed most of these by:

1. **Using Explicit Named Type Re-Exports**:
   ```typescript
   // Instead of
   export * from './guild';

   // We use
   export type { Guild, GuildMember /*, etc */ } from './guild';
   ```

2. **Exporting Values vs Types**:
   ```typescript
   // For values
   export { CharacterRole } from './enums/guild';
   
   // For types
   export type { EventType } from './enums/event';
   ```

## Implementation Plan

1. **Fix Session Types**:
   - Update type declarations to include all properties
   - Add triple-slash references to files with issues if needed

2. **Fix Default Imports**:
   - Use the import utility in all files with default import issues
   - Start with: character.model.ts, battlenet-api-client-enhanced.ts, logger.ts

3. **Fix Iteration Issues**:
   - Update iteration patterns in specific files:
     - src/services/character-classification.service.ts (line 110, 133)
     - src/services/onboarding.service.ts (line 313)
     - src/utils/validation-monitor.ts (line 115)

4. **Test Each Fix**:
   - Run TypeScript checks on specific files to verify each fix
   - Gradually expand the scope of TypeScript checks

## Long-Term Solutions

1. **Use Project References**:
   - Set up proper TypeScript project references for monorepo structure
   - This will help with module resolution and type sharing

2. **Modernize Build System**:
   - Consider using a modern build system like Turbo, Nx, or Rush
   - Implement a consistent module resolution strategy

3. **Implement Path Aliases**:
   - Use TypeScript path aliases for cleaner imports between packages
   - Example: `import { User } from '@shared/types'` instead of relative paths

4. **ESLint Configuration Update**:
   - Update to latest ESLint with modern configuration
   - Implement import sorting and organization rules