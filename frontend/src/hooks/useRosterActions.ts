import { useState, useRef, useCallback } from 'react';
import { Roster, RosterMemberAddition } from '@shared/types/api';
import * as rosterServiceApi from '../services/api/roster.service';

/**
 * Custom hook for roster member actions.
 * - Handles adding, removing, and updating roles for roster members.
 * - Provides loading/submitting state for actions.
 * - Includes race condition protection for async actions.
 * - Adds debouncing for role updates.
 * - Reports errors and success messages.
 * - Triggers an onSuccess callback (provided by the consumer) upon successful action completion
 *   to signal the consumer to refetch the roster data.
 */
export function useRosterActions(selectedRoster: Roster | null, onSuccess?: () => void) {
  // Remove selectedRosterMembers, setSelectedRosterMembers, and loadingMembers state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [removingMembers, setRemovingMembers] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Race condition protection for async actions
  const latestActionRef = useRef<number>(0);

  // Use NodeJS.Timeout or number depending on your environment (number is safer for browser)
  const roleUpdateTimeouts = useRef<Record<number, number>>({});

  const clearMessages = useCallback(() => {
    setError(null);
    setSuccessMessage(null);
  }, []);

  // Debounced role update - simplified
  const handleUpdateRole = useCallback((characterId: number, newRole: string | null) => {
    if (!selectedRoster) {
      setError('No roster selected or invalid roster ID.');
      return;
    }
    const roleToSend = typeof newRole === 'string' ? (newRole.trim() || null) : null;

    // Clear previous timeout if exists
    if (roleUpdateTimeouts.current[characterId]) {
      clearTimeout(roleUpdateTimeouts.current[characterId]);
    }

    // Debounce API call
    roleUpdateTimeouts.current[characterId] = window.setTimeout(async () => { // Use window.setTimeout for browser
      clearMessages();
      // Maybe set a specific loading state for this row if needed
      const actionId = Date.now();
      latestActionRef.current = actionId;
      try {
        await rosterServiceApi.rosterService.updateRosterMemberRole(selectedRoster.id, characterId, roleToSend);
        if (latestActionRef.current === actionId) {
          setSuccessMessage(`Role updated successfully.`);
          // Call onSuccess to refetch the entire list after successful update
          onSuccess?.();
        }
      } catch (err: any) {
        if (latestActionRef.current === actionId) {
          console.error('Error updating role:', err);
          setError(err.response?.data?.message || err.message || 'Failed to update member role.');
          // No revert needed here, parent will refetch on error or success
        }
      } finally {
        // Reset specific loading state if implemented
      }
    }, 500); // 500ms debounce
  }, [selectedRoster, clearMessages, onSuccess]);


  const handleAddMembers = useCallback(async (additions: RosterMemberAddition[]) => {
    // --- Logging Start ---
    console.log('[useRosterActions] handleAddMembers called with additions:', JSON.stringify(additions));
    // --- Logging End ---
    if (!selectedRoster || additions.length === 0) {
      // --- Logging Start ---
      console.error('[useRosterActions] handleAddMembers aborted: No selected roster or empty additions.');
      // --- Logging End ---
      return Promise.reject(new Error("Invalid input")); // Return rejected promise
    }
    clearMessages();
    setIsSubmitting(true);
    const actionId = Date.now();
    latestActionRef.current = actionId;

    try {
      // --- Logging Start ---
      console.log(`[useRosterActions] Calling rosterService.addRosterMembers for roster ${selectedRoster.id} (Action ID: ${actionId})`);
      // --- Logging End ---
      await rosterServiceApi.rosterService.addRosterMembers(selectedRoster.id, additions);
      if (latestActionRef.current === actionId) {
        // --- Logging Start ---
        console.log(`[useRosterActions] addRosterMembers SUCCESS (Action ID: ${actionId}). Triggering onSuccess.`);
        // --- Logging End ---
        setSuccessMessage('Member(s) added successfully.');
        onSuccess?.(); // Trigger refetch via callback
        return Promise.resolve(); // Resolve the promise on success
      } else {
        // --- Logging Start ---
        console.log(`[useRosterActions] addRosterMembers STALE SUCCESS (Action ID: ${actionId}, Latest: ${latestActionRef.current}). No action taken.`);
        // --- Logging End ---
      }
    } catch (err: any) {
      if (latestActionRef.current === actionId) {
        // --- Logging Start ---
        console.error(`[useRosterActions] addRosterMembers FAILED (Action ID: ${actionId}):`, err);
        // --- Logging End ---
        setError(err.response?.data?.message || err.message || 'Failed to add members.');
        return Promise.reject(err); // Reject the promise on error
      } else {
         // --- Logging Start ---
        console.log(`[useRosterActions] addRosterMembers STALE FAILURE (Action ID: ${actionId}, Latest: ${latestActionRef.current}). Error ignored.`);
         // --- Logging End ---
      }
    } finally {
      if (latestActionRef.current === actionId) {
        // --- Logging Start ---
        console.log(`[useRosterActions] addRosterMembers FINALLY (Action ID: ${actionId}). Setting isSubmitting=false.`);
        // --- Logging End ---
        setIsSubmitting(false);
      }
    }
    // Return a resolved promise if the action ID didn't match (stale request)
    return Promise.resolve();
  }, [selectedRoster, clearMessages, onSuccess]);

  const handleRemoveMember = useCallback(async (characterId: number) => {
    // --- Logging Start ---
    console.log(`[useRosterActions] handleRemoveMember called for characterId: ${characterId}`); // <<< ENSURE LOG EXISTS
    // --- Logging End ---
    if (!selectedRoster) {
      console.error('[useRosterActions] handleRemoveMember aborted: No selected roster.');
      return;
    }
    clearMessages();
    // Optimistically update the removing set for UI feedback
    setRemovingMembers(prev => new Set(prev).add(characterId));
    const actionId = Date.now();
    latestActionRef.current = actionId;

    // --- Logging Start ---
    console.log(`[useRosterActions] Entering try block for removeRosterMember (Action ID: ${actionId})`); // <<< ADD LOG
    // --- Logging End ---
    try {
      console.log(`[useRosterActions] Calling rosterService.removeRosterMember for roster ${selectedRoster.id}, character ${characterId}`); // <<< ENSURE LOG EXISTS
      await rosterServiceApi.rosterService.removeRosterMember(selectedRoster.id, characterId);
      if (latestActionRef.current === actionId) {
        setSuccessMessage('Member removed successfully.');
        onSuccess?.(); // Trigger refetch via callback
      }
    } catch (err: any) {
      if (latestActionRef.current === actionId) {
        console.error('Error removing member:', err);
        setError(err.response?.data?.message || err.message || 'Failed to remove member.');
        // If the API call failed, remove from the removing set
        setRemovingMembers(prev => {
          const next = new Set(prev);
          next.delete(characterId);
          return next;
        });
      }
    } finally {
      // Don't reset removingMembers here; let the onSuccess refetch handle UI update
      // Only reset if the action ID doesn't match (stale request)
      if (latestActionRef.current !== actionId) {
        setRemovingMembers(prev => {
          const next = new Set(prev);
          next.delete(characterId);
          return next;
        });
      }
      // isSubmitting might need finer control if multiple removes can happen
      // For now, let the success callback handle the final state implicitly
    }
  }, [selectedRoster, clearMessages, onSuccess]);

  // Return state and handlers *without* selectedRosterMembers/setter
  return {
    isSubmitting,
    removingMembers, // Keep this for row-level loading state
    error,
    successMessage,
    setError,
    setSuccessMessage,
    handleUpdateRole,
    handleRemoveMember,
    handleAddMembers,
    clearMessages,
  };
}
