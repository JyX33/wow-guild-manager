import React, { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { guildService } from '../services/api/guild.service';
import type { GuildRank } from '../../../shared/types/models/guild';
import LoadingSpinner from './LoadingSpinner';

interface Props {
  guildId: number;
}

export const GuildRankManager: React.FC<Props> = ({ guildId }) => {
  const [editingRank, setEditingRank] = useState<number | null>(null);
  const [rankName, setRankName] = useState<string>('');
  const [updateLoading, setUpdateLoading] = useState<boolean>(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<boolean>(false);
  
  const { 
    data: ranks, 
    loading, 
    error,
    execute: refreshRanks 
  } = useApi<GuildRank[]>({
    apiFn: guildService.getGuildRankStructure,
    args: [guildId],
    deps: [guildId]
  });
  
  if (loading) return <LoadingSpinner />;
  
  if (error) {
    return (
      <div className="text-red-500 p-4 rounded-md bg-red-50 border border-red-200">
        Error loading guild ranks: {error.message}
      </div>
    );
  }
  
  if (!ranks || ranks.length === 0) {
    return (
      <div className="text-center p-4 text-gray-500">
        No rank information available
      </div>
    );
  }
  
  const handleEditClick = (rank: GuildRank) => {
    setEditingRank(rank.rank_id);
    setRankName(rank.rank_name);
    setUpdateSuccess(false);
    setUpdateError(null);
  };
  
  const handleCancelEdit = () => {
    setEditingRank(null);
    setRankName('');
    setUpdateError(null);
  };
  
  const handleSaveRankName = async (rankId: number) => {
    if (!rankName.trim()) {
      setUpdateError('Rank name cannot be empty');
      return;
    }
    
    setUpdateLoading(true);
    setUpdateError(null);
    
    try {
      const response = await guildService.updateRankName(guildId, rankId, rankName);
      
      if (response.success) {
        setUpdateSuccess(true);
        setEditingRank(null);
        await refreshRanks([guildId]); // Re-fetch ranks with original arguments
      } else {
        setUpdateError(response.error?.message || 'Failed to update rank name');
      }
    } catch (err) {
      setUpdateError('An unexpected error occurred');
    } finally {
      setUpdateLoading(false);
    }
  };
  
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Guild Ranks</h2>
      
      {updateError && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
          {updateError}
        </div>
      )}
      
      {updateSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded">
          Rank name updated successfully
        </div>
      )}
      
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Rank
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Members
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {ranks.map((rank) => (
            <tr key={rank.rank_id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                {rank.rank_id === 0 ? 
                  <span className="font-medium text-green-600">Guild Master</span> : 
                  `Rank ${rank.rank_id}`
                }
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {editingRank === rank.rank_id ? (
                  <input 
                    type="text"
                    value={rankName}
                    onChange={(e) => setRankName(e.target.value)}
                    className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                    maxLength={50}
                    disabled={updateLoading}
                  />
                ) : (
                  <div>
                    {rank.rank_name}
                    {rank.is_custom && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Custom
                      </span>
                    )}
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <span className="px-2 inline-flex items-center text-sm">
                  {rank.member_count || 0}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right">
                {editingRank === rank.rank_id ? (
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => handleSaveRankName(rank.rank_id)}
                      disabled={updateLoading}
                      className="text-green-600 hover:text-green-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={updateLoading}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleEditClick(rank)}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    Edit
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};