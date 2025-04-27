import React, { useEffect, useState, useCallback } from 'react';
import { Roster, RosterMember, RosterMemberAddition } from '@shared/types/api'; // Ensure RosterMember is imported
import { GuildMember, GuildRank } from '@shared/types/guild';
import RosterList from './roster/RosterList';
import RosterDetails from './roster/RosterDetails';
import ConfirmationDialog from './ConfirmationDialog';
import { useGuildRosters } from '../hooks/useGuildRosters';
import { useGuildData } from '../hooks/useGuildData';
import { useRosterActions } from '../hooks/useRosterActions';
import { rosterService } from '../services/api/roster.service';

interface GuildRosterManagerProps {
  guildId: string;
}

const GuildRosterManager: React.FC<GuildRosterManagerProps> = ({ guildId }) => {
  // Hooks for rosters and guild data (keep as is)
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

  // --- State Management Changes ---
  // Local state for the members of the currently selected roster
  const [selectedRosterMembers, setSelectedRosterMembers] = useState<RosterMember[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false); // Keep local loading state

  // --- Refactor Action Hook Setup ---
  // State to trigger refetching roster details after an action
  const [refetchCounter, setRefetchCounter] = useState(0);
  // Stable function to increment the counter, triggering a refetch effect
  const triggerRefetch = useCallback(() => setRefetchCounter(c => c + 1), []);

  // Hook for roster actions - Pass triggerRefetch as onSuccess
  const {
    isSubmitting: memberSubmitting,
    removingMembers,
    error: memberError,
    successMessage: memberSuccess,
    setError: setMemberError, // Keep using this for action errors
    setSuccessMessage: setMemberSuccess,
    handleUpdateRole,
    handleRemoveMember,
    handleAddMembers,
    clearMessages: clearMemberMessages, // Get clear function
  } = useRosterActions(selectedRoster, triggerRefetch); // Pass triggerRefetch here

  // Define the fetch function using useCallback
  // Dependencies: selectedRoster (changes), setMemberError (stable from hook)
  const fetchRosterDetails = useCallback(async () => {
    if (!selectedRoster) {
      setSelectedRosterMembers([]); // Use local setter
      return;
    }

    setIsLoadingDetails(true);
    // Don't clear action messages here, let them persist until next action or roster change
    try {
      // --- Logging Start ---
      console.log(`[GuildRosterManager] fetchRosterDetails: Fetching details for roster ID ${selectedRoster.id}`);
      // --- Logging End ---
      const response = await rosterService.getRosterDetails(selectedRoster.id);
      // Ensure response structure is correct before accessing members
      const members = response?.data?.data?.members ?? [];
      // --- Logging Start ---
      console.log('[GuildRosterManager] fetchRosterDetails: Received members data:', members);
      // --- Logging End ---
      setSelectedRosterMembers(Array.isArray(members) ? members : []); // Use local setter, ensure it's an array
      // Optionally clear error *only* on successful fetch if desired
      // setMemberError(null);
    } catch (error: any) {
      console.error('Error fetching roster members:', error);
      // Use setMemberError from the hook to display fetch errors
      setMemberError('Failed to load roster members.');
      setSelectedRosterMembers([]); // Use local setter
    } finally {
      setIsLoadingDetails(false);
    }
  }, [selectedRoster, setMemberError]); // Dependencies are correct

  // Effect to handle initial fetch when selectedRoster changes
  // and clear form state/messages
  useEffect(() => {
    // Reset refetch counter when roster changes to avoid immediate double fetch
    setRefetchCounter(0);

    // Clear form state
    setAddCharSearch('');
    setSelectedCharToAdd(null);
    setAddCharRole('');
    setSelectedRanksToAdd([]);
    setAddRankRole('');
    // Clear previous member messages only when roster changes
    clearMemberMessages?.();

    // Fetch details for the newly selected roster (or clear if null)
    if (selectedRoster) {
        fetchRosterDetails();
    } else {
        // Clear members if no roster is selected
        setSelectedRosterMembers([]);
    }
    // Dependencies: selectedRoster triggers clearing and initial fetch.
    // fetchRosterDetails is stable if selectedRoster/setMemberError are stable/handled.
    // clearMemberMessages is stable.
  }, [selectedRoster, fetchRosterDetails, clearMemberMessages]);

  // Effect to handle manual refetches triggered by the refetchCounter
  useEffect(() => {
    // Only run fetch if counter is > 0 (i.e., triggered by an action)
    // and a roster is actually selected.
    if (refetchCounter > 0 && selectedRoster) {
      // --- Logging Start ---
      console.log(`[GuildRosterManager] useEffect[refetchCounter]: Counter is ${refetchCounter}, triggering fetchRosterDetails.`);
      // --- Logging End ---
      fetchRosterDetails();
    }
    // This effect only depends on the counter and the fetch function itself
  }, [refetchCounter, selectedRoster, fetchRosterDetails]);


  // Form state for add member forms (keep as is)
  const [addCharSearch, setAddCharSearch] = useState('');
  const [selectedCharToAdd, setSelectedCharToAdd] = useState<GuildMember | null>(null);
  const [addCharRole, setAddCharRole] = useState('');
  const [selectedRanksToAdd, setSelectedRanksToAdd] = useState<string[]>([]);
  const [addRankRole, setAddRankRole] = useState('');

  // Confirmation dialog state (keep as is)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogData, setConfirmDialogData] = useState<{
    title: string;
    message: string;
    confirmAction: () => void;
    type: 'delete-roster' | 'remove-member';
    itemId: number;
  } | null>(null);

  // Robust global loading state
  const globalLoading = loadingRosters || loadingGuildData || rosterSubmitting || memberSubmitting || isLoadingDetails;

  // Collect all non-null error/success messages
  const errorMessages = [rosterError, guildError, memberError].filter(Boolean);
  const successMessages = [rosterSuccess, memberSuccess].filter(Boolean);

  // Fetch initial data
  useEffect(() => {
    fetchRosters();
    fetchGuildData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guildId]); // Keep guildId dependency

  // Confirmation dialog handlers
  const triggerDeleteRoster = (roster: Roster) => {
    clearRosterMessages?.(); // Clear roster messages
    setConfirmDialogData({
      title: 'Delete Roster',
      message: `Are you sure you want to delete the roster "${roster.name}"? This action cannot be undone.`,
      confirmAction: () => {
        handleDeleteRoster(roster); // This should trigger refetch in useGuildRosters
      },
      type: 'delete-roster',
      itemId: roster.id,
    });
    setConfirmDialogOpen(true);
  };

  const triggerRemoveMember = (characterId: number, memberName: string) => {
    clearMemberMessages?.(); // Clear previous messages before showing dialog
    setConfirmDialogData({
      title: 'Remove Member',
      message: `Are you sure you want to remove ${memberName} from the roster "${selectedRoster?.name}"?`,
      confirmAction: () => {
        handleRemoveMember(characterId); // This will trigger onSuccess -> triggerRefetch
      },
      type: 'remove-member',
      itemId: characterId,
    });
    setConfirmDialogOpen(true);
  };


  // Add member handlers - Simplify: call handleAddMembers, which triggers refetch on success
  const handleAddSingleCharacter = (e: React.FormEvent) => {
    e.preventDefault();
    clearMemberMessages?.(); // Clear previous messages
    if (!selectedCharToAdd || !selectedCharToAdd.character_id) { // Check for character_id instead of id
      setMemberError("Please select a valid character to add.");
      return;
    }
    const addition: RosterMemberAddition = {
      type: 'character',
      characterId: selectedCharToAdd.character_id, // Use character_id here
      role: addCharRole.trim() || null,
    };
    // --- Logging Start ---
    console.log('[GuildRosterManager] Calling handleAddMembers for single character:', addition);
    // --- Logging End ---
    handleAddMembers([addition]).then(() => {
      // --- Logging Start ---
      console.log('[GuildRosterManager] handleAddMembers (single char) resolved. Clearing form.');
      // --- Logging End ---
      setAddCharSearch('');
      setSelectedCharToAdd(null);
      setAddCharRole('');
    }).catch((err) => {
      // --- Logging Start ---
      console.error('[GuildRosterManager] handleAddMembers (single char) rejected:', err);
      // --- Logging End ---
      /* Error handled by hook, no action needed here */
    });
  };

  const handleAddByRank = (e: React.FormEvent) => {
    e.preventDefault();
    clearMemberMessages?.(); // Clear previous messages
    if (selectedRanksToAdd.length === 0) {
      setMemberError("Please select at least one rank to add.");
      return;
    }
    const additions: RosterMemberAddition[] = selectedRanksToAdd.map(rankIdStr => ({
      type: 'rank',
      rankId: parseInt(rankIdStr, 10),
      role: addRankRole.trim() || null,
    }));
    // --- Logging Start ---
    console.log('[GuildRosterManager] Calling handleAddMembers for ranks:', additions);
    // --- Logging End ---
    handleAddMembers(additions).then(() => {
      // --- Logging Start ---
      console.log('[GuildRosterManager] handleAddMembers (by rank) resolved. Clearing form.');
      // --- Logging End ---
      setSelectedRanksToAdd([]);
      setAddRankRole('');
    }).catch((err) => {
      // --- Logging Start ---
      console.error('[GuildRosterManager] handleAddMembers (by rank) rejected:', err);
      // --- Logging End ---
      /* Error handled by hook, no action needed here */
    });
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
          {/* Optional: Add a close button */}
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
          {/* Optional: Add a close button or auto-dismiss */}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Roster List & Creation */}
        <RosterList
          rosters={rosters}
          selectedRosterId={selectedRoster?.id ?? null}
          loading={loadingRosters}
          isSubmitting={rosterSubmitting} // Submitting state for roster creation/deletion
          newRosterName={newRosterName}
          onRosterNameChange={setNewRosterName}
          onSelectRoster={handleSelectRoster} // Use the one from useGuildRosters
          onCreateRoster={handleCreateRoster} // Use the one from useGuildRosters
          onDeleteRoster={triggerDeleteRoster} // Use the local trigger function
        />

        {/* Selected Roster Details */}
        <div className="md:col-span-2">
          {selectedRoster ? (
            <RosterDetails
              roster={selectedRoster}
              members={selectedRosterMembers} // Pass the local state here
              loading={isLoadingDetails} // Pass the local loading state
              isSubmitting={memberSubmitting} // Pass submitting state for member actions
              onClose={() => { setSelectedRoster(null); /* Members cleared by useEffect */ }}
              onUpdateRole={handleUpdateRole} // Pass handler from useRosterActions
              onRemoveMember={(member) => triggerRemoveMember(member.characterId, member.name)} // Pass local trigger
              removingMembers={removingMembers} // Pass state from useRosterActions
              guildMembers={guildMembers}
              guildRanks={guildRanks}
              loadingGuildData={loadingGuildData}
              // Pass form state and handlers down
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
              // Pass the specific add handlers from this component
              onAddSingleCharacter={handleAddSingleCharacter}
              onAddByRank={handleAddByRank}
              // onAddMembers is not directly needed by RosterDetails anymore
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
        // Use specific submitting state based on the action type
        isLoading={confirmDialogData?.type === 'delete-roster' ? rosterSubmitting : memberSubmitting}
        confirmButtonClass={confirmDialogData?.type === 'delete-roster' ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'}
      />
    </div>
  );
};

export default GuildRosterManager;
