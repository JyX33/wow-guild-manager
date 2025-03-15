import React from 'react';
import { ApiError } from '../types';

interface FormStatusProps {
  loading: boolean;
  error: ApiError | null | string;
  success?: boolean;
  successMessage?: string;
}

/**
 * Reusable component for displaying form loading, error, and success states
 */
const FormStatus: React.FC<FormStatusProps> = ({ 
  loading, 
  error, 
  success = false,
  successMessage = 'Operation completed successfully'
}) => {
  if (!loading && !error && !success) {
    return null;
  }

  return (
    <div className="mb-4">
      {loading && (
        <div className="bg-blue-50 text-blue-700 p-3 rounded flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-700 mr-2"></div>
          <span>Processing...</span>
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded">
          {typeof error === 'string' 
            ? error 
            : error.message || 'An error occurred'}
        </div>
      )}
      
      {success && !loading && !error && (
        <div className="bg-green-100 text-green-700 p-3 rounded">
          {successMessage}
        </div>
      )}
    </div>
  );
};

export default FormStatus;