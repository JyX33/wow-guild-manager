/**
 * Validates that an object has required properties
 * @param obj Object to validate
 * @param requiredProps List of required property names
 * @returns True if valid, false if missing properties
 */
export function validateRequired(obj: any, requiredProps: string[]): boolean {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  
  return requiredProps.every(prop => prop in obj);
}

/**
 * Check if an API response is valid for a specific model
 * @param data Data to validate
 * @param validator Validation function
 * @returns True if valid, false otherwise
 */
export function validateApiResponse<T>(data: any, validator: (data: any) => boolean): data is T {
  return validator(data);
}

/**
 * Basic validators for common types
 */
export const validators = {
  user: (data: any) => validateRequired(data, ['id', 'battle_net_id', 'battletag']),
  guild: (data: any) => validateRequired(data, ['id', 'name', 'realm', 'region']),
  event: (data: any) => validateRequired(data, ['id', 'title', 'event_type', 'start_time', 'end_time']),
  subscription: (data: any) => validateRequired(data, ['id', 'event_id', 'user_id', 'status']),
};