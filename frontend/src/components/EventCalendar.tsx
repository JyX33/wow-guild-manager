import React, { useState, useEffect } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday } from 'date-fns';
import { Event } from '../types';
import { useApi } from '../hooks/useApi';

interface CalendarEvent extends Event {
  start: Date;
  end: Date;
}

interface EventCalendarProps {
  guildId: number;
  onSelectEvent: (event: CalendarEvent) => void;
  onSelectSlot: (slotInfo: { start: Date; end: Date }) => void;
}

/**
 * Calendar component for displaying and interacting with events
 * This is a simplified calendar that avoids the issues with react-big-calendar
 */
const EventCalendar: React.FC<EventCalendarProps> = ({ 
  guildId, 
  onSelectEvent, 
  onSelectSlot 
}) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  // Use our custom hook to fetch events
  const { data: eventsData, loading, error } = useApi<Event[]>({
    url: `/events/guild/${guildId}`,
    method: 'GET',
    deps: [guildId]
  });

  const [formattedEvents, setFormattedEvents] = useState<CalendarEvent[]>([]);

  // Format events data when it's loaded
  useEffect(() => {
    if (eventsData) {
      const formatted = eventsData.map((event) => ({
        ...event,
        start: new Date(event.start_time),
        end: new Date(event.end_time)
      }));
      setFormattedEvents(formatted);
    }
  }, [eventsData]);

  // Navigation functions
  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const handleToday = () => setCurrentMonth(new Date());

  // Get days for current month view
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startDate = new Date(monthStart);
  startDate.setDate(startDate.getDate() - startDate.getDay()); // Start from Sunday
  const endDate = new Date(monthEnd);
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay())); // End on Saturday

  const days = eachDayOfInterval({ start: startDate, end: endDate });
  
  // Get events for a specific day
  const getEventsForDay = (day: Date) => {
    return formattedEvents.filter(event => 
      event.start.getDate() === day.getDate() &&
      event.start.getMonth() === day.getMonth() &&
      event.start.getFullYear() === day.getFullYear()
    );
  };

  // Handle day click
  const handleDayClick = (day: Date) => {
    // Create end time 1 hour after start
    const end = new Date(day);
    end.setHours(end.getHours() + 1);
    onSelectSlot({ start: day, end });
  };

  // Get class for day cell
  const getDayClass = (day: Date) => {
    let className = "h-24 border p-1 relative";
    
    if (!isSameMonth(day, currentMonth)) {
      className += " bg-gray-100 text-gray-400";
    }
    
    if (isToday(day)) {
      className += " bg-yellow-50";
    }
    
    return className;
  };
  
  // Get class for event based on type
  const getEventClass = (eventType: string) => {
    switch (eventType.toLowerCase()) {
      case 'raid':
        return "bg-red-600 text-white";
      case 'dungeon':
        return "bg-green-600 text-white";
      case 'special':
        return "bg-purple-600 text-white";
      case 'test':
        return "bg-orange-500 text-white";
      default:
        return "bg-blue-500 text-white";
    }
  };

  // Create a test event for today to ensure calendar is working
  const today = new Date();
  const testEvent: CalendarEvent = {
    id: 9999,
    title: 'Test Event',
    description: 'Test event to verify calendar functionality',
    event_type: 'Test',
    start_time: today.toISOString(),
    end_time: new Date(today.getTime() + 60 * 60 * 1000).toISOString(),
    created_by: 1,
    guild_id: guildId,
    max_participants: 10,
    start: today,
    end: new Date(today.getTime() + 60 * 60 * 1000)
  };
  
  // Add test event to formattedEvents if there are no events
  const displayEvents = formattedEvents.length === 0 ? [testEvent] : formattedEvents;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 text-red-700 p-4 rounded mb-4">
        Error loading events: {error.message}
      </div>
    );
  }

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 flex items-center justify-between border-b">
        <div className="space-x-2">
          <button 
            onClick={handlePrevMonth}
            className="px-3 py-1 border rounded hover:bg-gray-50"
          >
            &larr;
          </button>
          <button 
            onClick={handleToday}
            className="px-3 py-1 border rounded hover:bg-gray-50"
          >
            Today
          </button>
          <button 
            onClick={handleNextMonth}
            className="px-3 py-1 border rounded hover:bg-gray-50"
          >
            &rarr;
          </button>
        </div>
        <h2 className="text-xl font-bold">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
      </div>
      
      <div className="p-2">
        <div className="grid grid-cols-7">
          {weekdays.map(day => (
            <div key={day} className="text-center font-medium p-2 border-b">
              {day}
            </div>
          ))}
          
          {days.map((day, i) => (
            <div
              key={i}
              className={getDayClass(day)}
              onClick={() => handleDayClick(day)}
            >
              <div className="absolute top-1 right-1 text-sm">
                {day.getDate()}
              </div>
              
              <div className="mt-5 space-y-1">
                {getEventsForDay(day).map((event) => (
                  <div
                    key={event.id}
                    className={`text-xs p-1 rounded truncate cursor-pointer ${getEventClass(event.event_type)}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectEvent(event);
                    }}
                    title={event.title}
                  >
                    {format(event.start, 'h:mm a')} - {event.title}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="p-3 border-t text-sm text-gray-500">
        {displayEvents === formattedEvents ? (
          `Displaying ${formattedEvents.length} event${formattedEvents.length === 1 ? '' : 's'}`
        ) : (
          'No events found. A test event has been added to demonstrate functionality.'
        )}
      </div>
    </div>
  );
};

export default EventCalendar;