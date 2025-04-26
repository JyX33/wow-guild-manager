import { Roster, RosterMember, RosterMemberAddition } from '@shared/types/api'; // Use path alias
import { GuildMember, GuildRank } from '@shared/types/guild'; // Use path alias
import React, { useCallback, useEffect, useRef, useState } from 'react'; // Added useRef
import * as guildServiceApi from '../services/api/guild.service'; // Renamed to avoid conflict
import * as rosterServiceApi from '../services/api/roster.service'; // Renamed to avoid conflict
import LoadingSpinner from './LoadingSpinner';
// import ConfirmationDialog from './ConfirmationDialog'; // Assuming this exists and has props: isOpen, onClose, onConfirm, title, message
// import FormStatus from './FormStatus'; // Assuming this exists and has props: message, type ('error' | 'success')
// import Autocomplete from 'react-autocomplete'; // Example if using an autocomplete library

interface GuildRosterManagerProps {
    guildId: string;
}

// Helper to get class color (assuming similar logic exists elsewhere)
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
        'Evoker': 'text-teal-600', // Added Evoker
    };
    return colors[className] || 'text-gray-400';
};

const GuildRosterManager: React.FC<GuildRosterManagerProps> = ({ guildId }) => {
    const fetchingRosterIdRef = useRef<number | null>(null); // Ref to track the ID being fetched
    const [rosters, setRosters] = useState<Roster[]>([]);
    const [selectedRoster, setSelectedRoster] = useState<Roster | null>(null);
    const [selectedRosterMembers, setSelectedRosterMembers] = useState<RosterMember[]>([]);
    const [guildMembers, setGuildMembers] = useState<GuildMember[]>([]);
    const [guildRanks, setGuildRanks] = useState<GuildRank[]>([]);

    const [loadingRosters, setLoadingRosters] = useState<boolean>(false);
    const [loadingRosterDetails, setLoadingRosterDetails] = useState<boolean>(false);
    const [loadingGuildData, setLoadingGuildData] = useState<boolean>(false);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false); // For form submissions

    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Form States
    const [newRosterName, setNewRosterName] = useState<string>('');
    const [addCharSearch, setAddCharSearch] = useState<string>('');
    const [selectedCharToAdd, setSelectedCharToAdd] = useState<GuildMember | null>(null);
    const [addCharRole, setAddCharRole] = useState<string>('');
    const [selectedRanksToAdd, setSelectedRanksToAdd] = useState<string[]>([]);
    const [addRankRole, setAddRankRole] = useState<string>('');

    // Confirmation Dialog State (Example structure)
    // const [confirmAction, setConfirmAction] = useState<{ type: 'deleteRoster' | 'removeMember'; data: any; message: string } | null>(null);

    // --- Clear Messages ---
    const clearMessages = () => {
        setError(null);
        setSuccessMessage(null);
    };

    // --- Fetch Initial Data ---
    const fetchRosters = useCallback(async () => {
        setLoadingRosters(true);
        clearMessages();
        const numericGuildId = parseInt(guildId, 10);
        if (isNaN(numericGuildId)) {
            setError("Invalid Guild ID provided.");
            setLoadingRosters(false);
            return;
        }
        try {
            // Use correct service variable and access .data
            const response = await rosterServiceApi.rosterService.getRostersByGuild(numericGuildId);
            // Assuming the actual API response is { success: boolean, data: Roster[] } based on logs
            setRosters((response.data as any)?.data || []); // Access nested data, use 'as any' to bypass TS error
        } catch (err: any) {
            console.error("Error fetching rosters:", err);
            setError(err?.message || 'Failed to load rosters. Please try again.');
        } finally {
            setLoadingRosters(false);
        }
    }, [guildId]);

    const fetchGuildData = useCallback(async () => {
        setLoadingGuildData(true);
        const numericGuildId = parseInt(guildId, 10);
        if (isNaN(numericGuildId)) {
            // Error already set by fetchRosters if it runs first
            if (!error) setError("Invalid Guild ID provided.");
            setLoadingGuildData(false);
            return;
        }
        // Don't clear messages here as it might overwrite roster fetch errors
        try {
            const [membersResponse, ranksResponse] = await Promise.all([
                guildServiceApi.guildService.getGuildMembers(numericGuildId),
                guildServiceApi.guildService.getGuildRanks(numericGuildId),
            ]);
            setGuildMembers(membersResponse.data || []);
            // Sort ranks by level for display
            setGuildRanks((ranksResponse.data || []).sort((a: GuildRank, b: GuildRank) => a.rank_id - b.rank_id)); // Sort by rank_id
        } catch (err: any) {
            console.error("Error fetching guild data:", err);
            setError((prevError) => prevError ? `${prevError}\n${err?.message || 'Failed to load guild data.'}` : (err?.message || 'Failed to load guild data.'));
        } finally {
            setLoadingGuildData(false);
        }
    }, [guildId, error]); // Removed fetchGuildData from deps as it causes loop

    useEffect(() => {
        fetchRosters();
        fetchGuildData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [guildId]); // Fetch only when guildId changes

    // --- Roster Selection ---
    const handleSelectRoster = useCallback(async (rosterId: number | null) => {
        clearMessages();
        const currentSelectedId = selectedRoster?.id; // Keep for initial check

        // Handle deselection or clicking the same roster again
        if (rosterId === null || currentSelectedId === rosterId) {
            fetchingRosterIdRef.current = null; // Clear fetching ref on deselection
            setSelectedRoster(null);
            setSelectedRosterMembers([]);
            setLoadingRosterDetails(false); // Ensure loading stops on deselection
            return;
        }

        const localRoster = rosters.find(r => r.id === rosterId);
        if (!localRoster) {
            console.error(`Roster with ID ${rosterId} not found in local list.`);
            setError(`Selected roster not found.`);
            fetchingRosterIdRef.current = null; // Clear ref if roster not found
            setSelectedRoster(null);
            setSelectedRosterMembers([]);
            setLoadingRosterDetails(false);
            return;
        }

        // --- Start Fetching ---
        const idBeingFetched = rosterId;
        fetchingRosterIdRef.current = idBeingFetched; // Set the ref *before* await

        // Set initial state for loading
        setSelectedRoster(localRoster); // Show local data immediately
        setSelectedRosterMembers([]); // Clear members while loading details
        setLoadingRosterDetails(true);
        setError(null); // Clear previous errors for this roster

        try {
            // Fetch full details from the API
            const response = await rosterServiceApi.rosterService.getRosterDetails(idBeingFetched);

            // --- Race Condition Check (Post-Fetch) ---
            if (fetchingRosterIdRef.current !== idBeingFetched) {
                console.log("Roster selection changed during fetch, ignoring stale data for ID:", idBeingFetched);
                // Don't update state or loading status, the new handler call will manage it.
                return; // Exit early
            }

            // --- Process Response (only if fetch is not stale) ---
            if (response.data) {
                const rosterFromApi = response.data;
                // Try accessing members from the right path based on the console output
                const membersFromApi = response.data.data.members || [];

                // Update roster state only if API provided a full object (optional, could keep local)
                if (rosterFromApi) {
                    setSelectedRoster(rosterFromApi); // Update with potentially more details
                } else {
                     console.warn("API response successful but missing roster object for ID:", idBeingFetched, ". Displaying basic info.");
                     // Keep localRoster already set
                }
                // CRUCIAL: Update members state with API response
                console.log('Setting members in handleSelectRoster:', membersFromApi);
                setSelectedRosterMembers(membersFromApi);
                console.log("Roster details loaded for ID:", idBeingFetched, response.data);
                setSuccessMessage(response.message || `Roster "${localRoster.name}" details loaded.`); // Optional success message

            } else {
                // API Success but data object itself is missing/null
                console.error("API response missing data object for ID:", idBeingFetched, response);
                setError(response.message || `Failed to load full details for roster "${localRoster.name}". Displaying basic info.`);
                console.log('Setting empty members (no data) in handleSelectRoster');
                setSelectedRosterMembers([]); // Ensure members are empty
            }
        } catch (err: any) {
            // API Failure
            console.error("Error fetching roster details for ID:", idBeingFetched, err);

            // --- Race Condition Check (Catch Block) ---
            if (fetchingRosterIdRef.current !== idBeingFetched) {
                console.log("Error occurred for a stale fetch (ID:", idBeingFetched,"), ignoring error.");
                return; // Selection changed, ignore error for stale fetch
            }

            // --- Process Error (only if fetch is not stale) ---
            // Keep the localRoster selected (already set)
            setError(err?.message || `Failed to load details for roster "${localRoster.name}". Please try again.`);
            console.log('Setting empty members (error) in handleSelectRoster');
            setSelectedRosterMembers([]); // Ensure members are empty on error
        } finally {
            // --- Race Condition Check (Finally Block) ---
            // Only stop loading if this fetch corresponds to the *currently* tracked fetch ID
            if (fetchingRosterIdRef.current === idBeingFetched) {
                setLoadingRosterDetails(false);
                // Optionally clear the ref now that this fetch attempt is complete
                // fetchingRosterIdRef.current = null; // Or keep it to compare against future clicks
            }
        }
    // Dependencies: rosters for finding local, rosterServiceApi for fetching. Ref handles async state.
    }, [rosters, rosterServiceApi.rosterService]); // Updated dependencies

    // --- Roster CRUD ---
    const handleCreateRoster = async (e: React.FormEvent) => {
        e.preventDefault();
        clearMessages();
        const numericGuildId = parseInt(guildId, 10);
        if (isNaN(numericGuildId)) {
            setError("Invalid Guild ID.");
            return;
        }
        if (!newRosterName.trim()) {
            setError("Roster name cannot be empty.");
            return;
        }
        setIsSubmitting(true);
        try {
            // Use correct service variable, pass name directly, access .data
            const response = await rosterServiceApi.rosterService.createRoster(numericGuildId, newRosterName.trim());
            if (response.data) {
                setNewRosterName('');
                await fetchRosters(); // Re-fetch rosters list
                setSuccessMessage(`Roster "${response.data.name}" created successfully.`);
                // Auto-select the new roster and wait for selection to finish
                await handleSelectRoster(response.data.id);
            } else {
                throw new Error(response.message || "Failed to create roster.");
            }
        } catch (err: any) {
            console.error("Error creating roster:", err);
            setError(err?.message || 'Failed to create roster. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const triggerDeleteRoster = (roster: Roster) => {
        clearMessages();
        // Using window.confirm for simplicity, replace with ConfirmationDialog if available
        const confirmDelete = window.confirm(`Are you sure you want to delete the roster "${roster.name}"? This action cannot be undone.`);
        if (confirmDelete) {
            performDeleteRoster(roster.id); // Pass number ID
        }
    };

    const performDeleteRoster = async (rosterId: number) => { // Expect number
        setIsSubmitting(true); // Use submitting state for delete operation
        clearMessages();
        try {
            await rosterServiceApi.rosterService.deleteRoster(rosterId); // Pass number ID
            setSuccessMessage(`Roster deleted successfully.`);
            if (selectedRoster?.id === rosterId) { // Compare numbers
                setSelectedRoster(null);
                setSelectedRosterMembers([]);
            }
            await fetchRosters(); // Re-fetch rosters list
        } catch (err: any) {
            console.error("Error deleting roster:", err);
            setError(err?.message || 'Failed to delete roster. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Member Management ---
    const triggerRemoveMember = (member: RosterMember) => {
        clearMessages();
        // Using window.confirm for simplicity
        const confirmRemove = window.confirm(`Are you sure you want to remove ${member.name} from the roster "${selectedRoster?.name}"?`);
        if (confirmRemove) {
            performRemoveMember(member.characterId);
        }
    };

    const performRemoveMember = async (characterId: number) => {
        if (!selectedRoster || typeof selectedRoster.id !== 'number') {
            setError('No roster selected or invalid roster ID.');
            setIsSubmitting(false); // Ensure submitting state is reset
            return;
        }
        setIsSubmitting(true);
        clearMessages();
        try {
            await rosterServiceApi.rosterService.removeRosterMember(selectedRoster.id, characterId);
            setSuccessMessage(`Member removed successfully.`);
            console.log('Updating members in performRemoveMember for charId:', characterId);
            setSelectedRosterMembers(prev => prev.filter(m => m.characterId !== characterId));
        } catch (err: any) {
            console.error("Error removing member:", err);
            setError(err?.message || 'Failed to remove member. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateRole = async (characterId: number, newRole: string) => {
        if (!selectedRoster || typeof selectedRoster.id !== 'number') {
            setError('No roster selected or invalid roster ID.');
            return;
        }
        clearMessages();
        const originalMembers = [...selectedRosterMembers];
        const roleToSend = newRole.trim() || null;

        console.log('Updating members in handleUpdateRole for charId:', characterId);
        setSelectedRosterMembers(prev =>
            prev.map(m => m.characterId === characterId ? { ...m, role: roleToSend } : m)
        );

        try {
            await rosterServiceApi.rosterService.updateRosterMemberRole(selectedRoster.id, characterId, roleToSend);
            setSuccessMessage(`Role updated successfully.`);
        } catch (err: any) {
            console.error("Error updating role:", err);
            setError(err?.message || 'Failed to update member role. Please try again.');
            console.log('Reverting members in handleUpdateRole');
            setSelectedRosterMembers(originalMembers);
        }
    };

    // --- Add Members ---
    const handleAddMembers = async (additions: RosterMemberAddition[]) => {
        if (!selectedRoster || typeof selectedRoster.id !== 'number' || additions.length === 0) {
            setError('No roster selected or invalid roster ID.');
            setIsSubmitting(false); // Ensure submitting state is reset
            return;
        }
        setIsSubmitting(true);
        clearMessages();
        try {
            const response = await rosterServiceApi.rosterService.addRosterMembers(selectedRoster.id, additions);
            if (response.data && Array.isArray(response.data)) {
                console.log('Setting members in handleAddMembers:', response.data);
                setSelectedRosterMembers(response.data);
                setSuccessMessage("Members updated successfully.");
            } else {
                // If response.data is not an array, we might still want to log or handle it,
                // but for now, just keep the success message.
                // Consider if setSelectedRosterMembers should be called here with [] or fetched data.
                setSuccessMessage("Members updated successfully.");
            }
            setAddCharSearch('');
            setSelectedCharToAdd(null);
            setAddCharRole('');
            setSelectedRanksToAdd([]);
            setAddRankRole('');
        } catch (err: any) {
            console.error("Error adding members:", err);
            setError(err?.message || 'Failed to add members. Please check your selections and try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddSingleCharacter = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCharToAdd) {
            setError("Please select a character to add.");
            return;
        }
        const addition: RosterMemberAddition = {
            type: 'character',
            characterId: selectedCharToAdd.id!,
            role: addCharRole.trim() || null,
        };
        handleAddMembers([addition]);
    };

    const handleAddByRank = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedRanksToAdd.length === 0) {
            setError("Please select at least one rank to add.");
            return;
        }
        const additions: RosterMemberAddition[] = selectedRanksToAdd.map(rankIdStr => ({
            type: 'rank',
            rankId: parseInt(rankIdStr, 10),
            role: addRankRole.trim() || null,
        }));
        const validAdditions = additions.filter(a => a.type === 'rank' && !isNaN(a.rankId));
        if (validAdditions.length > 0) {
            handleAddMembers(validAdditions);
        } else {
            setError("No valid ranks selected or failed to parse rank IDs.");
        }
    };

    // --- Autocomplete Logic ---
    const filteredGuildMembers = addCharSearch && guildMembers.length > 0
        ? guildMembers.filter(member =>
            member.character_name.toLowerCase().includes(addCharSearch.toLowerCase()) &&
            !selectedRosterMembers.some(rm => rm.characterId === member.id)
        )
        : [];

    // --- Render ---
    console.log('selectedRosterMembers', selectedRosterMembers);
    return (
        <div className="p-4 bg-gray-800 text-white rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-4 text-yellow-400">Roster Management</h2>

            {/* Status Messages */}
            {error && <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}
            {successMessage && <div className="bg-green-900 border border-green-700 text-green-100 px-4 py-3 rounded relative mb-4" role="alert">{successMessage}</div>}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Roster List & Creation */}
                <div className="md:col-span-1 flex flex-col">
                    <h3 className="text-xl font-semibold mb-3 text-yellow-300">Rosters</h3>
                    {loadingRosters ? (
                        <LoadingSpinner />
                    ) : (
                        <>
                            <div className="flex-grow overflow-hidden mb-4">
                                <ul className="space-y-2 max-h-72 overflow-y-auto pr-2 border border-gray-700 rounded p-2 bg-gray-900/50">
                                    {Array.isArray(rosters) && rosters.map((roster) => (
                                        <li key={roster.id}
                                            className={`flex justify-between items-center p-2 rounded cursor-pointer transition-colors duration-150 ${selectedRoster?.id === roster.id ? 'bg-blue-700 hover:bg-blue-600 ring-1 ring-blue-400' : 'bg-gray-700 hover:bg-gray-600'}`}
                                            onClick={() => handleSelectRoster(roster.id)}>
                                            <span className="font-medium truncate" title={roster.name}>{roster.name}</span>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); triggerDeleteRoster(roster); }}
                                                disabled={isSubmitting}
                                                className="ml-2 text-red-400 hover:text-red-300 text-xs p-1 rounded bg-gray-800 hover:bg-red-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                                                title={`Delete ${roster.name}`}
                                            >
                                                🗑️
                                            </button>
                                        </li>
                                    ))}
                                    {rosters.length === 0 && <li className="text-gray-400 italic p-2">No rosters found.</li>}
                                </ul>
                            </div>

                            <form onSubmit={handleCreateRoster} className="flex space-x-2 mt-auto">
                                <input
                                    type="text"
                                    value={newRosterName}
                                    onChange={(e) => setNewRosterName(e.target.value)}
                                    placeholder="New Roster Name"
                                    disabled={isSubmitting}
                                    className="flex-grow p-2 rounded bg-gray-900 border border-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                                />
                                <button type="submit" disabled={isSubmitting || !newRosterName.trim()} className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed">
                                    {isSubmitting ? <LoadingSpinner size="sm" /> : 'Create'}
                                </button>
                            </form>
                        </>
                    )}
                </div>

                {/* Selected Roster Details */}
                <div className="md:col-span-2">
                    {loadingRosterDetails || (isSubmitting && !selectedRoster) ? (
                        <div className="flex justify-center items-center h-64">
                            <LoadingSpinner />
                        </div>
                    ) : selectedRoster ? (
                        <div className="bg-gray-700 p-4 rounded-lg">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-xl font-semibold text-yellow-300 truncate" title={selectedRoster.name}>{selectedRoster.name}</h3>
                                <button onClick={() => handleSelectRoster(null)} className="text-gray-400 hover:text-white text-sm">Close [X]</button>
                            </div>

                            {/* Member List */}
                            <h4 className="text-lg font-medium mb-2 text-yellow-200">Members ({selectedRosterMembers.length})</h4>
                            {selectedRosterMembers.length > 0 ? (
                                <div className="overflow-x-auto max-h-96 overflow-y-auto border border-gray-600 rounded">
                                    <table className="min-w-full divide-y divide-gray-600">
                                        <thead className="bg-gray-800 sticky top-0 z-10">
                                            <tr>
                                                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Name</th>
                                                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Rank</th>
                                                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Class</th>
                                                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Role</th>
                                                <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-gray-700 divide-y divide-gray-600">
                                            {Array.isArray(selectedRosterMembers) && selectedRosterMembers.map((member) => (
                                                <tr key={member.characterId} className="hover:bg-gray-600/50">
                                                    <td className={`px-4 py-2 whitespace-nowrap text-sm font-medium ${getClassColor(member.class)}`}>{member.name}</td>
                                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-300">{member.rank}</td>
                                                    <td className={`px-4 py-2 whitespace-nowrap text-sm ${getClassColor(member.class)}`}>{member.class}</td>
                                                    <td className="px-4 py-2 whitespace-nowrap text-sm">
                                                        <input
                                                            type="text"
                                                            defaultValue={member.role || ''}
                                                            onBlur={(e) => handleUpdateRole(member.characterId, e.target.value)}
                                                            placeholder="Assign Role"
                                                            disabled={isSubmitting}
                                                            className="w-28 p-1 rounded bg-gray-900 border border-gray-600 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                                                        <button
                                                            onClick={() => triggerRemoveMember(member)}
                                                            disabled={isSubmitting}
                                                            className="text-red-400 hover:text-red-300 text-xs p-1 rounded bg-gray-800 hover:bg-red-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                                                            title={`Remove ${member.name}`}
                                                        >
                                                            Remove
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-gray-400 italic py-4">This roster is empty.</p>
                            )}

                            {/* Add Member Controls */}
                            <div className="mt-6 pt-4 border-t border-gray-600">
                                <h4 className="text-lg font-medium mb-3 text-yellow-200">Add Members</h4>
                                {loadingGuildData ? <LoadingSpinner /> : (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {/* Add by Character */}
                                        <form onSubmit={handleAddSingleCharacter} className="space-y-2 p-3 bg-gray-800 rounded">
                                            <label htmlFor="charSearch" className="block text-sm font-medium text-gray-300">Add by Character Name</label>
                                            <div className="relative">
                                                <input
                                                    id="charSearch"
                                                    type="text"
                                                    value={addCharSearch}
                                                    onChange={(e) => { setAddCharSearch(e.target.value); setSelectedCharToAdd(null); clearMessages(); }}
                                                    placeholder="Search character..."
                                                    disabled={isSubmitting}
                                                    className="w-full p-2 rounded bg-gray-900 border border-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                                                    autoComplete="off"
                                                />
                                                {addCharSearch && filteredGuildMembers.length > 0 && (
                                                    <ul className="absolute z-20 w-full bg-gray-900 border border-gray-600 rounded mt-1 max-h-40 overflow-y-auto shadow-lg">
                                                        {Array.isArray(filteredGuildMembers) && filteredGuildMembers.slice(0, 10).map(member => (
                                                            <li key={member.id}
                                                                className={`p-2 cursor-pointer hover:bg-blue-600 ${getClassColor(member.character_class)}`}
                                                                onClick={() => {
                                                                    setSelectedCharToAdd(member);
                                                                    setAddCharSearch(member.character_name);
                                                                    clearMessages();
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
                                                {isSubmitting ? <LoadingSpinner size="sm" /> : 'Add Character'}
                                            </button>
                                        </form>

                                        {/* Add by Rank */}
                                        <form onSubmit={handleAddByRank} className="space-y-2 p-3 bg-gray-800 rounded">
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
                                                {isSubmitting ? <LoadingSpinner size="sm" /> : `Add ${selectedRanksToAdd.length} Rank(s)`}
                                            </button>
                                        </form>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex justify-center items-center h-64 text-gray-500 italic">
                            Select a roster from the list to view details or create a new one.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GuildRosterManager;