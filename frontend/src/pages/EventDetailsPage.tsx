import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { eventService, characterService } from '../services/api';
import { UserRole } from '../../../shared/types/user';
import { CharacterSelector } from '../components/CharacterSelector';
import { format } from 'date-fns';
import withAuth from '@/components/withAuth';

interface Event {
  id: number;
  title: string;
  description: string;
  event_type: string;
  start_time: string;
  end_time: string;
  created_by: number;
  guild_id: number;
  max_participants: number;
}

interface Subscription {
  id: number;
  event_id: number;
  user_id: number;
  character_id: number;
  status: string;
  battletag: string;
  // Character data from join
  character_name: string;
  character_class: string;
  character_role: string;
}

const EventDetailsPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [subscribers, setSubscribers] = useState<Subscription[]>([]);
  const [userSubscription, setUserSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingCharacters, setLoadingCharacters] = useState(true);
  const [formData, setFormData] = useState({
    status: 'Confirmed',
    character_id: 0
  });
  const [characters, setCharacters] = useState([]);

  useEffect(() => {
    const fetchEventData = async () => {
      try {
        if (!eventId) return;
        
        // Fetch event details
        const eventResponse = await eventService.getEventById(parseInt(eventId));
        setEvent(eventResponse.data);
        
        // Fetch event subscribers
        const subscribersResponse = await eventService.getEventSubscribers(parseInt(eventId));
        setSubscribers(subscribersResponse.data);
        
        // Check if current user is subscribed
        const userSub = subscribersResponse.data.find(
          (sub: Subscription) => sub.user_id === user?.id
        );
        
        if (userSub) {
          setUserSubscription(userSub);
          setFormData({
            status: userSub.status,
            character_id: userSub.character_id
          });
        }
      } catch (error) {
        console.error('Failed to fetch event data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEventData();
  }, [eventId, user?.id]);
  
  // Fetch user's characters
  useEffect(() => {
    const fetchCharacters = async () => {
      try {
        setLoadingCharacters(true);
        const response = await characterService.getUserCharacters();
        
        if (response.success && response.data) {
          setCharacters(response.data);
          
          // If we have characters but no character_id is set yet, select the main character or first character
          if (response.data.length > 0 && !formData.character_id) {
            const mainCharacter = response.data.find(char => char.is_main);
            if (mainCharacter) {
              setFormData(prev => ({ ...prev, character_id: mainCharacter.id }));
            } else {
              setFormData(prev => ({ ...prev, character_id: response.data[0].id }));
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch characters:', error);
      } finally {
        setLoadingCharacters(false);
      }
    };
    
    fetchCharacters();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleCharacterSelect = (characterId: number) => {
    setFormData({ ...formData, character_id: characterId });
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (!eventId) return;
      
      if (userSubscription) {
        // Update existing subscription
        await eventService.updateSubscription(parseInt(eventId), formData);
      } else {
        // Create new subscription
        await eventService.subscribeToEvent(parseInt(eventId), formData);
      }
      
      // Refresh event subscribers
      const subscribersResponse = await eventService.getEventSubscribers(parseInt(eventId));
      setSubscribers(subscribersResponse.data);
      
      // Update user subscription status
      const userSub = subscribersResponse.data.find(
        (sub: Subscription) => sub.user_id === user?.id
      );
      setUserSubscription(userSub);
    } catch (error) {
      console.error('Failed to subscribe to event:', error);
    }
  };

  const handleEditEvent = () => {
    if (!eventId) return;
    navigate(`/event/${eventId}/edit`);
  };

  const handleDeleteEvent = async () => {
    try {
      if (!eventId || !event) return;
      
      await eventService.deleteEvent(parseInt(eventId));
      navigate(`/guild/${event.guild_id}`);
    } catch (error) {
      console.error('Failed to delete event:', error);
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

  // Format dates for display
  const startDate = new Date(event.start_time);
  const endDate = new Date(event.end_time);
  const formattedStart = format(startDate, 'PPP p');
  const formattedEnd = format(endDate, 'PPP p');

  // Check if user is allowed to edit/delete this event
  const canEditOrDelete =
    user?.role === UserRole.ADMIN ||
    (user?.role === UserRole.USER && user?.id === event.created_by);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-4">
        <button
          className="text-blue-600 hover:text-blue-800"
          onClick={() => navigate(`/guild/${event.guild_id}`)}
        >
          &larr; Back to Guild
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">{event.title}</h1>
            <div className="mb-4">
              <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium mr-2">
                {event.event_type}
              </span>
            </div>
          </div>
          
          {canEditOrDelete && (
            <div className="flex space-x-2">
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                onClick={handleEditEvent}
              >
                Edit
              </button>
              <button
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                onClick={handleDeleteEvent}
              >
                Delete
              </button>
            </div>
          )}
        </div>
        
        <div className="mb-6">
          <p className="text-gray-700 whitespace-pre-line">{event.description}</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-lg font-medium mb-2">Event Details</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Starts:</span> {formattedStart}</p>
              <p><span className="font-medium">Ends:</span> {formattedEnd}</p>
              <p><span className="font-medium">Max Participants:</span> {event.max_participants}</p>
              <p><span className="font-medium">Current Participants:</span> {subscribers.length}</p>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-2">Join Event</h3>
            <form onSubmit={handleSubscribe} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                >
                  <option value="Confirmed">Confirmed</option>
                  <option value="Tentative">Tentative</option>
                  <option value="Declined">Declined</option>
                </select>
              </div>
              
              <CharacterSelector
                selectedCharacterId={formData.character_id}
                onSelectCharacter={handleCharacterSelect}
                className="w-full"
              />
              
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
              >
                {userSubscription ? 'Update Subscription' : 'Join Event'}
              </button>
            </form>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-medium mb-2">Participants ({subscribers.length})</h3>
          {subscribers.length > 0 ? (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Player</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Character</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {subscribers.map((sub) => (
                    <tr key={sub.id}>
                      <td className="px-6 py-4 whitespace-nowrap">{sub.battletag}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{sub.character_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{sub.character_class}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{sub.character_role}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-block px-2 py-1 rounded text-sm font-medium
                          ${sub.status === 'Confirmed' ? 'bg-green-100 text-green-800' :
                            sub.status === 'Tentative' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'}
                        `}>
                          {sub.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No participants yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default withAuth(EventDetailsPage);