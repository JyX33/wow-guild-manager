# Type System Improvements Implementation Plan

This document provides detailed instructions for addressing type system inconsistencies in the WoW Guild Manager application. This plan is designed for implementation by AI code tools like Claude Code.

## 1. UserWithTokens Interface Implementation

### Current Issue

The `UserWithTokens` interface is defined but not properly used throughout the codebase:

```typescript
// In shared/types/user.ts
export interface UserWithTokens extends User {
  access_token?: string;
  refresh_token?: string;
}
```

However, in backend code, the regular `User` type is used when accessing token properties:

```typescript
// In backend/src/controllers/auth.controller.ts (line ~150)
const { access_token, refresh_token, ...safeUser } = req.user;
```

### Implementation Steps

1. **Update User Model**

   Find: `backend/src/models/user.model.ts`
   
   Add a new method to explicitly return `UserWithTokens`:

```typescript
async getUserWithTokens(id: number): Promise<UserWithTokens | null> {
  try {
    const result = await this.findById(id);
    return result as UserWithTokens;
  } catch (error) {
    throw new AppError(`Error finding user with tokens: ${error instanceof Error ? error.message : String(error)}`, 500);
  }
}
```

2. **Update Auth Controller**

   Find: `backend/src/controllers/auth.controller.ts`
   
   Import the correct type:
   
```typescript
import { User, UserRole, UserWithTokens, BattleNetUserProfile } from '../../../shared/types/index';
```

   Update the getCurrentUser method to properly type the user:
   
```typescript
getCurrentUser: asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('User not found', 404);
  }
  
  // Explicitly cast to UserWithTokens to acknowledge tokens are present
  const userWithTokens = req.user as UserWithTokens;
  
  // Don't send sensitive info to frontend
  const { access_token, refresh_token, ...safeUser } = userWithTokens;
  
  res.json({ success: true, data: safeUser });
}),
```

3. **Update Auth Middleware Declaration**

   Find: `backend/src/middleware/auth.middleware.ts`
   
   Update the namespace extension:
   
```typescript
declare global {
  namespace Express {
    interface Request {
      user?: UserWithTokens;
    }
  }
}
```

4. **Fix the authenticate middleware**

   In the same file:

```typescript
authenticate: asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  // Get token from cookie or Authorization header
  const token = req.cookies.token || extractTokenFromHeader(req);
  
  if (!token) {
    // Instead of throwing an error, return a more specific message
    return res.status(401).json({
      success: false,
      error: {
        message: 'Authentication required - please log in',
        status: 401,
        details: { requiresLogin: true }
      }
    });
  }
  
  try {
    // Verify token
    const decoded = jwt.verify(token, config.auth.jwtSecret) as { id: number };
    
    // Get user from database - explicitly as UserWithTokens
    const user = await userModel.getUserWithTokens(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'User not found - please log in again',
          status: 401,
          details: { requiresLogin: true }
        }
      });
    }
    
    // Check if token is expired and needs refreshing
    if (user.token_expires_at && new Date(user.token_expires_at) < new Date()) {
      // This will be handled by the refreshToken middleware
      return res.status(401).json({
        success: false,
        error: {
          message: 'Session expired - please log in again',
          status: 401,
          details: { expired: true, requiresLogin: true }
        }
      });
    }
    
    req.user = user;
    next();
  } catch (error) {
    // Error handling code remains the same...
  }
}),
```

5. **Update Battle.net Service**

   Find: `backend/src/services/battlenet.service.ts`
   
   Update the method that uses the user access token:

```typescript
async getGuildMembers(region: string, realm: string, guildName: string, accessToken: string) {
  try {
    const regionConfig = config.battlenet.regions[region] || config.battlenet.regions.eu;
    
    const response = await axios.get(
      `${regionConfig.apiBaseUrl}/data/wow/guild/${encodeURIComponent(realm.toLowerCase())}/${encodeURIComponent(guildName.toLowerCase())}/roster`,
      {
        params: {
          namespace: `profile-${region}`,
          locale: 'en_US'
        },
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );
    
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new AppError(
        `Battle.net guild members error: ${error.response?.data?.detail || error.message}`,
        error.response?.status || 500
      );
    }
    throw new AppError(`Battle.net guild members error: ${error instanceof Error ? error.message : String(error)}`, 500);
  }
}
```

6. **Update Guild Controller**

   Find: `backend/src/controllers/guild.controller.ts`
   
   Fix the getGuildByName method:

```typescript
getGuildByName: async (req: Request, res: Response) => {
  try {
    const { region, realm, name } = req.params;
    
    // Check if guild exists in database
    let guild = await guildModel.findByNameRealmRegion(name, realm, region);
    
    if (!guild) {
      // Get user for access token - explicitly as UserWithTokens
      const user = await userModel.getUserWithTokens(req.user.id);
      
      if (!user || !user.access_token) {
        throw new AppError('User authentication token not found', 401);
      }
      
      // Fetch guild data from Battle.net API
      const guildData = await battleNetService.getGuildMembers(region, realm, name, user.access_token);
      
      // Create guild in database
      guild = await guildModel.create({
        name,
        realm,
        region,
        guild_data: guildData
      });
    }
    
    res.json({
      success: true,
      data: guild
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Get guild error:', error);
    throw new AppError('Failed to get guild information', 500);
  }
},
```

## 2. Event Type System Consistency

### Current Issue

The code uses string literals for event types instead of the defined enum:

