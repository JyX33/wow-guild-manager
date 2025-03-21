import React, { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { guildService } from '../services/api/guild.service';
import { EnhancedGuildMember, GuildRank, LocalizedString } from '../../../shared/types/guild';
import LoadingSpinner from './LoadingSpinner';
import { ErrorBoundary } from './ErrorBoundary';

type SortField = 'name' | 'level' | 'itemLevel' | 'rank';
type SortDirection = 'asc' | 'desc';

interface Props {
  guildId: number;
}

// Helper functions
const getLocalizedText = (text: LocalizedString, locale: keyof LocalizedString = 'en_US'): string => {
  return text[locale] || text.en_US || '';
};

const getItemLevel = (member: EnhancedGuildMember): number => {
  return member.character?.character_data?.equipped_item_level ||
         member.character?.character_data?.average_item_level ||
         0;
};

const getCharacterLevel = (member: EnhancedGuildMember): number => {
  return member.character?.level || 0;
};

export const EnhancedGuildMembersList: React.FC<Props> = ({ guildId }) => {
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // Get enhanced guild members
  const { data: members, loading, error } = useApi<EnhancedGuildMember[], [number]>({
    apiFn: guildService.getEnhancedGuildMembers,
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
      default:
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
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedMembers.map((member) => (
              <tr key={member.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  {member.character?.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getCharacterLevel(member)}
                </td>
                <td className="px-6 py-4">
                  <div className="whitespace-nowrap">
                    {getItemLevel(member)}
                    {member.character?.character_data?.average_item_level !== 
                     member.character?.character_data?.equipped_item_level && 
                     member.character?.character_data?.average_item_level && (
                      <span className="ml-1 text-xs text-gray-500">
                        (Bags: {member.character.character_data.average_item_level})
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="whitespace-nowrap">
                    {member.character?.character_data?.active_spec ? (
                      <>
                        <span>{member.character?.class}</span>
                        <span className="ml-1 text-xs text-gray-500">
                          ({member.character?.character_data?.active_spec?.name?.en_US})
                        </span>
                      </>
                    ) : (
                      member.character?.class
                    )}
                  </div>
                  {member.character?.character_data?.covenant_progress && (
                    <div className="text-xs text-gray-500 mt-1">
                      {member.character?.character_data?.covenant_progress?.chosen_covenant?.name?.en_US}
                      ({member.character?.character_data?.covenant_progress?.renown_level})
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="whitespace-nowrap">
                    Runs this week: {member.character?.mythicKeystone?.current_period?.best_runs?.length || 0}
                  </div>
                  {member.character?.mythicKeystone?.current_period?.best_runs?.length > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      {member.character?.mythicKeystone?.current_period?.best_runs
                        .sort((a, b) => b.keystone_level - a.keystone_level)
                        .slice(0, 3)
                        .map((run, index) => (
                          <div key={index} className="mb-0.5">
                            +{run.keystone_level} {getLocalizedText(run.dungeon.name)}
                            {run.duration && (
                              <span className="ml-1">
                                ({Math.floor(run.duration / 60)}:{String(run.duration % 60).padStart(2, '0')})
                              </span>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  {member.character?.professions?.map(prof => (
                    <div key={prof.profession.id} className="text-sm">
                      {prof.profession.name.en_US}
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
    </ErrorBoundary>
  );
};