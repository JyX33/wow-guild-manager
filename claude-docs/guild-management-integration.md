# Guild Management Page Integration Plan

## Implementation Steps

### 1. Enable Guild Master Verification

**File:** `frontend/src/pages/GuildManagePage.tsx`  

```typescript
// Replace lines 33-38 with:
const userGuildsResponse = await guildService.getUserGuilds();
if (userGuildsResponse.success && userGuildsResponse.data) {
  const matchingGuild = userGuildsResponse.data.find(
    g => g.id === parseInt(guildId)
  );
  setIsGuildMaster(matchingGuild?.is_guild_master || false);
}
```

### 2. Add Route Configuration

**File:** `frontend/src/App.tsx` (or routing config)

```typescript
// Add to route declarations
{
  path: '/guild/:guildId/manage',
  element: <GuildManagePage />,
  meta: {
    requiresAuth: true
  }
}
```

### 3. Add Navigation Element

**File:** `frontend/src/pages/GuildPage.tsx`  

```typescript
// Add to header section (near line 45):
{isGuildMaster && (
  <Link 
    to={`/guild/${guild.id}/manage`}
    className="ml-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
  >
    <GearIcon className="w-4 h-4 mr-2" />
    Manage Guild
  </Link>
)}
```

### 4. Backend API Verification

**File:** `backend/src/routes/guild.routes.ts`  

```typescript
// Ensure GET /guilds/user returns:
interface UserGuildResponse {
  id: number;
  name: string;
  is_guild_master: boolean;
  // ... other fields
}
```

## Validation Checklist

- [ ] Test navigation from GuildPage to ManagePage
- [ ] Verify non-guild masters get redirected
- [ ] Confirm API returns proper is_guild_master status
- [ ] Test all management tabs functionality
- [ ] Validate sync button workflow

## Required Dependencies

```typescript
// Add to GuildPage imports:
import { Link } from 'react-router-dom';
import { GearIcon } from '@/components/icons';
```

## Risk Mitigation

1. Add error boundary around management page
2. Implement loading states for permission checks
3. Add audit logging for management actions
