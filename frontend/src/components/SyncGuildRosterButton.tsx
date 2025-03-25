import React, { useState } from 'react';
import { guildService } from '../services/api';

interface SyncGuildRosterButtonProps {
  guildId: number;
  onSyncComplete?: (result: {message: string, members_updated: number}) => void;
  className?: string;
}

export const SyncGuildRosterButton: React.FC<SyncGuildRosterButtonProps> = ({ 
  guildId,
  onSyncComplete,
  className = ''
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleSync = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await guildService.syncGuildRoster(guildId);
      
      if (response.success && response.data) {
        if (onSyncComplete) {
          onSyncComplete(response.data);
        }
      } else {
        setError(response.error?.message || 'Failed to sync guild roster');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className={className}>
      <button
        onClick={handleSync}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
      >
        {loading ? (
          <>
            <span className="animate-spin inline-block h-4 w-4 mr-2 border-t-2 border-b-2 border-white rounded-full"></span>
            Syncing Guild Roster...
          </>
        ) : (
          'Sync Guild Roster'
        )}
      </button>
      
      {error && (
        <div className="text-red-500 mt-2">{error}</div>
      )}
    </div>
  );
};