import React from 'react';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { Character, CharacterRole } from '../../../../shared/types';
import { FormField } from './FormField';
import  FormStatus  from '../FormStatus';

interface CharacterFormProps {
  character?: Character;
  onSubmit: (values: Partial<Character>) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
  error?: string | null;
}

// Class options for World of Warcraft
const CLASS_OPTIONS = [
  'Warrior', 'Paladin', 'Hunter', 'Rogue', 'Priest',
  'Shaman', 'Mage', 'Warlock', 'Monk', 'Druid',
  'Demon Hunter', 'Death Knight'
];

// Role options
const ROLE_OPTIONS: CharacterRole[] = ['Tank', 'Healer', 'DPS'];

const CharacterSchema = Yup.object().shape({
  name: Yup.string().required('Character name is required'),
  realm: Yup.string().required('Realm is required'),
  class: Yup.string().required('Class is required').oneOf(CLASS_OPTIONS, 'Invalid class'),
  level: Yup.number()
    .required('Level is required')
    .min(1, 'Level must be at least 1')
    .max(70, 'Level cannot exceed 70')
    .integer('Level must be a whole number'),
  role: Yup.string().required('Role is required').oneOf(ROLE_OPTIONS, 'Invalid role'),
  is_main: Yup.boolean()
});

export const CharacterForm: React.FC<CharacterFormProps> = ({
  character,
  onSubmit,
  onCancel,
  loading = false,
  error = null
}) => {
  const initialValues: Partial<Character> = {
    name: character?.name || '',
    realm: character?.realm || '',
    class: character?.class || '',
    level: character?.level || 60,
    role: character?.role || 'DPS',
    is_main: character?.is_main || false
  };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={CharacterSchema}
      onSubmit={async (values) => {
        await onSubmit(values);
      }}
    >
      {({ isSubmitting, isValid }) => (
        <Form className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              name="name"
              label="Character Name"
              placeholder="Enter character name"
              required
            />
            
            <FormField
              name="realm"
              label="Realm"
              placeholder="Enter realm name"
              required
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              name="class"
              label="Class"
              as="select"
              required
            >
              <option value="">Select Class</option>
              {CLASS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </FormField>
            
            <FormField
              name="level"
              label="Level"
              type="number"
              placeholder="60"
              required
            />
            
            <FormField
              name="role"
              label="Role"
              as="select"
              required
            >
              <option value="">Select Role</option>
              {ROLE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </FormField>
          </div>
          
          <div className="flex items-center">
            <FormField
              name="is_main"
              label="Set as Main Character"
              type="checkbox"
              className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>
          
          <FormStatus 
            loading={loading || isSubmitting} 
            error={error} 
            success={null} 
          />
          
          <div className="flex justify-end gap-2 pt-4">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
            )}
            
            <button
              type="submit"
              disabled={loading || isSubmitting || !isValid}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300"
            >
              {character ? 'Update Character' : 'Create Character'}
            </button>
          </div>
        </Form>
      )}
    </Formik>
  );
};