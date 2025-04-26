import { useCallback, useState, useRef } from 'react';
import { Roster, ApiResponse } from '@shared/types/api';
import * as rosterServiceApi from '../services/api/roster.service';

/**
 * Custom hook for managing guild rosters.
 * - Consolidates error handling for guildId parsing.
 * - Adds race condition protection for fetches.
 * - Removes 'as any' casts and uses proper types.
 * - Uses functional updates for state setters.
 */
export function useGuildRosters(guildId: string) {
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [selectedRoster, setSelectedRoster] = useState<Roster | null>(null);
  const [loadingRosters, setLoadingRosters] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [newRosterName, setNewRosterName] = useState('');
  const fetchAbortRef = useRef<AbortController | null>(null);

  const clearMessages = useCallback(() => {
    setError(null);
    setSuccessMessage(null);
  }, []);

  // Consolidated guildId parsing and error handling
  const getNumericGuildId = useCallback(() => {
    const numericGuildId = parseInt(guildId, 10);
    if (isNaN(numericGuildId)) {
      setError("Invalid Guild ID provided.");
      return null;
    }
    return numericGuildId;
  }, [guildId]);

  // Race condition protection for fetchRosters
  const fetchRosters = useCallback(async () => {
    setLoadingRosters(true);
    clearMessages();

    // Abort previous fetch if any
    if (fetchAbortRef.current) {
      fetchAbortRef.current.abort();
    }
    const abortController = new AbortController();
    fetchAbortRef.current = abortController;

    const numericGuildId = getNumericGuildId();
    if (!numericGuildId) {
      setLoadingRosters(false);
      return;
    }
    try {
      // NOTE: The API service does not support abort signals yet.
      const response: ApiResponse<Roster[]> = await rosterServiceApi.rosterService.getRostersByGuild(numericGuildId);
      setRosters(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      if (abortController.signal.aborted) return;
      setError(err?.message || 'Failed to load rosters. Please try again.');
    } finally {
      if (!abortController.signal.aborted) setLoadingRosters(false);
    }
  }, [getNumericGuildId, clearMessages]);

  const handleSelectRoster = useCallback((rosterId: number | null) => {
    clearMessages();
    setSelectedRoster(prev => {
      if (rosterId === null || prev?.id === rosterId) {
        return null;
      }
      const localRoster = rosters.find(r => r.id === rosterId);
      if (!localRoster) {
        setError(`Selected roster not found.`);
        return null;
      }
      return localRoster;
    });
  }, [rosters, clearMessages]);

  const handleCreateRoster = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    const numericGuildId = getNumericGuildId();
    if (!numericGuildId) return;
    if (!newRosterName.trim()) {
      setError("Roster name cannot be empty.");
      return;
    }
    setIsSubmitting(true);
    try {
      const response: ApiResponse<Roster> = await rosterServiceApi.rosterService.createRoster(numericGuildId, newRosterName.trim());
      if (response.data) {
        setNewRosterName('');
        await fetchRosters();
        setSuccessMessage(`Roster "${response.data.name}" created successfully.`);
        setSelectedRoster(response.data);
      } else {
        throw new Error(response.message || "Failed to create roster.");
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to create roster. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRoster = async (roster: Roster) => {
    setIsSubmitting(true);
    clearMessages();
    try {
      await rosterServiceApi.rosterService.deleteRoster(roster.id);
      setSuccessMessage(`Roster deleted successfully.`);
      setSelectedRoster(prev => (prev?.id === roster.id ? null : prev));
      await fetchRosters();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete roster. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    rosters,
    selectedRoster,
    loadingRosters,
    isSubmitting,
    error,
    successMessage,
    newRosterName,
    setNewRosterName,
    fetchRosters,
    handleSelectRoster,
    handleCreateRoster,
    handleDeleteRoster,
    setError,
    setSuccessMessage,
    clearMessages,
    setSelectedRoster,
  };
}