```typescript
// In shared/types/event.ts
export type EventType = 'Raid' | 'Dungeon' | 'Special';
```

But in components, it uses raw strings:

```typescript
// In frontend/src/components/forms/EventBasicFields.tsx
<option value="Raid">Raid</option>
<option value="Dungeon">Dungeon</option>
<option value="Special">Special Event</option>
```

### Implementation Steps

1. **Convert to proper enum**

   First, let's convert the type to a proper enum in `shared/types/event.ts`:

```typescript
export enum EventType {
  RAID = 'Raid',
  DUNGEON = 'Dungeon',
  SPECIAL = 'Special'
}
```

2. **Update Event interface**

   In the same file, update the Event interface:

```typescript
export interface Event {
  id: number;
  title: string;
  description: string;
  event_type: EventType;
  start_time: string;
  end_time: string;
  created_by: number;
  guild_id: number;
  max_participants: number;
  event_details?: {
    // ...existing properties...
  };
}
```

3. **Update Event Form Schema**

   Find: `frontend/src/components/EventForm.tsx`
   
   Update the validation schema:

```typescript
import { EventType } from '../../../shared/types/event';

// Form validation schema
const EventSchema = Yup.object().shape({
  // ...other validations...
  event_type: Yup.string()
    .required('Event type is required')
    .oneOf(Object.values(EventType), 'Invalid event type'),
  // ...other validations...
});
```

4. **Update EventBasicFields component**

   Find: `frontend/src/components/forms/EventBasicFields.tsx`
   
   Update to use the enum:

```typescript
import React from 'react';
import { FormField } from './FormField';
import { EventType } from '../../../../shared/types/event';

export const EventBasicFields: React.FC = () => {
  return (
    <>
      {/* Other fields... */}
      
      <FormField
        name="event_type"
        label="Event Type"
        as="select"
        required
      >
        <option value="">Select Event Type</option>
        <option value={EventType.RAID}>{EventType.RAID}</option>
        <option value={EventType.DUNGEON}>{EventType.DUNGEON}</option>
        <option value={EventType.SPECIAL}>{EventType.SPECIAL}</option>
      </FormField>
    </>
  );
};
```

5. **Update EventCalendar component**

   Find: `frontend/src/components/EventCalendar.tsx`
   
   Update the getEventClass method:

```typescript
import { EventType } from '../../../shared/types/event';

// Get class for event based on type
const getEventClass = (eventType: string) => {
  switch (eventType) {
    case EventType.RAID:
      return "bg-red-600 text-white";
    case EventType.DUNGEON:
      return "bg-green-600 text-white";
    case EventType.SPECIAL:
      return "bg-purple-600 text-white";
    default:
      return "bg-blue-500 text-white";
  }
};
```

## 3. API Response Type Standardization

### Current Issue

Some controllers return direct data while others use the standard format:

```typescript
// Non-standard response in controllers/guild.controller.ts
res.json(guild);

// Standard format in other controllers
res.json({ success: true, data: user });
```

### Implementation Steps

1. **Update Guild Controller**

   Find: `backend/src/controllers/guild.controller.ts`
   
   Standardize the response format:

```typescript
getGuildByName: async (req: Request, res: Response) => {
  try {
    // ...existing code...
    
    res.json({
      success: true,
      data: guild
    });
  } catch (error) {
    // ...error handling...
  }
},
```

2. **Update Event Controller**

   Find: `backend/src/controllers/event.controller.ts`
   
   Standardize all responses:

```typescript
getEventById: async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    
    const event = await eventModel.findById(parseInt(eventId));
    
    if (!event) {
      return res.status(404).json({ 
        success: false,
        error: {
          message: 'Event not found',
          status: 404
        }
      });
    }
    
    res.json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error('Get event by ID error:', error);
    res.status(500).json({ 
      success: false,
      error: {
        message: 'Failed to get event',
        status: 500
      }
    });
  }
},
```

3. **Apply the same pattern to all other controller methods**

   Continue updating all controller methods to use the standard API response format:

```typescript
{
  success: true,
  data: result
}
```

   For errors:

```typescript
{
  success: false,
  error: {
    message: 'Error message',
    status: statusCode,
    details: additionalDetails // optional
  }
}
```

## 4. Nullable Types Handling

### Current Issue

There's inconsistent handling of nullable values, which could lead to runtime errors.

### Implementation Steps

1. **Update tsconfig.json**

   Find: `frontend/tsconfig.json` and `backend/tsconfig.json`
   
   Ensure both have strictNullChecks enabled:

```json
{
  "compilerOptions": {
    // ...other options...
    "strictNullChecks": true,
    // ...other options...
  }
}
```

2. **Add proper null checks**

   For example, update `frontend/src/context/AuthContext.tsx`:

```typescript
const hasRole = (roles: UserRole | UserRole[]): boolean => {
  if (!user || !user.role) return false;
  
  const requiredRoles = Array.isArray(roles) ? roles : [roles];
  return requiredRoles.includes(user.role as UserRole);
};
```

3. **Use optional chaining operator**

   Update code to use optional chaining:

```typescript
// Before
if (user && user.role === UserRole.ADMIN) {
  // do something
}

// After
if (user?.role === UserRole.ADMIN) {
  // do something
}
```

4. **Use nullish coalescing operator**

```typescript
// Before
const displayName = user && user.battletag ? user.battletag : 'Guest';

// After
const displayName = user?.battletag ?? 'Guest';
```

By applying these changes, you'll significantly improve type safety throughout the codebase, especially with regard to token handling and event types.
