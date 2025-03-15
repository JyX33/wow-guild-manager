import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { guildService, eventService } from '../services/api';
import EventCalendar from '../components/EventCalendar';

interface Event {
  id: number;
  title: string;
  start: Date;
  end: Date;
  event_type: string;
}

const GuildPage: React.FC = () => {
  const { guildId } = useParams<{ guildId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [guild, setGuild] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'calendar' | 'members'>('calendar');
  // Add a key to force refresh the calendar component when needed
  const [calendarKey, setCalendarKey] = useState(Date.now());

  useEffect(() => {
    // Force refresh of calendar when navigating back to this page
    setCalendarKey(Date.now());
  }, [location.key]);

  useEffect(() => {
    const fetchGuildData = async () => {
      try {
        if (!guildId) return;
        
        // Fetch guild data
        const guildResponse = await guildService.getGuildById(parseInt(guildId));
        setGuild(guildResponse.data);
        
        // Fetch guild members
        const membersResponse = await guildService.getGuildMembers(parseInt(guildId));
        setMembers(membersResponse.data);
      } catch (error) {
        console.error('Failed to fetch guild data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGuildData();
  }, [guildId]);

  const handleEventSelect = (event: Event) => {
    navigate(`/event/${event.id}`);
  };

  const handleSlotSelect = (slotInfo: { start: Date; end: Date }) => {
    if (!guildId) return;
    
    // Format dates for the form
    const startStr = slotInfo.start.toISOString().slice(0, 16);
    const endStr = slotInfo.end.toISOString().slice(0, 16);
    
    navigate(`/guild/${guildId}/event/create`, { 
      state: { startTime: startStr, endTime: endStr }
    });
  };

  const handleCreateEvent = () => {
    if (!guildId) return;
    navigate(`/guild/${guildId}/event/create`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl mb-4">Loading Guild...</h2>
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{guild?.name}</h1>
        <p className="text-gray-600">{guild?.realm} ({guild?.region.toUpperCase()})</p>
      </div>
      
      <div className="mb-6">
        <div className="flex border-b">
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
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Level</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {members.map((member, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap">{member.character.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{member.character.playable_class.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{member.character.level}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{member.rank}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default GuildPage;