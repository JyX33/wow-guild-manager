# WoW Guild Manager Enhancement Plan

Based on the provided code and Battle.net API documentation, here's a detailed plan to implement the requested features for the WoW Guild Manager application.

## Overview of New Features

1. List all guilds the user is in
2. Identify if the user is a guild master (rank 0)
3. Restrict guild management to guild masters
4. Display enhanced character details (level, gear, mythic+, class, spec, professions)
5. Allow guild masters to edit rank names

## Implementation Plan

### 1. Guild Membership Tracking

#### Backend Changes

```typescript
// 1. Add new endpoint in guild.routes.ts
router.get('/user', authMiddleware.authenticate, guildController.getUserGuilds);

// 2. Add controller method in guild.controller.ts
async getUserGuilds(req: Request, res: Response) {
  try {
    const userId = req.user.id;
    
    // Get all user's characters
    const characters = await characterModel.findByUserId(userId);
    
    // Get user access token for Battle.net API
    const user = await userModel.getUserWithTokens(userId);
    
    if (!user || !user.access_token) {
      throw new AppError('Authentication token not found', 401);
    }
    
    // Get user's Battle.net profile
    const profile = await battleNetService.getWowProfile(
      user.region || 'eu', 
      user.access_token
    );
    
    const guilds = [];
    const processedGuilds = new Set();
    
    // For each character from Battle.net profile
    for (const account of profile.wow_accounts || []) {
      for (const character of account.characters || []) {
        // Skip characters not in a guild
        if (!character.guild) continue;
        
        const guildKey = `${character.guild.realm.slug}-${character.guild.name}`;
        
        // Skip if we've already processed this guild
        if (processedGuilds.has(guildKey)) continue;
        processedGuilds.add(guildKey);
        
        // Get detailed guild info
        try {
          const guildInfo = await battleNetService.getGuildData(
            character.realm.slug,
            character.guild.name,
            user.access_token
          );
          
          // Get guild roster to determine if user is GM
          const roster = await battleNetService.getGuildRoster(
            character.realm.slug,
            character.guild.name,
            user.access_token
          );
          
          // Find if any of user's characters is guild master
          const isGuildMaster = roster.members.some(member => 
            characters.some(char => 
              char.name.toLowerCase() === member.character.name.toLowerCase() && 
              member.rank === 0 // Rank 0 is guild master
            )
          );
          
          // Store guild data
          guilds.push({
            ...guildInfo,
            is_guild_master: isGuildMaster
          });
        } catch (error) {
          console.error(`Error fetching guild data for ${character.guild.name}:`, error);
        }
      }
    }
    
    res.json({
      success: true,
      data: guilds
    });
  } catch (error) {
    // Error handling
    console.error('Get user guilds error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get user guilds',
        status: 500
      }
    });
  }
}

// 3. Add method in battlenet.service.ts
async getGuildData(realm: string, guildName: string, accessToken: string) {
  try {
    const regionConfig = config.battlenet.regions[region] || config.battlenet.regions.eu;
    
    const response = await axios.get(
      `${regionConfig.apiBaseUrl}/data/wow/guild/${encodeURIComponent(realm)}/${encodeURIComponent(guildName)}`,
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
    throw new AppError(
      `Failed to fetch guild data: ${error.response?.data?.detail || error.message}`,
      error.response?.status || 500
    );
  }
}
```

#### Frontend Changes

