import React from 'react';
import { useApi } from '../hooks/useApi';
import { guildService } from '../services/api';
import { Guild } from '../../../shared/types/guild';
import LoadingSpinner from './LoadingSpinner';

// Extend the Guild type to include is_guild_master property
interface UserGuild extends Guild {
  is_guild_master?: boolean;
}

/**
 * Component that displays all guilds the user is a member of
 */
export const UserGuilds: React.FC = () => {
  const { data: guilds, loading, error } = useApi<UserGuild[]>({
    apiFn: guildService.getUserGuilds,
    immediate: true
  });
  
  if (loading) return <LoadingSpinner />;
  
  if (error) {
    return <div className="text-red-500">Error loading guilds: {error.message}</div>;
  }
  
  if (!guilds || guilds.length === 0) {
    return <div className="text-center p-4">You are not a member of any guild.</div>;
  }
  
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">My Guilds</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {guilds.map(guild => (
          <div key={`${guild.realm}-${guild.name}`} className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              {guild.guild_data_json?.crest && (
                <div className="mr-3">
                  {/* Guild crest can be rendered here */}
                </div>
              )}
              <div>
                <h3 className="font-medium">{guild?.guild_data_json?.name}</h3>
                <p className="text-sm text-gray-600">
                  {typeof guild.realm === 'object' && 'name' in guild.realm 
                    ? guild.realm 
                    : guild.realm} • {guild?.guild_data_json?.member_count || 0} members
                </p>
              </div>
            </div>
            
            {guild.is_guild_master && (
              <div className="mt-2 text-xs font-medium text-green-600 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Guild Master
              </div>
            )}
            
            <div className="mt-3 flex">
              <a 
                href={`/guild/${guild.id}`} 
                className="flex-1 text-center text-sm bg-blue-50 text-blue-600 p-2 rounded hover:bg-blue-100"
              >
                View
              </a>
              
              {guild.is_guild_master && (
                <a 
                  href={`/guild/${guild.id}/manage`} 
                  className="flex-1 ml-2 text-center text-sm bg-green-50 text-green-600 p-2 rounded hover:bg-green-100"
                >
                  Manage
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserGuilds;