import React, { useEffect, useState } from 'react';
import { Roster, RosterMemberAddition } from '@shared/types/api';
import { GuildMember, GuildRank } from '@shared/types/guild';
import RosterList from './roster/RosterList';
import RosterDetails from './roster/RosterDetails';
import ConfirmationDialog from './ConfirmationDialog';
import { useGuildRosters } from '../hooks/useGuildRosters';
import { useGuildData } from '../hooks/useGuildData';
import { useRosterActions } from '../hooks/useRosterActions';

interface GuildRosterManagerProps {
  guildId: string;
}

const GuildRosterManager: React.FC<GuildRosterManagerProps> = ({ guildId }) => {
  // Hooks for rosters and guild data
  const {
    rosters,
    selectedRoster,
    loadingRosters,
    isSubmitting: rosterSubmitting,
    error: rosterError,
    successMessage: rosterSuccess,
    newRosterName,
    setNewRosterName,
    fetchRosters,
    handleSelectRoster,
    handleCreateRoster,
    handleDeleteRoster,
    setError: setRosterError,
    setSuccessMessage: setRosterSuccess,
    clearMessages: clearRosterMessages,
    setSelectedRoster,
  } = useGuildRosters(guildId);

  const {
    guildMembers,
    guildRanks,
    loadingGuildData,
    error: guildError,
    fetchGuildData,
    setError: setGuildError,
  } = useGuildData(guildId);

  const {
    selectedRosterMembers,
    setSelectedRosterMembers,
    isSubmitting: memberSubmitting,
    removingMembers,
    error: memberError,
    successMessage: memberSuccess,
    setError: setMemberError,
    setSuccessMessage: setMemberSuccess,
    handleUpdateRole,
    handleRemoveMember,
    handleAddMembers,
  } = useRosterActions(selectedRoster);

  // Form state for add member forms
  const [addCharSearch, setAddCharSearch] = useState('');
  const [selectedCharToAdd, setSelectedCharToAdd] = useState<GuildMember | null>(null);
  const [addCharRole, setAddCharRole] = useState('');
  const [selectedRanksToAdd, setSelectedRanksToAdd] = useState<string[]>([]);
  const [addRankRole, setAddRankRole] = useState('');

  // Confirmation dialog state
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogData, setConfirmDialogData] = useState<{
    title: string;
    message: string;
    confirmAction: () => void;
    type: 'delete-roster' | 'remove-member';
    itemId: number;
  } | null>(null);

  // Robust global loading state
  const globalLoading =
    loadingRosters || loadingGuildData || rosterSubmitting || memberSubmitting;

  // Collect all non-null error/success messages for robust UI feedback
  const errorMessages = [rosterError, guildError, memberError].filter(Boolean);
  const successMessages = [rosterSuccess, memberSuccess].filter(Boolean);

  // Fetch initial data
  useEffect(() => {
    fetchRosters();
    fetchGuildData();
    setSelectedRosterMembers([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guildId]);

  // When selectedRoster changes, clear member form state
  useEffect(() => {
    setAddCharSearch('');
    setSelectedCharToAdd(null);
    setAddCharRole('');
    setSelectedRanksToAdd([]);
    setAddRankRole('');
    setSelectedRosterMembers([]);
  }, [selectedRoster, setSelectedRosterMembers]);

  // Handle roster selection and details fetch
  const onSelectRoster = (rosterId: number) => {
    handleSelectRoster(rosterId);
    setSelectedRosterMembers([]);
  };

  // Confirmation dialog handlers
  const triggerDeleteRoster = (roster: Roster) => {
    setRosterError(null);
    setConfirmDialogData({
      title: 'Delete Roster',
      message: `Are you sure you want to delete the roster "${roster.name}"? This action cannot be undone.`,
      confirmAction: () => {
        handleDeleteRoster(roster);
      },
      type: 'delete-roster',
      itemId: roster.id,
    });
    setConfirmDialogOpen(true);
  };

  const triggerRemoveMember = (characterId: number, memberName: string) => {
    setMemberError(null);
    setConfirmDialogData({
      title: 'Remove Member',
      message: `Are you sure you want to remove ${memberName} from the roster "${selectedRoster?.name}"?`,
      confirmAction: () => {
        handleRemoveMember(characterId);
      },
      type: 'remove-member',
      itemId: characterId,
    });
    setConfirmDialogOpen(true);
  };

  // Add member handlers
  const handleAddSingleCharacter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCharToAdd) {
      setMemberError("Please select a character to add.");
      return;
    }
    const addition: RosterMemberAddition = {
      type: 'character',
      characterId: selectedCharToAdd.id!,
      role: addCharRole.trim() || null,
    };
    handleAddMembers([addition]);
    setAddCharSearch('');
    setSelectedCharToAdd(null);
    setAddCharRole('');
  };

  const handleAddByRank = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRanksToAdd.length === 0) {
      setMemberError("Please select at least one rank to add.");
      return;
    }
    const additions: RosterMemberAddition[] = selectedRanksToAdd.map(rankIdStr => ({
      type: 'rank',
      rankId: parseInt(rankIdStr, 10),
      role: addRankRole.trim() || null,
    }));
    handleAddMembers(additions);
    setSelectedRanksToAdd([]);
    setAddRankRole('');
  };

  return (
    <div className="p-4 bg-gray-800 text-white rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold mb-4 text-yellow-400">Roster Management</h2>
      {/* Status Messages */}
      {errorMessages.length > 0 && (
        <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error: </strong>
          <ul className="list-disc pl-5">
            {errorMessages.map((msg, idx) => (
              <li key={idx}>{msg}</li>
            ))}
          </ul>
        </div>
      )}
      {successMessages.length > 0 && (
        <div className="bg-green-900 border border-green-700 text-green-100 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Success: </strong>
          <ul className="list-disc pl-5">
            {successMessages.map((msg, idx) => (
              <li key={idx}>{msg}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Roster List & Creation */}
        <RosterList
          rosters={rosters}
          selectedRosterId={selectedRoster?.id ?? null}
          loading={loadingRosters}
          isSubmitting={rosterSubmitting}
          newRosterName={newRosterName}
          onRosterNameChange={setNewRosterName}
          onSelectRoster={onSelectRoster}
          onCreateRoster={handleCreateRoster}
          onDeleteRoster={triggerDeleteRoster}
        />
        {/* Selected Roster Details */}
        <div className="md:col-span-2">
          {selectedRoster ? (
            <RosterDetails
              roster={selectedRoster}
              members={selectedRosterMembers}
              loading={false}
              isSubmitting={memberSubmitting}
              onClose={() => { setSelectedRoster(null); setSelectedRosterMembers([]); }}
              onUpdateRole={handleUpdateRole}
              onRemoveMember={(member) => triggerRemoveMember(member.characterId, member.name)}
              removingMembers={removingMembers}
              guildMembers={guildMembers}
              guildRanks={guildRanks}
              loadingGuildData={loadingGuildData}
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
              onAddMembers={handleAddMembers}
              onAddSingleCharacter={handleAddSingleCharacter}
              onAddByRank={handleAddByRank}
            />
          ) : (
            <div className="flex justify-center items-center h-64 text-gray-500 italic">
              Select a roster from the list to view details or create a new one.
            </div>
          )}
        </div>
      </div>
      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmDialogOpen}
        title={confirmDialogData?.title || ''}
        message={confirmDialogData?.message || ''}
        confirmText={confirmDialogData?.type === 'delete-roster' ? 'Delete' : 'Remove'}
        cancelText="Cancel"
        onConfirm={() => {
          confirmDialogData?.confirmAction();
          setConfirmDialogOpen(false);
        }}
        onCancel={() => {
          setConfirmDialogOpen(false);
        }}
        isLoading={globalLoading}
        confirmButtonClass={confirmDialogData?.type === 'delete-roster' ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'}
      />
    </div>
  );
};

export default GuildRosterManager;