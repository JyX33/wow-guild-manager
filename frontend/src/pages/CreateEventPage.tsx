import React from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { guildApi } from '../services/api.service';
import EventForm from '../components/EventForm';
import withAuth from '../components/WithAuth';
import { Event, Guild } from '../types';

interface LocationState {
  startTime?: string;
  endTime?: string;
}

/**
 * Refactored Create Event Page with improved error handling and type safety
 */
const CreateEventPage: React.FC = () => {
  const { guildId } = useParams<{ guildId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  
  // Get guild details to show guild name in the page
  const { data: guild, loading: guildLoading } = useApi<Guild>({
    apiFn: guildApi.getGuildById,
    args: [parseInt(guildId || '0')],
    deps: [guildId]
  });
  
  // Get start and end times from location state (if clicked on calendar)
  const startTime = state?.startTime || new Date().toISOString().slice(0, 16);
  
  // Default end time is 2 hours after start
  const defaultEndTime = new Date(new Date(startTime).getTime() + 2 * 60 * 60 * 1000)
    .toISOString().slice(0, 16);
  const endTime = state?.endTime || defaultEndTime;

  const initialValues = {
    title: '',
    description: '',
    event_type: 'Raid' as const,
    start_time: startTime,
    end_time: endTime,
    max_participants: 25,
    guild_id: parseInt(guildId || '0')
  };

  const handleSubmitSuccess = (event: Event) => {
    // Navigate to the event details page after successful creation
    navigate(`/event/${event.id}`);
  };

  // If guild ID is not valid, redirect to dashboard
  if (!guildId || isNaN(parseInt(guildId))) {
    navigate('/dashboard');
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-4">
        <button
          className="text-blue-600 hover:text-blue-800 flex items-center"
          onClick={() => navigate(`/guild/${guildId}`)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Guild
        </button>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold mb-2">Create New Event</h1>
          {guild && (
            <p className="text-gray-600 mb-6">
              Guild: {guild.name} ({guild.realm} - {guild.region.toUpperCase()})
            </p>
          )}
          
          <EventForm 
            initialValues={initialValues}
            onSubmitSuccess={handleSubmitSuccess}
            buttonText="Create Event"
            mode="create"
          />
        </div>
      </div>
    </div>
  );
};

// Export the component wrapped with authentication
export default withAuth(CreateEventPage);