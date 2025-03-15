import React, { useState } from 'react';
import { Formik, Form, Field, ErrorMessage, FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { Event } from '../types';
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

  const handleSubmit = async (
    values: EventFormValues, 
    { setSubmitting, resetForm }: FormikHelpers<EventFormValues>
  ) => {
    try {
      const response = await execute(values);
      
      if (response.success && response.data) {
        setFormSubmitted(true);
        resetForm();
        onSubmitSuccess(response.data);
      }
    } finally {
      setSubmitting(false);
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
        {({ isSubmitting, isValid, dirty, values, setFieldValue }) => (
          <Form className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Event Title*
              </label>
              <Field
                type="text"
                name="title"
                id="title"
                className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                placeholder="Give your event a descriptive title"
              />
              <ErrorMessage name="title" component="div" className="text-red-500 text-sm mt-1" />
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <Field
                as="textarea"
                name="description"
                id="description"
                rows={3}
                className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                placeholder="Add details about your event"
              />
              <ErrorMessage name="description" component="div" className="text-red-500 text-sm mt-1" />
            </div>
            
            <div>
              <label htmlFor="event_type" className="block text-sm font-medium text-gray-700 mb-1">
                Event Type*
              </label>
              <Field
                as="select"
                name="event_type"
                id="event_type"
                className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Event Type</option>
                <option value="Raid">Raid</option>
                <option value="Dungeon">Dungeon</option>
                <option value="Special">Special Event</option>
              </Field>
              <ErrorMessage name="event_type" component="div" className="text-red-500 text-sm mt-1" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="start_time" className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time*
                </label>
                <Field
                  type="datetime-local"
                  name="start_time"
                  id="start_time"
                  className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                />
                <ErrorMessage name="start_time" component="div" className="text-red-500 text-sm mt-1" />
              </div>
              
              <div>
                <label htmlFor="end_time" className="block text-sm font-medium text-gray-700 mb-1">
                  End Time*
                </label>
                <Field
                  type="datetime-local"
                  name="end_time"
                  id="end_time"
                  className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                />
                <ErrorMessage name="end_time" component="div" className="text-red-500 text-sm mt-1" />
              </div>
            </div>
            
            <div>
              <label htmlFor="max_participants" className="block text-sm font-medium text-gray-700 mb-1">
                Maximum Participants*
              </label>
              <Field
                type="number"
                name="max_participants"
                id="max_participants"
                min="1"
                max="100"
                className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
              />
              <ErrorMessage name="max_participants" component="div" className="text-red-500 text-sm mt-1" />
            </div>
            
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