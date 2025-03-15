import React from 'react';
import { FormField } from './FormField';

export const EventTimeFields: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField
        name="start_time"
        label="Start Time"
        type="datetime-local"
        required
      />
      
      <FormField
        name="end_time"
        label="End Time"
        type="datetime-local"
        required
      />
    </div>
  );
};