import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api/auth.service';

const DiscordConnect: React.FC = () => {
  const { user, refreshUser, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = () => {
    // Redirect to backend Discord OAuth endpoint
    window.location.href = '/api/auth/discord';
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
          <button onClick={handleConnect}>Connect Discord</button>
        </div>
      )}
    </div>
  );
};

export default DiscordConnect;