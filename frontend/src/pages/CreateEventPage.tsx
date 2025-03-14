import React from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { eventApi } from '../services/api.service';
import EventForm from '../components/EventForm';

interface LocationState {
  startTime?: string;
  endTime?: string;
}

const CreateEventPage: React.FC = () => {
  const { guildId } = useParams<{ guildId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  
  // Get start and end times from location state (if clicked on calendar)
  const startTime = state?.startTime || new Date().toISOString().slice(0, 16);
  
  // Default end time is 2 hours after start
  const defaultEndTime = new Date(new Date(startTime).getTime() + 2 * 60 * 60 * 1000)
    .toISOString().slice(0, 16);
  const endTime = state?.endTime || defaultEndTime;

  const initialValues = {
    title: '',
    description: '',
    event_type: 'Raid',
    start_time: startTime,
    end_time: endTime,
    max_participants: 25,
    guild_id: parseInt(guildId || '0')
  };

  const handleSubmit = async (values: any) => {
    try {
      await eventApi.createEvent(values);
      navigate(`/guild/${guildId}`);
    } catch (error) {
      console.error('Failed to create event:', error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-4">
        <button
          className="text-blue-600 hover:text-blue-800"
          onClick={() => navigate(`/guild/${guildId}`)}
        >
          &larr; Back to Guild
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6">Create New Event</h1>
        
        <EventForm 
          initialValues={initialValues}
          onSubmit={handleSubmit}
          buttonText="Create Event"
        />
      </div>
    </div>
  );
};

export default CreateEventPage;