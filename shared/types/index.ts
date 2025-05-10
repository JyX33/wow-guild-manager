// Export all shared types, resolving conflicts explicitly

// Export everything from guild FIRST (including the preferred versions of conflicting names)
export * from './guild';

// Types from './user' (e.g., User, UserRole, DbUser, BattleNetUserProfile, BattleNetRegion, BattleNetWoWAccount, BattleNetWoWProfile)
// must now be imported directly from './user' due to runtime issues with re-exporting them here.


// Export everything from other files
export * from './event';
export * from './api';
export * from './config';
export * from './auth';
export * from './db'; // Database types
export * from './db-enhanced'; // Enhanced database types with JSON fields
export * from './error'; // Error types and factory methods