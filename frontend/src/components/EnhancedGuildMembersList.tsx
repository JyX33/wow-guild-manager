import React, { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { guildService } from '../services/api/guild.service';
// Import ClassifiedMember and remove EnhancedGuildMember if no longer needed directly
import { ClassifiedMember, GuildRank } from '../../../shared/types/guild';
import LoadingSpinner from './LoadingSpinner';
import { ErrorBoundary } from './ErrorBoundary';

// Add 'classification' as a sortable field
// Add 'classification' and adjust sorting logic if needed
type SortField = 'name' | 'level' | 'itemLevel' | 'rank' | 'classification';
type SortDirection = 'asc' | 'desc';

interface Props {
  guildId: number;
}

// Update function parameter type to ClassifiedMember
const getItemLevel = (member: ClassifiedMember): number => {
  // Access character data correctly
  return member.character?.profile_json?.equipped_item_level ||
         member.character?.profile_json?.average_item_level ||
         0;
};

// Update function parameter type to ClassifiedMember
const getCharacterLevel = (member: ClassifiedMember): number => {
  return member.character?.level || 0;
};

export const EnhancedGuildMembersList: React.FC<Props> = ({ guildId }) => {
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // Fetch classified guild members using the new service method
  const { data: members, loading, error } = useApi<ClassifiedMember[], [number]>({
    apiFn: guildService.getClassifiedGuildRoster, // Use the new service function
    args: [guildId],
    deps: [guildId]
  });
  
  // Get guild ranks for displaying rank names
  const { data: ranks } = useApi<GuildRank[]>({
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
    let result = 0;
    
    switch (sortField) {
      case 'name':
        result = a.character.name.toLowerCase().localeCompare(b.character.name.toLowerCase());
        break;
      case 'level':
        result = getCharacterLevel(a) - getCharacterLevel(b);
        break;
      case 'itemLevel':
        result = getItemLevel(a) - getItemLevel(b);
        break;
      case 'rank':
        result = a.rank - b.rank;
        break;
      case 'classification':
        // Sort Mains before Alts
        if (a.classification === 'Main' && b.classification === 'Alt') result = -1;
        else if (a.classification === 'Alt' && b.classification === 'Main') result = 1;
        else result = 0; // Keep original order if both are Main or both are Alt
        break;
      default: // Default sort by name if field is unknown
        result = a.character.name.toLowerCase().localeCompare(b.character.name.toLowerCase());
    }
    
    return sortDirection === 'asc' ? result : -result;
  });
  
  // Handle sort column click
  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  // Function to get rank name
  const getRankName = (rankId: number): string => {
    if (!ranks) return rankId === 0 ? 'Guild Master' : `Rank ${rankId}`;
    
    const rank = ranks.find(r => r.rank_id === rankId);
    return rank ? rank.rank_name : (rankId === 0 ? 'Guild Master' : `Rank ${rankId}`);
  };
  
  return (
    <ErrorBoundary>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('name')}
              >
                Name
                {sortField === 'name' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('level')}
              >
                Level
                {sortField === 'level' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
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
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('rank')}
              >
                Rank
                {sortField === 'rank' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              {/* Add Classification Header */}
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('classification')}
              >
                Status
                {sortField === 'classification' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedMembers.map((member) => (
              <tr key={member.character.id} className={`hover:bg-gray-50 ${member.classification === 'Alt' ? 'bg-gray-50' : ''}`}>
                <td className={`px-6 py-4 whitespace-nowrap ${member.classification === 'Alt' ? 'pl-10' : ''}`}>
                  <div className="flex items-center">
                    <span>{member.character?.name}</span>
                    {member.classification === 'Alt' && member.mainCharacterId && (
                      <span className="ml-2 text-xs text-blue-600 group relative cursor-help" title={`Alt of ${sortedMembers.find(m => m.character_id === member.mainCharacterId)?.character?.name || 'Unknown'}`}>
                        (Alt)
                        {/* Tooltip could be enhanced */}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getCharacterLevel(member)}
                </td>
                <td className="px-6 py-4">
                  <div className="whitespace-nowrap">
                    {getItemLevel(member)}
                    {member.character?.profile_json?.average_item_level !==
                     member.character?.profile_json?.equipped_item_level &&
                     member.character?.profile_json?.average_item_level && (
                      <span className="ml-1 text-xs text-gray-500">
                        (Bags: {member.character.profile_json.average_item_level})
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="whitespace-nowrap">
                    {member.character?.profile_json?.active_spec ? (
                      <>
                        <span>{member.character?.profile_json.character_class.name}</span>
                        <span className="ml-1 text-xs text-gray-500">
                          ({member.character.profile_json.active_spec.name})
                        </span>
                      </>
                    ) : (
                      member.character_class
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="whitespace-nowrap">
                    {/* Mythic data is now directly on character object from backend, not nested in profile_json */}
                    Runs this week: {member.character?.mythic_profile_json?.current_period?.best_runs?.length || 0}
                  </div>
                  {member.character?.mythic_profile_json?.current_period?.best_runs && member.character.mythic_profile_json.current_period.best_runs.length > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      rating : {Math.round(member.character.mythic_profile_json.current_mythic_rating?.rating || 0)}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  {/* Professions data is now directly on character object */}
                  {member.character?.professions_json?.map(prof => (
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
                {/* Add Classification Data Cell */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {member.classification}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ErrorBoundary>
  );
};