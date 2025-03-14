import React from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';

interface EventFormProps {
  initialValues: {
    title: string;
    description: string;
    event_type: string;
    start_time: string;
    end_time: string;
    max_participants: number;
    guild_id: number;
  };
  onSubmit: (values: any) => Promise<void>;
  buttonText: string;
}

const EventSchema = Yup.object().shape({
  title: Yup.string().required('Required'),
  description: Yup.string(),
  event_type: Yup.string().required('Required'),
  start_time: Yup.string().required('Required'),
  end_time: Yup.string().required('Required'),
  max_participants: Yup.number().min(1, 'Must be at least 1')
});

const EventForm: React.FC<EventFormProps> = ({ initialValues, onSubmit, buttonText }) => {
  return (
    <Formik
      initialValues={initialValues}
      validationSchema={EventSchema}
      onSubmit={async (values, { setSubmitting }) => {
        try {
          await onSubmit(values);
        } catch (error) {
          console.error('Event submission error:', error);
        } finally {
          setSubmitting(false);
        }
      }}
    >
      {({ isSubmitting }) => (
        <Form className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Event Title
            </label>
            <Field
              type="text"
              name="title"
              className="w-full p-2 border rounded"
              placeholder="Event title"
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
              className="w-full p-2 border rounded"
              placeholder="Event description"
              rows={3}
            />
            <ErrorMessage name="description" component="div" className="text-red-500 text-sm mt-1" />
          </div>
          
          <div>
            <label htmlFor="event_type" className="block text-sm font-medium text-gray-700 mb-1">
              Event Type
            </label>
            <Field
              as="select"
              name="event_type"
              className="w-full p-2 border rounded"
            >
              <option value="">Select Type</option>
              <option value="Raid">Raid</option>
              <option value="Dungeon">Dungeon</option>
              <option value="Special">Special Event</option>
            </Field>
            <ErrorMessage name="event_type" component="div" className="text-red-500 text-sm mt-1" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="start_time" className="block text-sm font-medium text-gray-700 mb-1">
                Start Time
              </label>
              <Field
                type="datetime-local"
                name="start_time"
                className="w-full p-2 border rounded"
              />
              <ErrorMessage name="start_time" component="div" className="text-red-500 text-sm mt-1" />
            </div>
            
            <div>
              <label htmlFor="end_time" className="block text-sm font-medium text-gray-700 mb-1">
                End Time
              </label>
              <Field
                type="datetime-local"
                name="end_time"
                className="w-full p-2 border rounded"
              />
              <ErrorMessage name="end_time" component="div" className="text-red-500 text-sm mt-1" />
            </div>
          </div>
          
          <div>
            <label htmlFor="max_participants" className="block text-sm font-medium text-gray-700 mb-1">
              Max Participants
            </label>
            <Field
              type="number"
              name="max_participants"
              className="w-full p-2 border rounded"
              min="1"
            />
            <ErrorMessage name="max_participants" component="div" className="text-red-500 text-sm mt-1" />
          </div>
          
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Processing...' : buttonText}
          </button>
        </Form>
      )}
    </Formik>
  );
};

export default EventForm;