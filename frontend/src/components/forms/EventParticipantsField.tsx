import React from 'react';
import { FormField } from './FormField';

export const EventParticipantsField: React.FC = () => {
  return (
    <FormField
      name="max_participants"
      label="Maximum Participants"
      type="number"
      placeholder="Enter maximum number of participants"
      required
      className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
    />
  );
};