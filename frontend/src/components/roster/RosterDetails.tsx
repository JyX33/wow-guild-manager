import React from 'react';
import { Roster, RosterMember,RosterMemberAddition } from '@shared/types/api';
import { GuildMember, GuildRank } from '@shared/types/guild';
import LoadingSpinner from '../LoadingSpinner';
import MemberList from './MemberList';
import AddMemberForms from './AddMemberForms';

interface RosterDetailsProps {
  roster: Roster;
  members: RosterMember[];
  loading: boolean; // Loading state for fetching members
  isSubmitting: boolean; // Submitting state for member actions (add/update/remove)
  onClose: () => void;
  onUpdateRole: (characterId: number, newRole: string) => void;
  onRemoveMember: (member: RosterMember) => void;
  removingMembers: Set<number>; // State for individual member removal loading
  guildMembers: GuildMember[];
  guildRanks: GuildRank[];
  loadingGuildData: boolean; // Loading state for guild data (used by AddMemberForms)
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
  // onAddMembers is removed as the specific handlers are passed down
  onAddSingleCharacter: (e: React.FormEvent) => void;
  onAddByRank: (e: React.FormEvent) => void;
}

const RosterDetails: React.FC<RosterDetailsProps> = ({
  roster,
  members,
  loading, // Use the loading prop passed from parent
  isSubmitting, // Use the isSubmitting prop passed from parent
  onClose,
  onUpdateRole,
  onRemoveMember,
  removingMembers,
  guildMembers,
  guildRanks,
  loadingGuildData,
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
  onAddSingleCharacter,
  onAddByRank,
}) => (
  <div className="bg-gray-700 p-4 rounded-lg">
    <div className="flex justify-between items-center mb-3">
      <h3 className="text-xl font-semibold text-yellow-300 truncate" title={roster.name}>{roster.name}</h3>
      <button onClick={onClose} className="text-gray-400 hover:text-white text-sm">Close [X]</button>
    </div>
    <h4 className="text-lg font-medium mb-2 text-yellow-200">Members ({members.length})</h4>
    {loading ? ( // Use the loading prop here
      <LoadingSpinner />
    ) : members.length > 0 ? (
      <MemberList
        members={members}
        isSubmitting={isSubmitting} // Pass member action submitting state
        onUpdateRole={onUpdateRole}
        onRemoveMember={onRemoveMember}
        removingMembers={removingMembers} // Pass individual removing state
      />
    ) : (
      <p className="text-gray-400 italic py-4">This roster is empty.</p>
    )}
    <div className="mt-6 pt-4 border-t border-gray-600">
      <h4 className="text-lg font-medium mb-3 text-yellow-200">Add Members</h4>
      {loadingGuildData ? <LoadingSpinner /> : ( // Use loadingGuildData for this section
        <AddMemberForms
          guildMembers={guildMembers}
          guildRanks={guildRanks}
          addCharSearch={addCharSearch}
          setAddCharSearch={setAddCharSearch}
          selectedCharToAdd={selectedCharToAdd}
          setSelectedCharToAdd={setSelectedCharToAdd}
          addCharRole={addCharRole}
          setAddCharRole={setAddCharRole}
          selectedRanksToAdd={selectedRanksToAdd}
          setSelectedRanksToAdd={setSelectedRanksToAdd}
          addRankRole={addRankRole}
          setAddRankRole={setAddRankRole}
          isSubmitting={isSubmitting} // Pass member action submitting state
          onAddSingleCharacter={onAddSingleCharacter}
          onAddByRank={onAddByRank}
        />
      )}
    </div>
  </div>
);

export default RosterDetails;
