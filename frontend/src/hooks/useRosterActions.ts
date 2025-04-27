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
    if (!selectedRoster || additions.length === 0) return Promise.reject(new Error("Invalid input")); // Return rejected promise
    clearMessages();
    setIsSubmitting(true);
    const actionId = Date.now();
    latestActionRef.current = actionId;

    try {
      // The API response for adding members might not return the full list,
      // so we rely on the onSuccess callback to refetch.
      await rosterServiceApi.rosterService.addRosterMembers(selectedRoster.id, additions);
      if (latestActionRef.current === actionId) {
        setSuccessMessage('Member(s) added successfully.');
        onSuccess?.(); // Trigger refetch via callback
        // Resolve the promise on success
        return Promise.resolve();
      }
    } catch (err: any) {
      if (latestActionRef.current === actionId) {
        console.error('Error adding members:', err);
        setError(err.response?.data?.message || err.message || 'Failed to add members.');
        // Reject the promise on error
        return Promise.reject(err);
      }
    } finally {
      if (latestActionRef.current === actionId) {
        setIsSubmitting(false);
      }
    }
    // Return a resolved promise if the action ID didn't match (stale request)
    return Promise.resolve();
  }, [selectedRoster, clearMessages, onSuccess]);

  const handleRemoveMember = useCallback(async (characterId: number) => {
    if (!selectedRoster) return;
    clearMessages();
    // Optimistically update the removing set for UI feedback
    setRemovingMembers(prev => new Set(prev).add(characterId));
    const actionId = Date.now();
    latestActionRef.current = actionId;

    try {
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
