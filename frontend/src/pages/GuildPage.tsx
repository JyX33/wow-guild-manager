import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { guildService } from '../services/api/guild.service';
import { Guild } from '../../../shared/types/guild';
import { Event } from '../../../shared/types/event';
import { EnhancedGuildMembersList } from '../components/EnhancedGuildMembersList';
import EventCalendar from '../components/EventCalendar';
import LoadingSpinner from '../components/LoadingSpinner';
import GuildGeneralInfo from '../components/GuildGeneralInfo';
import withAuth from '@/components/withAuth';

interface SlotInfo {
  start: Date;
  end: Date;
}

type TabType = 'general' | 'calendar' | 'members';

const GuildPage: React.FC = () => {
  const { guildId } = useParams<{ guildId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [guild, setGuild] = useState<Guild | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuildMaster, setIsGuildMaster] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [error, setError] = useState<string | null>(null);
  // Add a key to force refresh the calendar component when needed
  const [calendarKey, setCalendarKey] = useState(Date.now());

  useEffect(() => {
    const fetchGuildData = async () => {
      try {
        if (!guildId) return;
        
        // Fetch guild data
        const guildResponse = await guildService.getGuildById(parseInt(guildId));
        
        if (guildResponse.success && guildResponse.data) {
          setGuild(guildResponse.data);
          
          // Check if user is guild master of this guild
          setIsGuildMaster(guildResponse.data.leader_id === user?.id);
          
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

  const handleEventSelect = (event: Event): void => {
    navigate(`/event/${event.id}`);
  };

  const handleSlotSelect = (slotInfo: SlotInfo): void => {
    if (!guildId) return;
    
    // Format dates for the form
    const startStr = slotInfo.start.toISOString().slice(0, 16);
    const endStr = slotInfo.end.toISOString().slice(0, 16);
    
    navigate(`/guild/${guildId}/event/create`, { 
      state: { startTime: startStr, endTime: endStr }
    });
  };

  const handleCreateEvent = (): void => {
    if (!guildId) return;
    navigate(`/guild/${guildId}/event/create`);
  };

  const handleManageGuild = (): void => {
    if (!guildId) return;
    navigate(`/guild/${guildId}/manage`);
  };

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
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">{guild.name}</h1>
          <p className="text-gray-600">{guild.realm} ({guild.region.toUpperCase()})</p>
        </div>
        
        {isGuildMaster && (
          <button
            onClick={handleManageGuild}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Manage Guild
          </button>
        )}
      </div>
      
      <div className="mb-6">
        <div className="flex border-b">
          <button
            className={`px-4 py-2 mr-2 ${activeTab === 'general' ? 'border-b-2 border-blue-500 font-medium' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            General Information
          </button>
          <button
            className={`px-4 py-2 mr-2 ${activeTab === 'calendar' ? 'border-b-2 border-blue-500 font-medium' : ''}`}
            onClick={() => setActiveTab('calendar')}
          >
            Event Calendar
          </button>
          <button
            className={`px-4 py-2 ${activeTab === 'members' ? 'border-b-2 border-blue-500 font-medium' : ''}`}
            onClick={() => setActiveTab('members')}
      
          >
            Guild Members
          </button>
        </div>
      </div>
      
      {activeTab === 'calendar' && (
        <div>
          <div className="flex justify-end mb-4">

      {activeTab === 'general' && guild && (
        <div className="bg-white rounded-lg shadow p-6">
          <GuildGeneralInfo guild={guild} />
        </div>
      )}
      
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              onClick={handleCreateEvent}
            >
              Create Event
            </button>
          </div>
          
          <EventCalendar 
            key={calendarKey}
            guildId={parseInt(guildId || '0')}
            onSelectEvent={handleEventSelect}
            onSelectSlot={handleSlotSelect}
          />
        </div>
      )}
      
      {activeTab === 'members' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <EnhancedGuildMembersList guildId={parseInt(guildId || '0')} />
        </div>
      )}
    </div>
  );
};

export default withAuth(GuildPage);