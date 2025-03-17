import React, { useState } from 'react';
import { characterService } from '../services/api';

interface SyncCharactersButtonProps {
  onSyncComplete?: (result: {added: number, updated: number, total: number}) => void;
  className?: string;
}

export const SyncCharactersButton: React.FC<SyncCharactersButtonProps> = ({ 
  onSyncComplete,
  className = ''
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleSync = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await characterService.syncCharacters();
      
      if (response.success && response.data) {
        if (onSyncComplete) {
          onSyncComplete(response.data);
        }
      } else {
        setError(response.error?.message || 'Failed to sync characters');
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
            Syncing...
          </>
        ) : (
          'Sync Characters'
        )}
      </button>
      
      {error && (
        <div className="text-red-500 mt-2">{error}</div>
      )}
    </div>
  );
};