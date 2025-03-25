# Enhancement Plan: Guild Relationship Management in WoW Guild Manager

## Executive Summary

This document outlines a plan to improve the management of guild relationships within the WoW Guild Manager application. The plan addresses three key areas: leader_id utilization, guild rank management, and character-guild associations. These enhancements will reduce API calls, improve data consistency, and provide more reliable guild management features.

## Current State Assessment

Based on code analysis, the following issues were identified:

1. **leader_id Underutilization**: This field exists in the database schema but isn't actively maintained or used for authorization.

2. **Guild Rank Synchronization**: Guild ranks are stored locally but lack automated synchronization with Battle.net.

3. **Character-Guild Association**: Characters lack consistent guild_id assignments, making guild roster management inefficient.

## Enhancement Plan

### 1. Leader_id Valorization and Maintenance

#### Objectives

- Properly initialize and maintain the leader_id field
- Reduce Battle.net API calls for guild leadership verification
- Implement a reliable caching mechanism for leadership status

#### Implementation Steps

1. **Update Guild Creation/Discovery Process**:

   ```typescript
   // In guild.controller.ts - getGuildByName method
   async getGuildByName(req: Request, res: Response) {
     // Existing code to fetch guild data
     // After fetching guild roster from Battle.net:
     const guildMaster = guildRoster.members.find(member => member.rank === 0);
     if (guildMaster) {
       // Find user who owns this character
       const guildMasterUser = await userModel.findByCharacterName(
         guildMaster.character.name,
         guildMaster.character.realm.slug
       );
       
       if (guildMasterUser) {
         // Update guild with leader_id
         guild.leader_id = guildMasterUser.id;
         await guildModel.update(guild.id, { 
           leader_id: guildMasterUser.id,
           last_updated: new Date().toISOString()
         });
       }
     }
   }
   ```

2. **Create a Leadership Verification Service**:

   ```typescript
   // New file: src/services/guild-leadership.service.ts
   export const verifyGuildLeadership = async (guildId: number, userId: number): Promise<boolean> => {
     // First check database for leader_id
     const guild = await guildModel.findById(guildId);
     
     if (guild && guild.leader_id === userId) {
       // If last_updated is recent (within 1 day), trust the database
       const oneDayAgo = new Date();
       oneDayAgo.setDate(oneDayAgo.getDate() - 1);
       
       if (guild.last_updated && new Date(guild.last_updated) > oneDayAgo) {
         return true;
       }
     }
     
     // Otherwise, verify with Battle.net API
     // [existing API verification logic]
     
     // Update leader_id if needed
     if (isGuildMaster && guild && guild.leader_id !== userId) {
       await guildModel.update(guild.id, { 
         leader_id: userId,
         last_updated: new Date().toISOString()
       });
     }
     
     return isGuildMaster;
   }
   ```

3. **Update Guild Master Middleware**:

   ```typescript
   // In guild-master.middleware.ts
   export const isGuildMaster = async (req: Request, res: Response, next: NextFunction) => {
     try {
       const guildId = parseInt(req.params.guildId);
       const userId = (req.user as { id: number }).id;
       
       // Use the verification service instead of direct API calls
       const isGM = await verifyGuildLeadership(guildId, userId);
       
       if (!isGM) {
         return res.status(403).json({
           success: false,
           error: {
             message: 'You must be the guild master to perform this action',
             status: 403
           }
         });
       }
       
       next();
     } catch (error) {
       next(error);
     }
   };
   ```

4. **Add Periodic Refresh Task**:

   ```typescript
   // In a new scheduled task file
   export const refreshGuildLeadership = async () => {
     // Get guilds with outdated information
     const outdatedGuilds = await guildModel.findOutdatedGuilds();
     
     for (const guild of outdatedGuilds) {
       try {
         // Refresh guild data from Battle.net
         // Update leader_id as needed
       } catch (error) {
         console.error(`Failed to refresh guild ${guild.id}:`, error);
       }
     }
   };
   
   // Schedule this task to run daily
   ```

### 2. Guild Rank Management Enhancement

#### Objectives

- Improve guild rank synchronization
- Maintain consistent rank information
- Provide better rank management interfaces

#### Implementation Steps

1. **Add Rank Synchronization During Guild Data Refresh**:

   ```typescript
   // In guild.controller.ts or a dedicated service
   async function syncGuildRanks(guildId: number, guildRoster: any) {
     // Get existing custom ranks
     const existingRanks = await rankModel.getGuildRanks(guildId);
     
     // Find all unique ranks in the roster
     const rosterRanks = new Set();
     guildRoster.members.forEach(member => {
       rosterRanks.add(member.rank);
     });
     
     // For each roster rank, ensure it exists in database
     for (const rankId of rosterRanks) {
       const existingRank = existingRanks.find(r => r.rank_id === rankId);
       
       if (!existingRank) {
         // Create default rank with Battle.net's naming convention
         const defaultName = rankId === 0 ? "Guild Master" : `Rank ${rankId}`;
         
         await rankModel.setGuildRank(
           guildId,
           rankId,
           defaultName
         );
       }
     }
   }
   ```

2. **Add Rank Count Information to Guild Model**:

   ```typescript
   // Update guild model or schema
   async function updateGuildRankInfo(guildId: number, rosterData: any) {
     // Count members by rank
     const rankCounts = {};
     rosterData.members.forEach(member => {
       const rankId = member.rank;
       rankCounts[rankId] = (rankCounts[rankId] || 0) + 1;
     });
     
     // Store this information in guild_data
     await guildModel.update(guildId, {
       guild_data: {
         ...guild.guild_data,
         rank_counts: rankCounts
       }
     });
   }
   ```

