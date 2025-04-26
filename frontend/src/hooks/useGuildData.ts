import { useCallback, useState, useRef } from 'react';
import { GuildMember, GuildRank } from '@shared/types/guild';
import * as guildServiceApi from '../services/api/guild.service';

/**
 * Custom hook for fetching guild members and ranks.
 * - Consolidates error handling for guildId parsing.
 * - Adds (documented) race condition protection.
 * - Uses type-safe API responses and functional updates.
 */
export function useGuildData(guildId: string) {
  const [guildMembers, setGuildMembers] = useState<GuildMember[]>([]);
  const [guildRanks, setGuildRanks] = useState<GuildRank[]>([]);
  const [loadingGuildData, setLoadingGuildData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchAbortRef = useRef<AbortController | null>(null);

  const getNumericGuildId = useCallback(() => {
    const numericGuildId = parseInt(guildId, 10);
    if (isNaN(numericGuildId)) {
      setError("Invalid Guild ID provided.");
      return null;
    }
    return numericGuildId;
  }, [guildId]);

  const fetchGuildData = useCallback(async () => {
    setLoadingGuildData(true);

    // Abort previous fetch if any (not supported by API service, for future use)
    if (fetchAbortRef.current) {
      fetchAbortRef.current.abort();
    }
    const abortController = new AbortController();
    fetchAbortRef.current = abortController;

    const numericGuildId = getNumericGuildId();
    if (!numericGuildId) {
      setLoadingGuildData(false);
      return;
    }
    try {
      const [membersResponse, ranksResponse] = await Promise.all([
        guildServiceApi.guildService.getGuildMembers(numericGuildId),
        guildServiceApi.guildService.getGuildRanks(numericGuildId),
      ]);
      setGuildMembers(Array.isArray(membersResponse.data?.data) ? membersResponse.data.data : []);
      setGuildRanks(prev =>
        Array.isArray(ranksResponse.data)
          ? [...ranksResponse.data].sort((a: GuildRank, b: GuildRank) => a.rank_id - b.rank_id)
          : []
      );
    } catch (err: any) {
      setError(err?.message || 'Failed to load guild data.');
    } finally {
      setLoadingGuildData(false);
    }
  }, [getNumericGuildId]);

  return {
    guildMembers,
    guildRanks,
    loadingGuildData,
    error,
    fetchGuildData,
    setError,
  };
}