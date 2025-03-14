import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { eventApi } from '../services/api.service';

// Import a simpler calendar alternative just in case
import './SimpleCalendar.css';

// Add extra CSS directly to handle any styling issues
const calendarStyles = `
.rbc-calendar {
  width: 100%;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.rbc-toolbar {
  margin-bottom: 10px;
  padding: 10px;
  border-bottom: 1px solid #eee;
}

.rbc-toolbar button {
  background-color: #f8f9fa;
  border: 1px solid #ddd;
  color: #333;
  border-radius: 4px;
  padding: 5px 10px;
  margin-right: 5px;
}

.rbc-toolbar button:hover {
  background-color: #e9ecef;
}

.rbc-toolbar button.rbc-active {
  background-color: #007bff;
  color: white;
}

.rbc-event {
  background-color: #3174ad;
  border-radius: 3px;
  color: #fff;
  padding: 2px 5px;
  margin: 1px 0;
}

.rbc-event.rbc-selected {
  background-color: #265985;
}

.rbc-day-bg.rbc-today {
  background-color: rgba(255, 220, 40, 0.2);
}

.rbc-date-cell {
  text-align: center;
  padding: 5px;
}

.rbc-off-range-bg {
  background-color: #f8f9fa;
}

.rbc-month-view, .rbc-week-view, .rbc-day-view {
  border: 1px solid #ddd;
  border-radius: 4px;
}

.rbc-header {
  padding: 10px 3px;
  font-weight: bold;
  border-bottom: 1px solid #ddd;
}
`;

const localizer = momentLocalizer(moment);

interface Event {
  id: number;
  title: string;
  start: Date;
  end: Date;
  event_type: string;
}

interface EventCalendarProps {
  guildId: number;
  onSelectEvent: (event: Event) => void;
  onSelectSlot: (slotInfo: { start: Date; end: Date }) => void;
}

const EventCalendar: React.FC<EventCalendarProps> = ({ 
  guildId, 
  onSelectEvent, 
  onSelectSlot 
}) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        console.log('Fetching events for guild ID:', guildId);
        const response = await eventApi.getGuildEvents(guildId);
        console.log('Events fetched:', response.data);
        
        if (!response.data || !Array.isArray(response.data)) {
          console.error('Invalid events data:', response.data);
          setEvents([]);
          return;
        }
        
        // Format events for calendar - use simpler format and update dates to current year
        const formattedEvents = response.data.map((event: any) => {
          try {
            // Get current date and year
            const currentYear = new Date().getFullYear();
            
            // Convert dates and ensure they're in the current year
            let startDate = new Date(event.start_time);
            let endDate = new Date(event.end_time);
            
            // For debugging - check if dates are valid
            console.log(`Event ${event.id} original dates: Start=${startDate}, End=${endDate}`);
            
            // If the year is too far in the future, update to current year
            // This helps with events that might be set for 2025 or other future years
            if (Math.abs(startDate.getFullYear() - currentYear) > 1) {
              startDate = new Date(startDate);
              startDate.setFullYear(currentYear);
              
              endDate = new Date(endDate);
              endDate.setFullYear(currentYear);
              
              console.log(`Adjusted dates to current year: Start=${startDate}, End=${endDate}`);
            }
            
            return {
              id: event.id,
              title: event.title,
              start: startDate,
              end: endDate,
              event_type: event.event_type
            };
          } catch (err) {
            console.error('Error formatting event:', event, err);
            return null;
          }
        }).filter(Boolean);
        
        console.log('Formatted events for calendar:', formattedEvents);
        setEvents(formattedEvents);
      } catch (error) {
        console.error('Failed to fetch events:', error);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [guildId]);

  const eventStyleGetter = (event: Event) => {
    let className = '';
    
    // Apply class based on event type
    switch (event.event_type) {
      case 'Raid':
        className = 'event-raid';
        break;
      case 'Dungeon':
        className = 'event-dungeon';
        break;
      case 'Special':
        className = 'event-special';
        break;
      case 'Test':
        className = 'event-test';
        break;
    }
    
    return {
      className: className,
      style: {
        borderRadius: '5px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block'
      }
    };
  };

  if (loading) {
    return <div>Loading events...</div>;
  }

  // Add some debug info
  console.log('Rendering calendar with events:', events);
  
  // Add a simple test event to ensure calendar is working properly
  const today = new Date();
  const testEvent = {
    id: 9999,
    title: 'Test Event Today',
    start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0),
    end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 0),
    event_type: 'Test'
  };
  
  console.log('Test event:', testEvent);
  
  const testEvents = [...events, testEvent];
  
  // Build a simple custom calendar since react-big-calendar is causing issues
  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const startDate = new Date(monthStart);
  startDate.setDate(startDate.getDate() - startDate.getDay()); // Start from Sunday
  
  const endDate = new Date(monthEnd);
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay())); // End on Saturday
  
  const days = [];
  let day = new Date(startDate);
  
  while (day <= endDate) {
    days.push(new Date(day));
    day.setDate(day.getDate() + 1);
  }
  
  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };
  
  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };
  
  const handleToday = () => {
    setCurrentMonth(new Date());
  };
  
  const formatMonthTitle = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };
  
  const getDayClass = (day: Date) => {
    const isToday = day.toDateString() === new Date().toDateString();
    const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
    return `simple-calendar-day ${isToday ? 'today' : ''} ${isCurrentMonth ? '' : 'text-gray-400'}`;
  };
  
  const getEventsForDay = (day: Date) => {
    return testEvents.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate.getDate() === day.getDate() && 
             eventDate.getMonth() === day.getMonth() && 
             eventDate.getFullYear() === day.getFullYear();
    });
  };
  
  const handleDayClick = (day: Date) => {
    onSelectSlot({ start: day, end: new Date(day.getTime() + 60 * 60 * 1000) });
  };
  
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="h-[600px] overflow-auto">
      <div className="mb-4">
        <p className="text-sm text-gray-500">
          {events.length === 0 ? 'No events found. Create an event to see it on the calendar.' : `Displaying ${events.length} events (+1 test event)`}
        </p>
        <p className="text-sm font-bold">Today is: {today.toLocaleDateString()}</p>
      </div>
      
      <div className="simple-calendar-container">
        <div className="simple-calendar-header">
          <div className="simple-calendar-nav">
            <button onClick={handlePrevMonth}>Previous</button>
            <button onClick={handleToday}>Today</button>
            <button onClick={handleNextMonth}>Next</button>
          </div>
          <div className="simple-calendar-title">
            {formatMonthTitle(currentMonth)}
          </div>
        </div>
        
        <div className="simple-calendar-days">
          {weekdays.map(day => (
            <div key={day} className="simple-calendar-day-header">{day}</div>
          ))}
          
          {days.map((day, i) => (
            <div 
              key={i} 
              className={getDayClass(day)}
              onClick={() => handleDayClick(day)}
            >
              <div className="simple-calendar-day-number">{day.getDate()}</div>
              
              {getEventsForDay(day).map((event, index) => (
                <div 
                  key={event.id} 
                  className={`simple-calendar-event ${event.event_type.toLowerCase()}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectEvent(event);
                  }}
                >
                  {event.title}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EventCalendar;