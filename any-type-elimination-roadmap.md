# Roadmap for Eliminating `any` Types in WoW Guild Manager

This roadmap outlines a comprehensive, phased approach to eliminate `any` type usage throughout the codebase, improving type safety and reducing the risk of runtime errors.

## Summary of Current `any` Usage

Our analysis identified six main categories of `any` type usage in the codebase:

1. **Database Query Parameters** - Types like `Record<string, any>` in model methods
2. **JSON Field Access** - Casting database records with `as any` to access JSON fields
3. **Generic API Response Types** - `ApiResponse<T = any>` and other response types
4. **Library Type Conflicts** - Casting to `any` to bypass library type mismatches
5. **External API Types** - Using `any` for unpredictable external API structures
6. **Runtime Type Tracking** - Adding monitoring properties with `as any` casts

## Phased Implementation Approach

### Phase 1: Database Query Parameters (Weeks 1-2)

**Goal:** Replace all database query parameter `any` types with strong typing

**Key Tasks:**

- Create `DbQueryCondition<T>` interfaces for type-safe querying
- Update BaseModel methods to use proper generic constraints
- Implement typed database client methods
- Create specialized query builders with proper typing
- Add type guards for database values

**Files to Modify:**

- `/shared/types/db.ts` (new)
- `/backend/src/db/BaseModel.ts`
- `/backend/src/db/db.ts`
- All model implementations

**Effort Estimate:** Medium (50-60 hours)
**Risk Level:** Medium (affects core data access)

### Phase 2: JSON Field Access (Weeks 3-4)

**Goal:** Eliminate `as any` casts when accessing JSON database fields

**Key Tasks:**

- Create enhanced database model interfaces with explicit JSON fields
- Add type guards for JSON data validation
- Update model return types to use enhanced interfaces
- Refactor controllers to use properly typed fields
- Add runtime validation for JSON data

**Files to Modify:**

- `/shared/types/db-enhanced.ts` (new)
- All model implementations
- Controllers that access JSON fields

**Effort Estimate:** Medium-High (60-70 hours)
**Risk Level:** Medium (widespread usage)

### Phase 3: API Response Types (Weeks 5-6)

**Goal:** Replace generic `any` types in API interfaces with proper structures

**Key Tasks:**

- Update ApiResponse to use `unknown` instead of `any`
- Create structured error interfaces
- Implement error factory methods
- Update controllers to use typed errors
- Enhance frontend error handling

**Files to Modify:**

- `/shared/types/api.ts`
- `/backend/src/utils/error-handler.ts`
- Controllers using error handling
- Frontend API service

**Effort Estimate:** Medium (40-50 hours)
**Risk Level:** Medium (affects error propagation)

### Phase 4: Library Type Conflicts (Weeks 7-8)

**Goal:** Resolve type conflicts with external libraries

**Key Tasks:**

- Create proper type declarations for external libraries
- Use declaration merging for type compatibility
- Add middleware type wrappers
- Update library initialization code

**Files to Modify:**

- `/backend/src/index.ts`
- Type declaration files (`.d.ts`)

**Effort Estimate:** Low-Medium (20-30 hours)
**Risk Level:** Low (isolated to specific locations)

### Phase 5: External API Types (Weeks 9-10)

**Goal:** Replace `any` in external API type definitions with proper structures

**Key Tasks:**

- Document known additional Battle.net API fields
- Create discriminated unions for variant structures
- Implement comprehensive validation
- Add runtime type checking for external API responses

**Files to Modify:**

- `/shared/types/user.ts`
- Battle.net API client

**Effort Estimate:** Low (15-20 hours)
**Risk Level:** Low (limited scope)

### Phase 6: Runtime Type Tracking (Week 11)

**Goal:** Add proper typing for runtime monitoring properties

**Key Tasks:**

- Create interfaces with index signatures
- Update database client wrapper
- Add monitoring-specific types

**Files to Modify:**

- `/backend/src/db/db.ts`

**Effort Estimate:** Very Low (5-10 hours)
**Risk Level:** Very Low (isolated monitoring code)

## Testing Strategy

Each phase should include:

1. **Static Analysis:**
   - Run TypeScript compiler in strict mode
   - Use ESLint with `@typescript-eslint/no-explicit-any` rule

2. **Unit Tests:**
   - Add tests for new interfaces and type guards
   - Test edge cases with nullable fields
   - Verify runtime type validation

3. **Integration Tests:**
   - Ensure existing functionality works with new types
   - Test data flow from API to database and back

4. **Review Process:**
   - Code review focused on type safety
   - Verify no remaining `any` types
   - Check for correct error handling

## Rollout Strategy

1. **Per-Phase Approach:**
   - Complete each phase in a separate branch
   - Run full test suite after each phase
   - Merge only when all tests pass

2. **Monitoring:**
   - Add logging to track type validation failures
   - Monitor error rates during rollout
   - Be prepared to rollback if issues arise

3. **Documentation:**
   - Update API documentation with new types
   - Document type guard usage patterns
   - Create examples for common patterns

## Expected Benefits

- **Reduced Runtime Errors:** Catching type errors at compile time
- **Better IDE Support:** Improved autocompletion and tooltips
- **Self-Documenting Code:** Types clearly show expected structures
- **Safer Refactoring:** TypeScript will catch breaking changes
- **Improved Maintainability:** New developers can understand data flow more easily

## Measuring Success

- **Metric 1:** Number of remaining `any` types (goal: zero)
- **Metric 2:** Runtime type errors in production (goal: significant reduction)
- **Metric 3:** TypeScript compilation errors during development (goal: catch errors early)
- **Metric 4:** Developer productivity metrics (goal: improved code completion, faster onboarding)
