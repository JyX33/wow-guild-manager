import React from 'react';
import { GuildMember } from '@shared/types/guild';
import { GuildRank } from '@shared/types/guild';

interface AddMemberFormsProps {
  guildMembers: GuildMember[];
  guildRanks: GuildRank[];
  addCharSearch: string;
  setAddCharSearch: (s: string) => void;
  selectedCharToAdd: GuildMember | null;
  setSelectedCharToAdd: (m: GuildMember | null) => void;
  addCharRole: string;
  setAddCharRole: (s: string) => void;
  selectedRanksToAdd: string[];
  setSelectedRanksToAdd: (ids: string[]) => void;
  addRankRole: string;
  setAddRankRole: (s: string) => void;
  isSubmitting: boolean;
  onAddSingleCharacter: (e: React.FormEvent) => void;
  onAddByRank: (e: React.FormEvent) => void;
}

const getClassColor = (className: string): string => {
  const colors: { [key: string]: string } = {
    'Death Knight': 'text-red-600',
    'Demon Hunter': 'text-purple-600',
    'Druid': 'text-orange-500',
    'Hunter': 'text-green-400',
    'Mage': 'text-blue-400',
    'Monk': 'text-teal-400',
    'Paladin': 'text-pink-400',
    'Priest': 'text-white',
    'Rogue': 'text-yellow-400',
    'Shaman': 'text-blue-600',
    'Warlock': 'text-purple-400',
    'Warrior': 'text-orange-700',
    'Evoker': 'text-teal-600',
  };
  return colors[className] || 'text-gray-400';
};

const AddMemberForms: React.FC<AddMemberFormsProps> = ({
  guildMembers,
  guildRanks,
  addCharSearch,
  setAddCharSearch,
  selectedCharToAdd,
  setSelectedCharToAdd,
  addCharRole,
  setAddCharRole,
  selectedRanksToAdd,
  setSelectedRanksToAdd,
  addRankRole,
  setAddRankRole,
  isSubmitting,
  onAddSingleCharacter,
  onAddByRank,
}) => {
  // Memoize filteredGuildMembers for performance
  const filteredGuildMembers = React.useMemo(() => {
    if (!addCharSearch || guildMembers.length === 0) return [];
    // Standardize to .name and .class for display/selection
    return guildMembers
      .filter(member =>
        member.character_name.toLowerCase().includes(addCharSearch.toLowerCase())
      );
  }, [addCharSearch, guildMembers]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Add by Character */}
      <form onSubmit={onAddSingleCharacter} className="space-y-2 p-3 bg-gray-800 rounded">
        <label htmlFor="charSearch" className="block text-sm font-medium text-gray-300">Add by Character Name</label>
        <div className="relative">
          <input
            id="charSearch"
            type="text"
            value={addCharSearch}
            onChange={(e) => { setAddCharSearch(e.target.value); setSelectedCharToAdd(null); }}
            placeholder="Search character..."
            disabled={isSubmitting}
            className="w-full p-2 rounded bg-gray-900 border border-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            autoComplete="off"
          />
          {addCharSearch && filteredGuildMembers.length > 0 && (
            <ul className="absolute z-20 w-full bg-gray-900 border border-gray-600 rounded mt-1 max-h-40 overflow-y-auto shadow-lg">
              {filteredGuildMembers.slice(0, 10).map(member => (
                <li key={member.id}
                  className={`p-2 cursor-pointer hover:bg-blue-600 ${getClassColor(member.character_class)}`}
                  onClick={() => {
                    setSelectedCharToAdd(member);
                    setAddCharSearch(member.character_name);
                  }}>
                  {member.character_name} ({member.character_class})
                </li>
              ))}
            </ul>
          )}
        </div>
        {selectedCharToAdd && <p className="text-xs text-green-400">Selected: {selectedCharToAdd.character_name}</p>}
        <input
          type="text"
          value={addCharRole}
          onChange={(e) => setAddCharRole(e.target.value)}
          placeholder="Optional Role"
          disabled={isSubmitting}
          className="w-full p-2 rounded bg-gray-900 border border-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
        />
        <button type="submit" disabled={!selectedCharToAdd || !selectedCharToAdd.id || isSubmitting} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-3 rounded text-sm transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed">
          {isSubmitting ? 'Adding...' : 'Add Character'}
        </button>
      </form>
      {/* Add by Rank */}
      <form onSubmit={onAddByRank} className="space-y-2 p-3 bg-gray-800 rounded">
        <label htmlFor="rankSelect" className="block text-sm font-medium text-gray-300">Add by Rank</label>
        <select
          id="rankSelect"
          multiple
          value={selectedRanksToAdd}
          onChange={(e) => setSelectedRanksToAdd(Array.from(e.target.selectedOptions, option => option.value))}
          disabled={isSubmitting}
          className="w-full p-2 rounded bg-gray-900 border border-gray-600 h-24 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
        >
          {guildRanks.map(rank => (
            <option key={rank.rank_id} value={String(rank.rank_id)}>{rank.rank_name} (ID {rank.rank_id})</option>
          ))}
        </select>
        <input
          type="text"
          value={addRankRole}
          onChange={(e) => setAddRankRole(e.target.value)}
          placeholder="Optional Role for All"
          disabled={isSubmitting}
          className="w-full p-2 rounded bg-gray-900 border border-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
        />
        <button type="submit" disabled={selectedRanksToAdd.length === 0 || isSubmitting} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-3 rounded text-sm transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed">
          {isSubmitting ? 'Adding...' : `Add ${selectedRanksToAdd.length} Rank(s)`}
        </button>
      </form>
    </div>
  );
};

export default AddMemberForms;
