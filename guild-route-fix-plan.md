# Guild Route Fix Plan

## Problem Identified

Looking at the error logs in `backend.log`, I discovered:

```
params {
  region: "1",
  realm: "members",
  name: "enhanced",
}

AppError: Connected realm not found for slug: members
```

This shows that when requesting `/guilds/1/members/enhanced`, it's being incorrectly interpreted as:
- region: "1" (which should be guildId)
- realm: "members"
- name: "enhanced"

The request is being handled by the `getGuildByName` controller method instead of the intended `getEnhancedGuildMembers` method.

## Root Cause

The issue is in the order of route definitions in `backend/src/routes/guild.routes.ts`:

```javascript
// Get guild by region, realm and name
router.get('/:region/:realm/:name', authMiddleware.authenticate, guildController.getGuildByName);

// Get guild members (basic)
router.get('/:guildId/members', authMiddleware.authenticate, guildController.getGuildMembers);

// Get guild members (enhanced)
router.get('/:guildId/members/enhanced', authMiddleware.authenticate, guildController.getEnhancedGuildMembers);
```

Express matches routes in the order they are defined. When requesting `/guilds/1/members/enhanced`, the route `:region/:realm/:name` is matched first because it appears earlier in the file, so it interprets:
- 1 as region
- members as realm
- enhanced as name

## Solution 

Reorder the routes in `backend/src/routes/guild.routes.ts` to prioritize more specific routes before the generic ones:

```javascript
// Get all guilds the user is in
router.get('/user', authMiddleware.authenticate, guildController.getUserGuilds);

// Get guild by ID
router.get('/id/:guildId', authMiddleware.authenticate, guildController.getGuildById);

// Get guild members (enhanced) - MORE SPECIFIC ROUTE FIRST
router.get('/:guildId/members/enhanced', authMiddleware.authenticate, guildController.getEnhancedGuildMembers);

// Get guild members (basic)
router.get('/:guildId/members', authMiddleware.authenticate, guildController.getGuildMembers);

// Guild rank management
router.get('/:guildId/ranks', authMiddleware.authenticate, guildController.getGuildRanks);

// Update rank name (protected - only guild master)
router.put('/:guildId/ranks/:rankId',
  authMiddleware.authenticate,
  isGuildMaster,
  guildController.updateRankName
);

// Get guild by region, realm and name - GENERIC ROUTE LAST
router.get('/:region/:realm/:name', authMiddleware.authenticate, guildController.getGuildByName);
```

## Implementation Note

This fix requires reordering the routes to make sure the most specific routes are defined first. Express will match routes in the order they are defined, so by putting the more specific routes first, we ensure they are matched correctly.

The implementation requires editing the `backend/src/routes/guild.routes.ts` file, which must be done in Code mode since Architect mode only supports editing markdown files.