```typescript
// 1. Add method to guild.service.ts
getUserGuilds: () =>
  apiRequest<Guild[]>({
    method: 'GET',
    url: '/guilds/user'
  })

// 2. Create UserGuilds.tsx component
import React from 'react';
import { useApi } from '../hooks/useApi';
import { guildService } from '../services/api';
import { Guild } from '../../../shared/types';
import LoadingSpinner from './LoadingSpinner';

export const UserGuilds: React.FC = () => {
  const { data: guilds, loading, error } = useApi<Guild[]>({
    apiFn: guildService.getUserGuilds,
    immediate: true
  });
  
  if (loading) return <LoadingSpinner />;
  
  if (error) {
    return <div className="text-red-500">Error loading guilds: {error.message}</div>;
  }
  
  if (!guilds || guilds.length === 0) {
    return <div className="text-center p-4">You are not a member of any guild.</div>;
  }
  
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">My Guilds</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {guilds.map(guild => (
          <div key={`${guild.realm.slug}-${guild.name}`} className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              {guild.crest && (
                <div className="mr-3">
                  {/* Guild crest can be rendered here */}
                </div>
              )}
              <div>
                <h3 className="font-medium">{guild.name}</h3>
                <p className="text-sm text-gray-600">
                  {guild.realm.name.en_US} • {guild.member_count} members
                </p>
              </div>
            </div>
            
            {guild.is_guild_master && (
              <div className="mt-2 text-xs font-medium text-green-600 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Guild Master
              </div>
            )}
            
            <div className="mt-3 flex">
              <a 
                href={`/guild/${guild.id}`} 
                className="flex-1 text-center text-sm bg-blue-50 text-blue-600 p-2 rounded hover:bg-blue-100"
              >
                View
              </a>
              
              {guild.is_guild_master && (
                <a 
                  href={`/guild/${guild.id}/manage`} 
                  className="flex-1 ml-2 text-center text-sm bg-green-50 text-green-600 p-2 rounded hover:bg-green-100"
                >
                  Manage
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// 3. Add to Dashboard.tsx
import { UserGuilds } from '../components/UserGuilds';

// Then in the render function
<div className="mt-8">
  <UserGuilds />
</div>
```

### 2. Guild Master Authorization Middleware

```typescript
// Create middleware/guild-master.middleware.ts
import { Request, Response, NextFunction } from 'express';
import guildModel from '../models/guild.model';
import characterModel from '../models/character.model';
import battleNetService from '../services/battlenet.service';
import userModel from '../models/user.model';
import { AppError } from '../utils/error-handler';

/**
 * Middleware to check if the authenticated user is a guild master
 */
export const isGuildMaster = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const guildId = parseInt(req.params.guildId);
    const userId = req.user.id;
    
    // Get the guild from database
    const guild = await guildModel.findById(guildId);
    if (!guild) {
      throw new AppError('Guild not found', 404);
    }
    
    // Get user's characters
    const characters = await characterModel.findByUserId(userId);
    
    // Get user access token
    const user = await userModel.getUserWithTokens(userId);
    
    if (!user || !user.access_token) {
      throw new AppError('Authentication token not found', 401);
    }
    
    // Get guild roster from Battle.net
    const guildRoster = await battleNetService.getGuildRoster(
      guild.realm,
      guild.name,
      user.access_token
    );
    
    // Check if any of the user's characters is rank 0 (guild master)
    const isGM = guildRoster.members.some(member => 
      characters.some(char => 
        char.name.toLowerCase() === member.character.name.toLowerCase() && 
        member.rank === 0
      )
    );
    
    if (!isGM) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'You must be the guild master to perform this action',
          status: 403
        }
      });
    }
    
    // User is guild master, proceed
    next();
  } catch (error) {
    next(error);
  }
};

// Apply middleware to guild management routes in guild.routes.ts
import { isGuildMaster } from '../middleware/guild-master.middleware';

// Protected routes
router.put('/:guildId/settings', 
  authMiddleware.authenticate, 
  isGuildMaster,
  guildController.updateGuildSettings
);
```

### 3. Enhanced Character Details

