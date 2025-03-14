import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { eventApi } from '../services/api.service';
import { useAuth } from '../context/AuthContext';
import EventForm from '../components/EventForm';

const EditEventPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        if (!eventId) return;
        
        const response = await eventApi.getEventById(parseInt(eventId));
        setEvent(response.data);
        
        // Check if user is authorized to edit
        if (response.data.created_by !== user?.id) {
          navigate(`/event/${eventId}`);
        }
      } catch (error) {
        console.error('Failed to fetch event:', error);
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId, user?.id, navigate]);

  const handleSubmit = async (values: any) => {
    try {
      if (!eventId) return;
      
      await eventApi.updateEvent(parseInt(eventId), values);
      navigate(`/event/${eventId}`);
    } catch (error) {
      console.error('Failed to update event:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl mb-4">Loading Event...</h2>
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 text-red-700 p-4 rounded">
          Event not found.
        </div>
      </div>
    );
  }

  // Format dates for form
  const formattedStartTime = new Date(event.start_time).toISOString().slice(0, 16);
  const formattedEndTime = new Date(event.end_time).toISOString().slice(0, 16);

  const initialValues = {
    title: event.title,
    description: event.description,
    event_type: event.event_type,
    start_time: formattedStartTime,
    end_time: formattedEndTime,
    max_participants: event.max_participants,
    guild_id: event.guild_id
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-4">
        <button
          className="text-blue-600 hover:text-blue-800"
          onClick={() => navigate(`/event/${eventId}`)}
        >
          &larr; Back to Event
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6">Edit Event</h1>
        
        <EventForm 
          initialValues={initialValues}
          onSubmit={handleSubmit}
          buttonText="Update Event"
        />
      </div>
    </div>
  );
};

export default EditEventPage;