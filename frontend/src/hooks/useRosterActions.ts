import { useState, useRef, useCallback } from 'react';
import { Roster, RosterMember, RosterMemberAddition } from '@shared/types/api';
import * as rosterServiceApi from '../services/api/roster.service';

/**
 * Custom hook for roster member actions.
 * - Adds race condition protection for async actions.
 * - Improves optimistic update for member removal.
 * - Adds debouncing for role updates.
 * - Ensures type safety and consistent property usage.
 * - Uses functional updates for state setters.
 */
export function useRosterActions(selectedRoster: Roster | null) {
  const [selectedRosterMembers, setSelectedRosterMembers] = useState<RosterMember[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [removingMembers, setRemovingMembers] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Race condition protection for async actions
  const latestActionRef = useRef<number>(0);

  // Debounce for role updates
  const roleUpdateTimeouts = useRef<Record<number, number>>({});

  // Debounced role update
  const handleUpdateRole = useCallback((characterId: number, newRole: string) => {
    if (!selectedRoster || typeof selectedRoster.id !== 'number') {
      setError('No roster selected or invalid roster ID.');
      return;
    }
    const roleToSend = newRole.trim() || null;
    setSelectedRosterMembers(prev =>
      prev.map(m => m.characterId === characterId ? { ...m, role: roleToSend } : m)
    );

    // Clear previous timeout if exists
    if (roleUpdateTimeouts.current[characterId]) {
      clearTimeout(roleUpdateTimeouts.current[characterId]);
    }

    // Debounce API call
    roleUpdateTimeouts.current[characterId] = setTimeout(async () => {
      const actionId = ++latestActionRef.current;
      try {
        await rosterServiceApi.rosterService.updateRosterMemberRole(selectedRoster.id, characterId, roleToSend);
        if (latestActionRef.current === actionId) {
          setSuccessMessage(`Role updated successfully.`);
        }
      } catch (err: any) {
        if (latestActionRef.current === actionId) {
          setError(err?.message || 'Failed to update member role. Please try again.');
          // Optionally, revert the role change
          setSelectedRosterMembers(prev =>
            prev.map(m => m.characterId === characterId ? { ...m, role: null } : m)
          );
        }
      }
    }, 400); // 400ms debounce
  }, [selectedRoster]);

  // Improved optimistic update for member removal
  const handleRemoveMember = useCallback(async (characterId: number) => {
    if (!selectedRoster || typeof selectedRoster.id !== 'number') {
      setError('No roster selected or invalid roster ID.');
      setIsSubmitting(false);
      setRemovingMembers(prev => {
        const newSet = new Set(prev);
        newSet.delete(characterId);
        return newSet;
      });
      return;
    }
    // Find member and its index for accurate revert
    const memberIndex = selectedRosterMembers.findIndex(m => m.characterId === characterId);
    const memberToRemove = memberIndex !== -1 ? selectedRosterMembers[memberIndex] : undefined;
    setSelectedRosterMembers(prev => prev.filter(m => m.characterId !== characterId));
    setIsSubmitting(true);
    setRemovingMembers(prev => new Set(prev).add(characterId));
    const actionId = ++latestActionRef.current;
    try {
      await rosterServiceApi.rosterService.removeRosterMember(selectedRoster.id, characterId);
      if (latestActionRef.current === actionId) {
        setSuccessMessage(`${memberToRemove?.name || 'Member'} removed successfully.`);
      }
    } catch (err: any) {
      if (latestActionRef.current === actionId) {
        setError(err?.message || 'Failed to remove member. Please try again.');
        // Revert at the correct index to avoid duplicates
        if (memberToRemove && memberIndex !== -1) {
          setSelectedRosterMembers(prev => {
            const newArr = [...prev];
            newArr.splice(memberIndex, 0, memberToRemove);
            return newArr;
          });
        }
      }
    } finally {
      setIsSubmitting(false);
      setRemovingMembers(prev => {
        const newSet = new Set(prev);
        newSet.delete(characterId);
        return newSet;
      });
    }
  }, [selectedRoster, selectedRosterMembers]);

  const handleAddMembers = useCallback(async (additions: RosterMemberAddition[]) => {
    if (!selectedRoster || typeof selectedRoster.id !== 'number' || additions.length === 0) {
      setError('No roster selected or invalid roster ID.');
      setIsSubmitting(false);
      return;
    }
    setIsSubmitting(true);
    const actionId = ++latestActionRef.current;
    try {
      const response = await rosterServiceApi.rosterService.addRosterMembers(selectedRoster.id, additions);
      if (response.data && Array.isArray(response.data)) {
        if (latestActionRef.current === actionId) {
          setSelectedRosterMembers(response.data);
          setSuccessMessage("Members updated successfully.");
        }
      } else {
        if (latestActionRef.current === actionId) {
          setSuccessMessage("Members updated successfully.");
        }
      }
    } catch (err: any) {
      if (latestActionRef.current === actionId) {
        setError(err?.message || 'Failed to add members. Please check your selections and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedRoster]);

  return {
    selectedRosterMembers,
    setSelectedRosterMembers,
    isSubmitting,
    removingMembers,
    error,
    successMessage,
    setError,
    setSuccessMessage,
    handleUpdateRole,
    handleRemoveMember,
    handleAddMembers,
  };
}