```typescript
// 1. Add to battlenet.service.ts
/**
 * Get enhanced character data including item level, mythic keys, class/spec, and professions
 */
async getEnhancedCharacterData(realm: string, characterName: string, accessToken: string) {
  try {
    // Get basic character profile
    const characterProfile = await this.getCharacterProfile(realm, characterName, accessToken);
    
    // Get equipment data for item level
    const equipmentData = await axios.get(
      `${regionConfig.apiBaseUrl}/profile/wow/character/${encodeURIComponent(realm)}/${encodeURIComponent(characterName)}/equipment`,
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
    
    // Get mythic keystone profile
    const mythicData = await axios.get(
      `${regionConfig.apiBaseUrl}/profile/wow/character/${encodeURIComponent(realm)}/${encodeURIComponent(characterName)}/mythic-keystone-profile`,
      {
        params: {
          namespace: `profile-${region}`,
          locale: 'en_US'
        },
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    ).catch(() => ({ data: null })); // Not all characters have M+ data
    
    // Get character professions
    const professionsData = await axios.get(
      `${regionConfig.apiBaseUrl}/profile/wow/character/${encodeURIComponent(realm)}/${encodeURIComponent(characterName)}/professions`,
      {
        params: {
          namespace: `profile-${region}`,
          locale: 'en_US'
        },
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    ).catch(() => ({ data: { primaries: [] } }));
    
    // Return combined enhanced data
    return {
      ...characterProfile,
      equipment: equipmentData.data,
      itemLevel: characterProfile.equipped_item_level,
      mythicKeystone: mythicData?.data,
      activeSpec: characterProfile.active_spec,
      professions: professionsData.data.primaries || []
    };
  } catch (error) {
    console.error('Error fetching enhanced character data:', error);
    throw error;
  }
}

// 2. Add to guild.controller.ts
async getEnhancedGuildMembers(req: Request, res: Response) {
  try {
    const { guildId } = req.params;
    
    // Get guild from database
    const guild = await guildModel.findById(parseInt(guildId));
    
    if (!guild) {
      throw new AppError('Guild not found', 404);
    }
    
    // Get user access token
    const user = await userModel.getUserWithTokens(req.user.id);
    
    if (!user || !user.access_token) {
      throw new AppError('Authentication token not found', 401);
    }
    
    // Get guild roster first
    const guildRoster = await battleNetService.getGuildRoster(
      guild.realm,
      guild.name,
      user.access_token
    );
    
    // Get enhanced data for members (limit to 20 for performance reasons)
    // In production, you'd want to batch/paginate this
    const membersToEnhance = guildRoster.members.slice(0, 20);
    
    const enhancedMembers = await Promise.all(
      membersToEnhance.map(async (member) => {
        try {
          const enhancedData = await battleNetService.getEnhancedCharacterData(
            member.character.realm.slug,
            member.character.name,
            user.access_token
          );
          
          return {
            ...member,
            character: {
              ...member.character,
              ...enhancedData
            }
          };
        } catch (error) {
          console.warn(`Could not fetch enhanced data for ${member.character.name}:`, error);
          return member;
        }
      })
    );
    
    res.json({
      success: true,
      data: enhancedMembers
    });
  } catch (error) {
    // Error handling
  }
}

// 3. Add route in guild.routes.ts
router.get('/:guildId/members/enhanced', 
  authMiddleware.authenticate, 
  guildController.getEnhancedGuildMembers
);
```

### 4. Guild Rank Management

#### Database Changes

```sql
-- Create table to store custom rank names
CREATE TABLE guild_ranks (
  id SERIAL PRIMARY KEY,
  guild_id INTEGER REFERENCES guilds(id) NOT NULL,
  rank_id INTEGER NOT NULL,
  rank_name VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(guild_id, rank_id)
);
```

#### Backend Implementation