3. **Enhance Guild Rank Management Interface**:

   ```typescript
   // New endpoint in guild.controller.ts
   async function getGuildRankStructure(req: Request, res: Response) {
     const { guildId } = req.params;
     
     try {
       const guild = await guildModel.findById(parseInt(guildId));
       const ranks = await rankModel.getGuildRanks(parseInt(guildId));
       
       // Enhance with member counts from guild_data
       const rankCounts = guild.guild_data?.rank_counts || {};
       
       const enhancedRanks = ranks.map(rank => ({
         ...rank,
         member_count: rankCounts[rank.rank_id] || 0
       }));
       
       res.json({
         success: true,
         data: enhancedRanks
       });
     } catch (error) {
       // Error handling
     }
   }
   ```

### 3. Character-Guild Association Improvement

#### Objectives

- Properly assign and maintain guild_id for characters
- Improve character synchronization with guild data
- Enhance guild roster management

#### Implementation Steps

1. **Update Character Sync Process to Include Guild Information**:

   ```typescript
   // In character.model.ts or characterController.ts
   async function syncCharactersFromBattleNet(userId: number, wowAccounts: any[]) {
     // Existing code for character synchronization
     
     for (const account of wowAccounts) {
       for (const character of account.characters || []) {
         // Additional code to handle guild association
         let guildId = null;
         
         if (character.guild) {
           // Check if guild exists in our database
           const guild = await guildModel.findByNameRealmRegion(
             character.guild.name,
             character.guild.realm.slug,
             region
           );
           
           if (guild) {
             guildId = guild.id;
           } else {
             // Optionally fetch and create the guild
             // This could be a background task to avoid slowing down character sync
           }
         }
         
         // Include guild_id in character data
         const characterData = {
           // Existing character fields
           guild_id: guildId,
           // Other fields
         };
         
         // Update or create character with guild association
       }
     }
   }
   ```

2. **Create a Guild Roster Synchronization Service**:

   ```typescript
   // New file: src/services/guild-roster.service.ts
   export const synchronizeGuildRoster = async (guildId: number, accessToken: string) => {
     const guild = await guildModel.findById(guildId);
     if (!guild) throw new Error('Guild not found');
     
     // Fetch roster from Battle.net
     const rosterData = await battleNetService.getGuildMembers(
       guild.region,
       guild.realm,
       guild.name,
       accessToken
     );
     
     // Update each character in our database with correct guild_id
     for (const member of rosterData.members) {
       const character = await characterModel.findByNameRealm(
         member.character.name,
         member.character.realm.slug
       );
       
       if (character) {
         // Update guild association
         await characterModel.update(character.id, {
           guild_id: guildId,
           // Update rank information as well
           guild_rank: member.rank
         });
       }
     }
     
     // Update guild's last_updated timestamp
     await guildModel.update(guildId, {
       last_updated: new Date().toISOString()
     });
     
     return rosterData;
   };
   ```

3. **Add API Endpoint for Guild Roster Management**:

   ```typescript
   // In guild.controller.ts
   async function syncGuildCharacters(req: Request, res: Response) {
     const { guildId } = req.params;
     const userId = req.user.id;
     
     try {
       // Verify user has permission (guild member or leader)
       // Get user tokens
       const user = await userModel.getUserWithTokens(userId);
       
       // Sync roster
       const result = await synchronizeGuildRoster(
         parseInt(guildId),
         user.access_token
       );
       
       res.json({
         success: true,
         data: {
           message: 'Guild roster synchronized successfully',
           members_updated: result.members.length
         }
       });
     } catch (error) {
       // Error handling
     }
   }
   ```

## Database Schema Updates

Add the following fields to the existing schema:

```sql
-- Characters table - Add guild_rank if not present
ALTER TABLE characters ADD COLUMN IF NOT EXISTS guild_rank INTEGER;

-- Guild_ranks table - Add member_count field for caching
ALTER TABLE guild_ranks ADD COLUMN IF NOT EXISTS member_count INTEGER DEFAULT 0;

-- Guilds table - Ensure we have last_roster_sync field
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS last_roster_sync TIMESTAMP;
```

## Implementation Roadmap

### Phase 1: Database and Model Updates (2 weeks)

- Update database schema
- Enhance models with new fields
- Create migration scripts

### Phase 2: Service Implementation (3 weeks)

- Implement leadership verification service
- Build guild roster synchronization service  
- Create rank management services

### Phase 3: API and Controller Updates (2 weeks)

- Update existing endpoints
- Add new endpoints for enhanced functionality
- Implement middleware improvements

### Phase 4: Frontend Integration (3 weeks)

- Update UI components for guild management
- Enhance character management with guild information
- Build improved rank management interface

### Phase 5: Testing and Deployment (2 weeks)

- Develop comprehensive tests
- Perform migration testing
- Deploy to production with monitoring

## Performance Considerations

- Implement caching strategies to minimize Battle.net API calls
- Add background synchronization jobs for non-critical updates
- Use batch processing for roster synchronization

## Conclusion

This enhancement plan addresses the core issues with guild relationship management in the WoW Guild Manager. By properly valorizing the leader_id field, improving guild rank management, and enhancing character-guild associations, the application will be more efficient, reliable, and provide a better user experience for guild management.
