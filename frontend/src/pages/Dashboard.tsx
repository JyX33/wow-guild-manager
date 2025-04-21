import React from 'react';
import withAuth from '../components/withAuth';
import UserGuilds from '../components/UserGuilds';
import { useAuth } from '../context/AuthContext';
import DiscordConnect from '../components/DiscordConnect';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const { user, logout, refreshUser } = useAuth();
  const location = useLocation();
  const [discordStatus, setDiscordStatus] = useState<null | 'success' | 'error'>(null);

  useEffect(() => {
    // Check for discord_link_status in query params
    const params = new URLSearchParams(location.search);
    const status = params.get('discord_link_status');
    if (status === 'success' || status === 'error') {
      setDiscordStatus(status);
      if (status === 'success') {
        // Refresh user data to get updated discord_id
        refreshUser();
      }
      // Remove the query param from the URL (optional, for cleaner UX)
      const url = new URL(window.location.href);
      url.searchParams.delete('discord_link_status');
      window.history.replaceState({}, document.title, url.pathname + url.search);
    }
  }, [location.search, refreshUser]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">WoW Guild Manager</h1>
        <div className="flex items-center">
          <span className="mr-4">Welcome, {user?.battletag}</span>
          <button
            onClick={logout}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </div>

      {discordStatus === 'success' && (
        <div className="mb-4 p-2 bg-green-100 text-green-800 rounded">
          Discord account linked successfully!
        </div>
      )}
      {discordStatus === 'error' && (
        <div className="mb-4 p-2 bg-red-100 text-red-800 rounded">
          Failed to link Discord account. Please try again.
        </div>
      )}

      <div className="mb-8">
        <DiscordConnect />
      </div>
      
      <div className="mt-8 mb-8">
        <UserGuilds />
      </div>
    </div>
  );
};

export default withAuth(Dashboard);