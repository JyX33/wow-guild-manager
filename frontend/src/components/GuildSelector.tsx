import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { Guild } from '../types';
import { useApi } from '../hooks/useApi';
import { guildApi } from '../services/api.service';
import FormStatus from './FormStatus';
import LoadingSpinner from './LoadingSpinner';

interface GuildSelectorFormValues {
  region: string;
  realm: string;
  guildName: string;
}

// Form validation schema
const GuildSelectorSchema = Yup.object().shape({
  region: Yup.string()
    .required('Region is required')
    .oneOf(['eu', 'us', 'kr', 'tw'], 'Invalid region'),
  realm: Yup.string()
    .required('Realm is required')
    .min(2, 'Realm must be at least 2 characters')
    .max(50, 'Realm must be at most 50 characters')
    .matches(/^[a-zA-Z\-\s']*$/, 'Realm can only contain letters, spaces, hyphens, and apostrophes'),
  guildName: Yup.string()
    .required('Guild name is required')
    .min(2, 'Guild name must be at least 2 characters')
    .max(50, 'Guild name must be at most 50 characters')
    .matches(/^[a-zA-Z0-9\-\s']*$/, 'Guild name can only contain letters, numbers, spaces, hyphens, and apostrophes')
});

/**
 * Improved Guild Selector component with form validation
 */
const GuildSelector: React.FC = () => {
  const navigate = useNavigate();
  const [selectedGuild, setSelectedGuild] = useState<Guild | null>(null);
  
  // Use the useApi hook for searching guilds, with immediate set to false
  const { loading, error, execute } = useApi<Guild, [string, string, string]>({
    apiFn: guildApi.getGuildByName,
    immediate: false
  });

  const initialValues: GuildSelectorFormValues = {
    region: 'eu',
    realm: '',
    guildName: ''
  };

  const handleSubmit = async (values: GuildSelectorFormValues) => {
    const { region, realm, guildName } = values;
    
    // Log the request
    console.log(`Searching for guild: ${guildName} on ${realm}-${region}`);
    
    // Execute API call using the hook
    const response = await execute(region, realm, guildName);
    
    console.log('API Response:', response);
    
    if (response.success && response.data) {
      // Validate that we have a valid guild ID before navigating
      if (response.data.id && !isNaN(response.data.id)) {
        setSelectedGuild(response.data);
        navigate(`/guild/${response.data.id}`);
      } else {
        // If we don't have a valid guild ID, show an error
        console.error('Invalid guild ID received:', response.data);
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold mb-4">Find Your Guild</h2>
      
      <FormStatus loading={loading} error={error} />
      
      <Formik
        initialValues={initialValues}
        validationSchema={GuildSelectorSchema}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting, isValid, dirty }) => (
          <Form className="space-y-4">
            <div>
              <label htmlFor="region" className="block text-sm font-medium text-gray-700 mb-1">
                Region*
              </label>
              <Field
                as="select"
                name="region"
                id="region"
                className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="eu">Europe</option>
                <option value="us">Americas</option>
                <option value="kr">Korea</option>
                <option value="tw">Taiwan</option>
              </Field>
              <ErrorMessage name="region" component="div" className="text-red-500 text-sm mt-1" />
            </div>
            
            <div>
              <label htmlFor="realm" className="block text-sm font-medium text-gray-700 mb-1">
                Realm*
              </label>
              <Field
                type="text"
                name="realm"
                id="realm"
                className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter realm name"
              />
              <ErrorMessage name="realm" component="div" className="text-red-500 text-sm mt-1" />
              <div className="text-xs text-gray-500 mt-1">
                Example: Silvermoon, Kazzak, Stormrage
              </div>
            </div>
            
            <div>
              <label htmlFor="guildName" className="block text-sm font-medium text-gray-700 mb-1">
                Guild Name*
              </label>
              <Field
                type="text"
                name="guildName"
                id="guildName"
                className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter guild name"
              />
              <ErrorMessage name="guildName" component="div" className="text-red-500 text-sm mt-1" />
            </div>
            
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || !isValid || !dirty || loading}
                className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 
                  ${(isSubmitting || !isValid || !dirty || loading) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {loading ? <LoadingSpinner size="sm" message="Searching..." /> : 'Find Guild'}
              </button>
            </div>
            
            <div className="text-xs text-gray-500">
              * Required fields
            </div>
          </Form>
        )}
      </Formik>
      
      <div className="mt-4 text-sm text-gray-600">
        <p>
          This will search the Battle.net API for your guild. 
          If the guild is found, you'll be redirected to the guild page.
        </p>
      </div>
    </div>
  );
};

export default GuildSelector;