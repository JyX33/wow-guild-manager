import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api/auth.service';

const DiscordConnect: React.FC = () => {
  const { user, refreshUser, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      // This call likely needs to handle a redirect response from the backend,
      // or the backend needs to be adjusted. For now, implementing as requested.
      const response = await authService.connectDiscord();
      if (response.success) {
        // Assuming connectDiscord might return user info or success status
        // If it triggers OAuth flow, refreshUser might not be needed here directly
        await refreshUser();
      } else {
        setError(response.message || 'Failed to initiate Discord connection');
      }
    } catch (err: any) {
      setError('Failed to initiate Discord connection');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authService.disconnectDiscord();
      if (response.success) {
        await refreshUser();
      } else {
        setError(response.message || 'Failed to disconnect Discord');
      }
    } catch (err: any) {
      setError('Failed to disconnect Discord');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div>
      {user.discord_id ? (
        <div>
          <div>
            <span>
              Connected to Discord (ID: <b>{user.discord_id}</b>)
            </span>
          </div>
          <button onClick={handleDisconnect} disabled={loading}>
            {loading ? 'Disconnecting...' : 'Disconnect Discord'}
          </button>
          {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
        </div>
      ) : (
        <div>
          <button onClick={handleConnect} disabled={loading}>
            {loading ? 'Connecting...' : 'Connect Discord'}
          </button>
        </div>
      )}
    </div>
  );
};

export default DiscordConnect;

