# TypeScript Issues in the Current Codebase

This document outlines TypeScript errors that were identified during the type system restructuring but are outside the scope of the current task. These should be addressed in future work.

## ESModule Compatibility Issues

Several modules are being imported with default imports that don't have default exports:

```
Module 'crypto' has no default export
Module '@types/jsonwebtoken/index' has no default export
Module 'node:process' can only be default-imported using the 'esModuleInterop' flag
```

**Solution Options:**
1. Add `"esModuleInterop": true` to tsconfig.json
2. Change import statements to use named imports
   ```typescript
   // Change this:
   import crypto from "crypto";
   // To this:
   import * as crypto from "crypto";
   ```

## Session and Request Type Issues

Many controllers access properties on `req.session` and `req.user` that TypeScript doesn't recognize:

```
Property 'region' does not exist on type 'Session & Partial<SessionData>'.
Property 'user' does not exist on type 'Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>'.
```

**Solution Options:**
1. Add proper type declarations for the extended Express session and request objects
   ```typescript
   declare module 'express-session' {
     interface SessionData {
       region?: string;
       // other session properties
     }
   }
   
   declare module 'express' {
     interface Request {
       user?: User;
       // other request extensions
     }
   }
   ```
2. Use type assertions where appropriate

## ECMAScript Target Issues

Several errors are related to ECMAScript compatibility:

```
Private identifiers are only available when targeting ECMAScript 2015 and higher.
BigInt literals are not available when targeting lower than ES2020.
Type can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher.
```

**Solution:**
Update `tsconfig.json` to use a newer target:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "downlevelIteration": true,
    // other options...
  }
}
```

## Type Definition Ambiguities

There are several exported types with the same name in different modules:

```
Module './guild' has already exported a member named 'BattleNetCharacter'. Consider explicitly re-exporting to resolve the ambiguity.
```

**Solution:**
Clean up the re-exports in the shared/types/index.ts file. This is likely a side effect of the type restructuring work, as the types have been moved to more appropriate modules but are still being re-exported from their original locations for backward compatibility.

## ESLint and Related Configuration Updates

The project appears to be using an older ESLint configuration approach:

```
ESLint couldn't find an eslint.config.(js|mjs|cjs) file.
```

**Solution:**
Update ESLint configuration to the new format using eslint.config.js.

## Next Steps

1. Address ESModule compatibility issues
2. Fix session and request type definitions
3. Update ECMAScript target settings
4. Clean up ambiguous type exports
5. Update ESLint configuration

These changes should be made in a separate effort focused on modernizing the build system and type configuration, rather than as part of the type restructuring work.

## Additional Notes

Many of these issues were present before the type restructuring work and are unrelated to it. Fixing them would improve the developer experience but requires a more comprehensive approach to updating the project's build and configuration setup.