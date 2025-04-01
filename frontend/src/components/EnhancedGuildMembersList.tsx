import React, { useState, useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import { guildService } from '../services/api/guild.service';
import { ClassifiedMember, GuildRank } from '../../../shared/types/guild'; // Keep this
import LoadingSpinner from './LoadingSpinner'; // Keep this
import { ErrorBoundary } from './ErrorBoundary'; // Keep this
import { GuildMemberCard } from './GuildMemberCard'; // Import the new card component
import { Modal } from './Modal'; // Import the new Modal component

// Define sortable fields for the Card View (adjust as needed)
type SortField = 'name' | 'level' | 'itemLevel' | 'rank'; 
type SortDirection = 'asc' | 'desc';

interface Props {
  guildId: number;
  // Add user role/permissions prop if needed for admin actions later
  // userRole?: 'Guild Master' | 'Officer' | 'Member'; 
}

// Helper functions (can be moved or kept)
const getItemLevel = (member: ClassifiedMember): number => {
  return member.character?.profile_json?.equipped_item_level ||
         member.character?.profile_json?.average_item_level ||
         0;
};

const getCharacterLevel = (member: ClassifiedMember): number => {
  return member.character?.level || 0;
};

export const EnhancedGuildMembersList: React.FC<Props> = ({ guildId }) => {
  // --- State ---
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterName, setFilterName] = useState<string>('');
  const [filterClass, setFilterClass] = useState<string>(''); // State for class filter
  const [filterRank, setFilterRank] = useState<string>(''); // State for rank filter (using string for option value)

  const [isAltModalOpen, setIsAltModalOpen] = useState<boolean>(false);
  const [selectedMainForAlts, setSelectedMainForAlts] = useState<ClassifiedMember | null>(null);

  // --- Data Fetching ---
  const { data: allMembers, loading, error } = useApi<ClassifiedMember[], [number]>({
    apiFn: guildService.getClassifiedGuildRoster,
    args: [guildId],
    deps: [guildId]
  });

  const { data: ranks } = useApi<GuildRank[]>({
    apiFn: guildService.getGuildRanks,
    args: [guildId],
    deps: [guildId]
  });

  // --- Memoized Data Processing ---
  const mainMembers = useMemo(() => {
    if (!allMembers) return [];
    // Filter for Main characters first
    return allMembers.filter(member => member.classification === 'Main');
  }, [allMembers]);

  const filteredAndSortedMains = useMemo(() => {
    let filtered = mainMembers;

    // Apply Name Filter
    if (filterName) {
      filtered = filtered.filter(member => 
        member.character.name.toLowerCase().includes(filterName.toLowerCase())
      );
    }
    
    // Apply Class Filter
    if (filterClass) {
      filtered = filtered.filter(member =>
        (member.character?.profile_json?.character_class?.name || member.character?.class) === filterClass
      );
    }

    // Apply Rank Filter
    if (filterRank) {
      const rankId = parseInt(filterRank, 10);
      if (!isNaN(rankId)) {
        filtered = filtered.filter(member => member.rank === rankId);
      }
    }

    // Apply Sorting
    return [...filtered].sort((a, b) => {
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
  }, [mainMembers, filterName, filterClass, filterRank, sortField, sortDirection]); // Add new filters to dependency array

  const altsForSelectedMain = useMemo(() => {
    if (!selectedMainForAlts || !allMembers) return [];
    return allMembers.filter(member => 
      member.classification === 'Alt' && member.mainCharacterId === selectedMainForAlts.character_id
    );
  }, [selectedMainForAlts, allMembers]);

  // --- Handlers ---
  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleViewAlts = (mainMember: ClassifiedMember) => {
    setSelectedMainForAlts(mainMember);
    setIsAltModalOpen(true);
  };

  const handleCloseAltModal = () => {
    setIsAltModalOpen(false);
    setSelectedMainForAlts(null);
  };

  // Helper to get rank name (can be passed down or used here)
  const getRankName = (rankId: number): string => {
    if (!ranks) return rankId === 0 ? 'Guild Master' : `Rank ${rankId}`;
    const rank = ranks.find(r => r.rank_id === rankId);
    return rank ? rank.rank_name : (rankId === 0 ? 'Guild Master' : `Rank ${rankId}`);
  };

  // --- Render Logic ---
  if (loading && !allMembers) return <LoadingSpinner />; // Show spinner only on initial load

  if (error) {
    return <div className="text-red-500 p-4">Error loading guild members: {error.message}</div>;
  }

  if (!allMembers) {
     // Or handle case where allMembers is undefined after loading/error checks
     return <div className="text-center p-4">Could not load members.</div>;
  }
  
  if (allMembers.length === 0) {
    return <div className="text-center p-4">No members found in this guild.</div>;
  }

  return (
    <ErrorBoundary>
      <div className="p-4">
        {/* --- Controls --- */}
        <div className="mb-4 flex flex-wrap gap-4 items-center">
          {/* Name Filter */}
          <div>
            <label htmlFor="nameFilter" className="sr-only">Filter by Name</label>
            <input
              type="text"
              id="nameFilter"
              placeholder="Filter by Name..."
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              className="p-2 border rounded" // Add Tailwind classes
            />
          </div>
          {/* Sort Controls */}
          <div>
            <label htmlFor="sortField" className="mr-2">Sort by:</label>
            <select 
              id="sortField" 
              value={sortField} 
              onChange={(e) => handleSort(e.target.value as SortField)}
              className="p-2 border rounded mr-2" // Add Tailwind classes
            >
              <option value="rank">Rank</option>
              <option value="name">Name</option>
              <option value="level">Level</option>
              <option value="itemLevel">Item Level</option>
            </select>
            <button 
              onClick={() => handleSort(sortField)} 
              className="p-2 border rounded" // Add Tailwind classes
              aria-label={`Sort direction ${sortDirection === 'asc' ? 'ascending' : 'descending'}`}
            >
              {sortDirection === 'asc' ? '↑ Asc' : '↓ Desc'}
            </button>
          </div>
          {/* Class Filter */}
          <div>
            <label htmlFor="classFilter" className="sr-only">Filter by Class</label>
            <select
              id="classFilter"
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="p-2 border rounded" // Add Tailwind classes
            >
              <option value="">All Classes</option>
              {/* Statically define classes or derive from data if possible */}
              {['Death Knight', 'Demon Hunter', 'Druid', 'Evoker', 'Hunter', 'Mage', 'Monk', 'Paladin', 'Priest', 'Rogue', 'Shaman', 'Warlock', 'Warrior'].map(className => (
                <option key={className} value={className}>{className}</option>
              ))}
            </select>
          </div>
          {/* Rank Filter */}
          {ranks && ranks.length > 0 && (
            <div>
              <label htmlFor="rankFilter" className="sr-only">Filter by Rank</label>
              <select
                id="rankFilter"
                value={filterRank}
                onChange={(e) => setFilterRank(e.target.value)}
                className="p-2 border rounded" // Add Tailwind classes
              >
                <option value="">All Ranks</option>
                {/* Sort ranks for display */}
                {[...ranks].sort((a, b) => a.rank_id - b.rank_id).map(rank => (
                  <option key={rank.rank_id} value={rank.rank_id.toString()}>
                    {rank.rank_id === 0 ? 'Guild Master' : rank.rank_name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* --- Loading Indicator (for updates) --- */}
        {loading && <div className="text-center p-2">Updating...</div>}

        {/* --- Card Grid --- */}
        {filteredAndSortedMains.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredAndSortedMains.map((member) => {
              // Calculate alt count for this specific main member
              const altCount = allMembers?.filter(alt => alt.classification === 'Alt' && alt.mainCharacterId === member.character_id).length || 0;
              
              return (
                <GuildMemberCard
                  key={member.character_id}
                  member={member}
                  getRankName={getRankName}
                  onViewAlts={handleViewAlts}
                  altCount={altCount}
                  // Pass userRole here if implemented
                />
              );
            })}
          </div>
        ) : (
          <div className="text-center p-4">No main characters match the current filters.</div>
        )}

        {/* --- Alt Modal --- */}
        <Modal
          isOpen={isAltModalOpen && selectedMainForAlts !== null}
          onClose={handleCloseAltModal}
          title={`Alts for ${selectedMainForAlts?.character?.name || 'Character'}`}
        >
          {/* Content for the modal */}
          {selectedMainForAlts && altsForSelectedMain.length > 0 ? (
            <ul>
              {altsForSelectedMain.map(alt => (
                <li key={alt.character_id} className="border-b py-2 last:border-b-0">
                  <p className="font-medium">{alt.character.name}</p>
                  <p className="text-sm text-gray-600">
                    Level: {getCharacterLevel(alt)} | iLvl: {getItemLevel(alt)} | Class: {alt.character?.profile_json?.character_class?.name || alt.character?.class}
                  </p>
                  {/* Add more alt details if needed */}
                </li>
              ))}
            </ul>
          ) : (
            <p>No alts found for this character.</p>
          )}
          <div className="mt-4 pt-4 border-t flex justify-end">
             <button
               onClick={handleCloseAltModal}
               className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300" // Adjusted style
             >
               Close
             </button>
          </div>
        </Modal>
      </div>
    </ErrorBoundary>
  );
};