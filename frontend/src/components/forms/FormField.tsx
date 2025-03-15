import React from 'react';
import { Field, ErrorMessage } from 'formik';

interface FormFieldProps {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  as?: string;
  className?: string;
  children?: React.ReactNode;
  required?: boolean;
}

export const FormField: React.FC<FormFieldProps> = ({
  name,
  label,
  type = 'text',
  placeholder = '',
  as,
  className = 'w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500',
  children,
  required = false
}) => {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && '*'}
      </label>
      
      {children ? (
        <Field
          name={name}
          id={name}
          as={as}
          type={type}
          placeholder={placeholder}
          className={className}
        >
          {children}
        </Field>
      ) : (
        <Field
          name={name}
          id={name}
          as={as}
          type={type}
          placeholder={placeholder}
          className={className}
        />
      )}
      
      <ErrorMessage name={name} component="div" className="text-red-500 text-sm mt-1" />
    </div>
  );
};