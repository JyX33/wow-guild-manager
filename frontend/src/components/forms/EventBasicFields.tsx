import React from 'react';
import { FormField } from './FormField';
import { EventType } from '../../../../shared/types/event';

export const EventBasicFields: React.FC = () => {
  return (
    <>
      <FormField
        name="title"
        label="Event Title"
        placeholder="Give your event a descriptive title"
        required
      />
      
      <FormField
        name="description"
        label="Description"
        as="textarea"
        placeholder="Add details about your event"
        className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 h-32"
      />
      
      <FormField
        name="event_type"
        label="Event Type"
        as="select"
        required
      >
        <option value="">Select Event Type</option>
        <option value={EventType.RAID}>{EventType.RAID}</option>
        <option value={EventType.DUNGEON}>{EventType.DUNGEON}</option>
        <option value={EventType.SPECIAL}>{EventType.SPECIAL}</option>
      </FormField>
    </>
  );
};