```typescript
// 1. Create rank.model.ts
import BaseModel from '../db/BaseModel';
import { AppError } from '../utils/error-handler';

interface GuildRank {
  id: number;
  guild_id: number;
  rank_id: number;
  rank_name: string;
  created_at?: string;
  updated_at?: string;
}

class RankModel extends BaseModel<GuildRank> {
  constructor() {
    super('guild_ranks');
  }

  async getGuildRanks(guildId: number): Promise<GuildRank[]> {
    try {
      return this.findAll({ guild_id: guildId });
    } catch (error) {
      throw new AppError(`Error getting guild ranks: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }

  async setGuildRank(guildId: number, rankId: number, rankName: string): Promise<GuildRank> {
    try {
      // Check if rank exists
      const existingRank = await this.findOne({ guild_id: guildId, rank_id: rankId });
      
      if (existingRank) {
        // Update existing rank
        return this.update(existingRank.id, { 
          rank_name: rankName,
          updated_at: new Date().toISOString()
        });
      } else {
        // Create new rank
        return this.create({
          guild_id: guildId,
          rank_id: rankId,
          rank_name: rankName
        });
      }
    } catch (error) {
      throw new AppError(`Error setting guild rank: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
}

export default new RankModel();

// 2. Add to guild.controller.ts
import rankModel from '../models/rank.model';

// Get guild ranks (combines default with custom)
async getGuildRanks(req: Request, res: Response) {
  try {
    const { guildId } = req.params;
    
    // Get guild
    const guild = await guildModel.findById(parseInt(guildId));
    
    if (!guild) {
      throw new AppError('Guild not found', 404);
    }
    
    // Get custom rank names from database
    const customRanks = await rankModel.getGuildRanks(parseInt(guildId));
    
    // Get user access token
    const user = await userModel.getUserWithTokens(req.user.id);
    
    if (!user || !user.access_token) {
      throw new AppError('Authentication token not found', 401);
    }
    
    // Get guild roster from Battle.net to get default rank structure
    const guildRoster = await battleNetService.getGuildRoster(
      guild.realm,
      guild.name,
      user.access_token
    );
    
    // Create a unified rank list with custom names where available
    const rankMap = new Map();
    
    // First get the unique ranks from the roster
    const uniqueRanks = new Set(guildRoster.members.map(member => member.rank));
    uniqueRanks.forEach(rankId => {
      rankMap.set(rankId, {
        rank_id: rankId,
        rank_name: rankId === 0 ? "Guild Master" : `Rank ${rankId}`, // Default names
        is_custom: false
      });
    });
    
    // Override with custom names
    customRanks.forEach(rank => {
      rankMap.set(rank.rank_id, {
        ...rank,
        is_custom: true
      });
    });
    
    // Convert map to array and sort by rank_id
    const ranks = Array.from(rankMap.values()).sort((a, b) => a.rank_id - b.rank_id);
    
    res.json({
      success: true,
      data: ranks
    });
  } catch (error) {
    handleError(error, res);
  }
}

// Update rank name
async updateRankName(req: Request, res: Response) {
  try {
    const { guildId, rankId } = req.params;
    const { rank_name } = req.body;
    
    if (!rank_name || typeof rank_name !== 'string') {
      throw new AppError('Rank name is required', 400);
    }
    
    // Validate rank name length
    if (rank_name.length > 50) {
      throw new AppError('Rank name cannot exceed 50 characters', 400);
    }
    
    // Get guild
    const guild = await guildModel.findById(parseInt(guildId));
    
    if (!guild) {
      throw new AppError('Guild not found', 404);
    }
    
    // Update or create rank
    const updatedRank = await rankModel.setGuildRank(
      parseInt(guildId),
      parseInt(rankId),
      rank_name
    );
    
    res.json({
      success: true,
      data: updatedRank
    });
  } catch (error) {
    handleError(error, res);
  }
}

// 3. Add routes in guild.routes.ts
router.get('/:guildId/ranks', 
  authMiddleware.authenticate, 
  guildController.getGuildRanks
);

router.put('/:guildId/ranks/:rankId', 
  authMiddleware.authenticate, 
  isGuildMaster, // Only guild masters can update ranks
  guildController.updateRankName
);
```

### 5. Frontend Components

#### Enhanced Guild Members List

```tsx
// Create EnhancedGuildMembersList.tsx
import React, { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { guildService } from '../services/api';
import LoadingSpinner from './LoadingSpinner';

export const EnhancedGuildMembersList: React.FC<{ guildId: number }> = ({ guildId }) => {
  const [sortField, setSortField] = useState<string>('rank');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Get enhanced guild members
  const { data: members, loading, error } = useApi({
    apiFn: guildService.getEnhancedGuildMembers,
    args: [guildId],
    deps: [guildId]
  });
  
  // Get guild ranks for displaying rank names
  const { data: ranks } = useApi({
    apiFn: guildService.getGuildRanks,
    args: [guildId],
    deps: [guildId]
  });
  
  if (loading) return <LoadingSpinner />;
  
  if (error) {
    return <div className="text-red-500">Error loading guild members: {error.message}</div>;
  }
  
  if (!members || members.length === 0) {
    return <div className="text-center p-4">No members found in this guild.</div>;
  }
  
  // Sort members
  const sortedMembers = [...members].sort((a, b) => {
    let valueA, valueB;
    
    switch (sortField) {
      case 'name':
        valueA = a.character.name.toLowerCase();
        valueB = b.character.name.toLowerCase();
        break;
      case 'level':
        valueA = a.character.level || 0;
        valueB = b.character.level || 0;
        break;
      case 'itemLevel':
        valueA = a.character.itemLevel || 0;
        valueB = b.character.itemLevel || 0;
        break;
      case 'rank':
        valueA = a.rank;
        valueB = b.rank;
        break;
      default:
        valueA = a.character.name.toLowerCase();
        valueB = b.character.name.toLowerCase();
    }
    
    if (valueA === valueB) return 0;
    
    const comparison = valueA > valueB ? 1 : -1;
    return sortDirection === 'asc' ? comparison : -comparison;
  });
  
  // Handle sort column click
  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  // Function to get rank name
  const getRankName = (rankId: number) => {
    const rank = ranks?.find(r => r.rank_id === rankId);
    return rank ? rank.rank_name : (rankId === 0 ? 'Guild Master' : `Rank ${rankId}`);
  };
  
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              onClick={() => handleSort('name')}
            >
              Name
              {sortField === 'name' && (
                <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
              )}
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              onClick={() => handleSort('level')}
            >
              Level
              {sortField === 'level' && (
                <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
              )}
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              onClick={() => handleSort('itemLevel')}
            >
              Item Level
              {sortField === 'itemLevel' && (
                <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
              )}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Class/Spec
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              M+ This Week
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Professions
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              onClick={() => handleSort('rank')}
            >
              Rank
              {sortField === 'rank' && (
                <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
              )}
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedMembers.map((member) => (
            <tr key={member.character.id}>
              <td className="px-6 py-4 whitespace-nowrap">
                {member.character.name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {member.character.level}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {member.character.itemLevel || '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {member.character.playable_class?.name?.en_US}
                {member.character.activeSpec && (
                  <span className="ml-1 text-xs text-gray-500">
                    ({member.character.activeSpec.name.en_US})
                  </span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {member.character.mythicKeystone?.weeklyRuns?.length || 0}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {member.character.professions?.map(prof => (
                  <div key={prof.profession.id} className="text-sm">
                    {prof.profession.name}
                    {prof.skill_points && (
                      <span className="ml-1 text-xs text-gray-500">
                        ({prof.skill_points}/{prof.max_skill_points || '?'})
                      </span>
                    )}
                  </div>
                ))}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {getRankName(member.rank)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

#### Guild Rank Management Component

```tsx
// Create GuildRankManager.tsx
import React, { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { guildService } from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import FormStatus from './FormStatus';

export const GuildRankManager: React.FC<{ guildId: number }> = ({ guildId }) => {
  const [editingRank, setEditingRank] = useState<number | null>(null);
  const [rankName, setRankName] = useState<string>('');
  const [updateLoading, setUpdateLoading] = useState<boolean>(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<boolean>(false);
  
  const { 
    data: ranks, 
    loading, 
    error,
    refresh: refreshRanks
  } = useApi({
    apiFn: guildService.getGuildRanks,
    args: [guildId],
    deps: [guildId]
  });
  
  if (loading) return <LoadingSpinner />;
  
  if (error) {
    return <div className="text-red-500">Error loading guild ranks: {error.message}</div>;
  }
  
  if (!ranks || ranks.length === 0) {
    return <div className="text-center p-4">No rank information available</div>;
  }
  
  const handleEditClick = (rank) => {
    setEditingRank(rank.rank_id);
    setRankName(rank.rank_name);
    setUpdateSuccess(false);
    setUpdateError(null);
  };
  
  const handleCancelEdit = () => {
    setEditingRank(null);
    setRankName('');
    setUpdateError(null);
  };
  
  const handleSaveRankName = async (rankId) => {
    if (!rankName.trim()) {
      setUpdateError('Rank name cannot be empty');
      return;
    }
    
    setUpdateLoading(true);
    setUpdateError(null);
    
    try {
      const response = await guildService.updateRankName(guildId, rankId, rankName);
      
      if (response.success) {
        setUpdateSuccess(true);
        setEditingRank(null);
        refreshRanks();
      } else {
        setUpdateError(response.error?.message || 'Failed to update rank name');
      }
    } catch (err) {
      setUpdateError('An unexpected error occurred');
    } finally {
      setUpdateLoading(false);
    }
  };
  
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Guild Ranks</h2>
      
      <FormStatus 
        loading={updateLoading}
        error={updateError}
        success={updateSuccess}
        successMessage="Rank name updated successfully"
      />
      
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Rank
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {ranks.map((rank) => (
            <tr key={rank.rank_id}>
              <td className="px-6 py-4 whitespace-nowrap">
                {rank.rank_id === 0 ? 
                  <span className="font-medium text-green-600">Guild Master</span> : 
                  `Rank ${rank.rank_id}`
                }
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {editingRank === rank.rank_id ? (
                  <input 
                    type="text"
                    value={rankName}
                    onChange={(e) => setRankName(e.target.value)}
                    className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                    maxLength={50}
                  />
                ) : (
                  <div>
                    {rank.rank_name}
                    {rank.is_custom && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Custom
                      </span>
                    )}
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right">
                {editingRank === rank.rank_id ? (
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => handleSaveRankName(rank.rank_id)}
                      disabled={updateLoading}
                      className="text-green-600 hover:text-green-900"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={updateLoading}
                      className="text-red-600 hover:text-red-900"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleEditClick(rank)}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    Edit
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

#### Guild Management Page

```tsx
// Create GuildManagePage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { guildService } from '../services/api';
import { GuildRankManager } from '../components/GuildRankManager';
import LoadingSpinner from '../components/LoadingSpinner';

const GuildManagePage: React.FC = () => {
  const { guildId } = useParams<{ guildId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [guild, setGuild] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isGuildMaster, setIsGuildMaster] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  
  useEffect(() => {
    const fetchGuildData = async () => {
      try {
        if (!guildId) return;
        
        // Fetch guild data
        const guildResponse = await guildService.getGuildById(parseInt(guildId));
        
        if (guildResponse.success && guildResponse.data) {
          setGuild(guildResponse.data);
          
          // Check if user is guild master of this guild
          const userGuildsResponse = await guildService.getUserGuilds();
          if (userGuildsResponse.success && userGuildsResponse.data) {
            const matchingGuild = userGuildsResponse.data.find(g => g.id === parseInt(guildId));
            setIsGuildMaster(matchingGuild?.is_guild_master || false);
          }
        }
      } catch (error) {
        console.error('Failed to fetch guild data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGuildData();
  }, [guildId, user?.id]);
  
  // Redirect if not guild master
  useEffect(() => {
    if (!loading && !isGuildMaster) {
      navigate(`/guild/${guildId}`);
    }
  }, [loading, isGuildMaster, navigate, guildId]);
  
  if (loading) {
    return <LoadingSpinner size="lg" message="Loading Guild..." />;
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-4">
        <button
          className="text-blue-600 hover:text-blue-800"
          onClick={() => navigate(`/guild/${guildId}`)}
        >
          &larr; Back to Guild
        </button>
      </div>
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Manage: {guild?.name}</h1>
        <p className="text-gray-600">{guild?.realm} ({guild?.region?.toUpperCase()})</p>
      </div>
      
      <div className="mb-6">
        <div className="flex border-b">
          <button
            className={`px-4 py-2 mr-2 ${activeTab === 'general' ? 'border-b-2 border-blue-500 font-medium' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            General Settings
          </button>
          <button
            className={`px-4 py-2 ${activeTab === 'ranks' ? 'border-b-2 border-blue-500 font-medium' : ''}`}
            onClick={() => setActiveTab('ranks')}
          >
            Rank Management
          </button>
        </div>
      </div>
      
      {activeTab === 'general' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">General Settings</h2>
          <p className="text-gray-600">Guild settings management options will appear here.</p>
        </div>
      )}
   
{activeTab === 'ranks' && (
  <div className="bg-white rounded-lg shadow-md p-6">
    <GuildRankManager guildId={parseInt(guildId || '0')} />
  </div>
)}
```

Now I'll finish with the GuildPage updates and additional API services needed:

### 6. Update GuildPage Component

```tsx
// Update GuildPage.tsx to include enhanced members list and management link
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { guildService, eventService } from '../services/api';
import EventCalendar from '../components/EventCalendar';
import { EnhancedGuildMembersList } from '../components/EnhancedGuildMembersList';
import LoadingSpinner from '../components/LoadingSpinner';

const GuildPage: React.FC = () => {
  const { guildId } = useParams<{ guildId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [guild, setGuild] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isGuildMaster, setIsGuildMaster] = useState(false);
  const [activeTab, setActiveTab] = useState<'calendar' | 'members'>('calendar');
  // Add a key to force refresh the calendar component when needed
  const [calendarKey, setCalendarKey] = useState(Date.now());

  useEffect(() => {
    // Force refresh of calendar when navigating back to this page
    setCalendarKey(Date.now());
  }, [location.key]);

  useEffect(() => {
    const fetchGuildData = async () => {
      try {
        if (!guildId) return;
        
        // Fetch guild data
        const guildResponse = await guildService.getGuildById(parseInt(guildId));
        setGuild(guildResponse.data);
        
        // Check if user is guild master of this guild
        const userGuildsResponse = await guildService.getUserGuilds();
        if (userGuildsResponse.success && userGuildsResponse.data) {
          const matchingGuild = userGuildsResponse.data.find(g => g.id === parseInt(guildId));
          setIsGuildMaster(matchingGuild?.is_guild_master || false);
        }
      } catch (error) {
        console.error('Failed to fetch guild data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGuildData();
  }, [guildId, user?.id]);

  const handleEventSelect = (event: any) => {
    navigate(`/event/${event.id}`);
  };

  const handleSlotSelect = (slotInfo: { start: Date; end: Date }) => {
    if (!guildId) return;
    
    // Format dates for the form
    const startStr = slotInfo.start.toISOString().slice(0, 16);
    const endStr = slotInfo.end.toISOString().slice(0, 16);
    
    navigate(`/guild/${guildId}/event/create`, { 
      state: { startTime: startStr, endTime: endStr }
    });
  };

  const handleCreateEvent = () => {
    if (!guildId) return;
    navigate(`/guild/${guildId}/event/create`);
  };

  const handleManageGuild = () => {
    if (!guildId) return;
    navigate(`/guild/${guildId}/manage`);
  };

  if (loading) {
    return <LoadingSpinner size="lg" message="Loading Guild..." />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">{guild?.name}</h1>
          <p className="text-gray-600">{guild?.realm} ({guild?.region.toUpperCase()})</p>
        </div>
        
        {isGuildMaster && (
          <button
            onClick={handleManageGuild}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Manage Guild
          </button>
        )}
      </div>
      
      <div className="mb-6">
        <div className="flex border-b">
          <button
            className={`px-4 py-2 mr-2 ${activeTab === 'calendar' ? 'border-b-2 border-blue-500 font-medium' : ''}`}
            onClick={() => setActiveTab('calendar')}
          >
            Event Calendar
          </button>
          <button
            className={`px-4 py-2 ${activeTab === 'members' ? 'border-b-2 border-blue-500 font-medium' : ''}`}
            onClick={() => setActiveTab('members')}
          >
            Guild Members
          </button>
        </div>
      </div>
      
      {activeTab === 'calendar' && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              onClick={handleCreateEvent}
            >
              Create Event
            </button>
          </div>
          
          <EventCalendar 
            key={calendarKey}
            guildId={parseInt(guildId || '0')}
            onSelectEvent={handleEventSelect}
            onSelectSlot={handleSlotSelect}
          />
        </div>
      )}
      
      {activeTab === 'members' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <EnhancedGuildMembersList guildId={parseInt(guildId || '0')} />
        </div>
      )}
    </div>
  );
};

export default GuildPage;
```

### 7. Update API Service Types and Methods

```typescript
// Update guild.service.ts with new methods
export const guildService = {
  // Existing methods...

  /**
   * Get all guilds that the user is a member of
   */
  getUserGuilds: () =>
    apiRequest<Guild[]>({
      method: 'GET',
      url: '/guilds/user'
    }),

  /**
   * Get enhanced guild members with detailed information
   */
  getEnhancedGuildMembers: (guildId: number) =>
    apiRequest<EnhancedGuildMember[]>({
      method: 'GET',
      url: `/guilds/${guildId}/members/enhanced`
    }),

  /**
   * Get guild ranks (both default and custom)
   */
  getGuildRanks: (guildId: number) =>
    apiRequest<GuildRank[]>({
      method: 'GET',
      url: `/guilds/${guildId}/ranks`
    }),

  /**
   * Update a guild rank name
   */
  updateRankName: (guildId: number, rankId: number, rankName: string) =>
    apiRequest<GuildRank>({
      method: 'PUT',
      url: `/guilds/${guildId}/ranks/${rankId}`,
      data: { rank_name: rankName }
    }),
};
```

### 8. Update Shared Type Definitions

```typescript
// Add to shared/types/guild.ts

export interface EnhancedGuildMember extends GuildMember {
  character: Character & {
    itemLevel?: number;
    mythicKeystone?: {
      weeklyRuns?: Array<any>;
    };
    activeSpec?: {
      key: any;
      name: any;
      id: number;
    };
    professions?: Array<{
      profession: {
        id: number;
        name: string;
      };
      skill_points?: number;
      max_skill_points?: number;
    }>;
  };
}

export interface GuildRank {
  id?: number;
  guild_id?: number;
  rank_id: number;
  rank_name: string;
  is_custom?: boolean;
  created_at?: string;
  updated_at?: string;
}

// Update Guild interface to include guild master flag
export interface Guild {
  id: number;
  name: string;
  realm: string;
  region: string;
  last_updated?: string;
  guild_data?: any;
  is_guild_master?: boolean;
}
```

### 9. Create Routes for the Guild Management Page

```typescript
// Add to App.tsx routes
<Route path="/guild/:guildId/manage" element={
  <AuthProtect>
    <GuildManagePage />
  </AuthProtect>
} />
```

This completes the implementation plan for all requested features. The code now provides:

1. A list of all guilds the user is a member of through the UserGuilds component
2. Identification of guild masters (rank 0) in each guild
3. Guild management restricted to guild masters via the isGuildMaster middleware
4. Enhanced character details (level, gear, mythic+, class, specs, professions)
5. Guild rank name editing for guild masters

The implementation follows the existing architecture patterns and integrates seamlessly with the current codebase while adding the new functionalities in a modular way.
