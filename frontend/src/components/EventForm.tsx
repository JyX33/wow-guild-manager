import React, { useState } from 'react';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { Event } from '../types';
import { EventBasicFields } from './forms/EventBasicFields';
import { EventTimeFields } from './forms/EventTimeFields';
import { EventParticipantsField } from './forms/EventParticipantsField';
import FormStatus from './FormStatus';
import { useApi } from '../hooks/useApi';
import { eventApi } from '../services/api.service';
import LoadingSpinner from './LoadingSpinner';

interface EventFormValues {
  title: string;
  description: string;
  event_type: 'Raid' | 'Dungeon' | 'Special';
  start_time: string;
  end_time: string;
  max_participants: number;
  guild_id: number;
}

interface EventFormProps {
  initialValues: EventFormValues;
  onSubmitSuccess: (event: Event) => void;
  buttonText: string;
  mode: 'create' | 'edit';
  eventId?: number;
}

// Form validation schema
const EventSchema = Yup.object().shape({
  title: Yup.string()
    .required('Title is required')
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title must be at most 100 characters'),
  description: Yup.string()
    .max(1000, 'Description must be at most 1000 characters'),
  event_type: Yup.string()
    .required('Event type is required')
    .oneOf(['Raid', 'Dungeon', 'Special'], 'Invalid event type'),
  start_time: Yup.string()
    .required('Start time is required'),
  end_time: Yup.string()
    .required('End time is required')
    .test('end-after-start', 'End time must be after start time', function(value) {
      const { start_time } = this.parent;
      if (!start_time || !value) return true;
      return new Date(value) > new Date(start_time);
    }),
  max_participants: Yup.number()
    .required('Maximum participants is required')
    .integer('Must be a whole number')
    .min(1, 'Must have at least 1 participant')
    .max(100, 'Maximum 100 participants allowed')
});

/**
 * Improved form component for creating and editing events
 */
const EventForm: React.FC<EventFormProps> = ({ 
  initialValues, 
  onSubmitSuccess, 
  buttonText,
  mode,
  eventId
}) => {
  const [formSubmitted, setFormSubmitted] = useState(false);
  
  // Use our custom useApi hook with the appropriate API function
  const { loading, error, execute } = useApi<Event, [Partial<Event>]>({
    apiFn: mode === 'create' ? eventApi.createEvent : 
          (mode === 'edit' && eventId) ? 
            (data: Partial<Event>) => eventApi.updateEvent(eventId, data) :
            eventApi.createEvent,
    immediate: false
  });

  const handleSubmit = async (values: EventFormValues) => {
    try {
      const response = await execute(values);
      
      if (response.success && response.data) {
        setFormSubmitted(true);
        onSubmitSuccess(response.data);
      }
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <FormStatus 
        loading={loading}
        error={error}
        success={formSubmitted}
        successMessage={mode === 'create' ? 'Event created successfully!' : 'Event updated successfully!'}
      />

      <Formik
        initialValues={initialValues}
        validationSchema={EventSchema}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting, isValid, dirty }) => (
          <Form className="space-y-4">
            <EventBasicFields />
            <EventTimeFields />
            <EventParticipantsField />
            
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting || !isValid || !dirty || loading}
                className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 
                  ${(isSubmitting || !isValid || !dirty || loading) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {loading ? <LoadingSpinner size="sm" message="Submitting..." /> : buttonText}
              </button>
            </div>
            
            <div className="text-xs text-gray-500">
              * Required fields
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default EventForm;