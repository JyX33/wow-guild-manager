import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { guildService } from '../services/api/guild.service';
import { Guild } from '../../../shared/types/guild';
import { GuildRankManager } from '../components/GuildRankManager';
import { SyncGuildRosterButton } from '../components/SyncGuildRosterButton';
import LoadingSpinner from '../components/LoadingSpinner';
import withAuth from '@/components/withAuth';

const GuildManagePage: React.FC = () => {
  const { guildId } = useParams<{ guildId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [guild, setGuild] = useState<Guild | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuildMaster, setIsGuildMaster] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'ranks' | 'roster'>('general');
  const [error, setError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchGuildData = async () => {
      try {
        if (!guildId) return;
        
        // Fetch guild data
        const guildResponse = await guildService.getGuildById(parseInt(guildId));
        
        if (guildResponse.success && guildResponse.data) {
          setGuild(guildResponse.data);
          
          // // Check if user is guild master of this guild
          // const userGuildsResponse = await guildService.getUserGuilds();
          // if (userGuildsResponse.success && userGuildsResponse.data) {
          //   const matchingGuild = userGuildsResponse.data.find(g => g.id === parseInt(guildId));
          //   setIsGuildMaster(matchingGuild?.is_guild_master || false);
          // }
        } else {
          setError(guildResponse.error?.message || 'Failed to load guild data');
        }
      } catch (error) {
        setError('Failed to fetch guild data');
        console.error('Failed to fetch guild data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGuildData();
  }, [guildId, user?.id]);
  
  // Redirect if not guild master
  useEffect(() => {
    if (!loading && !isGuildMaster) {
      navigate(`/guild/${guildId}`);
    }
  }, [loading, isGuildMaster, navigate, guildId]);
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  if (!guild) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-gray-500 text-center">Guild not found</div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-4">
        <button
          className="text-blue-600 hover:text-blue-800 flex items-center"
          onClick={() => navigate(`/guild/${guildId}`)}
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Guild
        </button>
      </div>
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Manage: {guild.name}</h1>
        <p className="text-gray-600">{guild.realm} ({guild.region?.toUpperCase()})</p>
      </div>
      
      <div className="mb-6">
        <div className="flex border-b">
          <button
            className={`px-4 py-2 mr-2 ${activeTab === 'general' ? 'border-b-2 border-blue-500 font-medium' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            General Settings
          </button>
          <button
            className={`px-4 py-2 mr-2 ${activeTab === 'ranks' ? 'border-b-2 border-blue-500 font-medium' : ''}`}
            onClick={() => setActiveTab('ranks')}
          >
            Rank Management
          </button>
          <button
            className={`px-4 py-2 ${activeTab === 'roster' ? 'border-b-2 border-blue-500 font-medium' : ''}`}
            onClick={() => setActiveTab('roster')}
          >
            Roster Management
          </button>
        </div>
      </div>
      
      {activeTab === 'general' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">General Settings</h2>
          <p className="text-gray-600">Guild settings management options will appear here.</p>
        </div>
      )}
      
      {activeTab === 'ranks' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <GuildRankManager guildId={parseInt(guildId || '0')} />
        </div>
      )}
      
      {activeTab === 'roster' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Guild Roster Management</h2>
          <p className="text-gray-600 mb-4">
            Synchronize guild roster data with your database to maintain up-to-date guild member information.
            This will update character-guild associations and guild rank information.
          </p>
          
          {syncMessage && (
            <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded mb-4">
              {syncMessage}
            </div>
          )}
          
          <SyncGuildRosterButton 
            guildId={parseInt(guildId || '0')} 
            onSyncComplete={(result) => {
              setSyncMessage(`Successfully synchronized ${result.members_updated} guild members.`);
              setTimeout(() => setSyncMessage(null), 5000);
            }}
            className="mb-4"
          />
          
          <div className="mt-4 border-t pt-4">
            <h3 className="text-lg font-semibold mb-2">Current Status</h3>
            <p className="text-gray-600">
              Guild ID: {guildId}<br />
              Guild Leader ID: {guild.leader_id || 'Not set'}<br />
              Last Updated: {guild.last_updated ? new Date(guild.last_updated).toLocaleString() : 'Never'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default withAuth(GuildManagePage);